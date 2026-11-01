"""Integration attacks against an explicitly local, disposable StackNova instance."""
from contextlib import closing
import hashlib
import http.cookiejar
import json
import os
from pathlib import Path
import sqlite3
import unittest
import urllib.error
import urllib.parse
import urllib.request
import uuid

BASE = os.environ.get('BASE_URL', 'http://127.0.0.1:8097').rstrip('/')
parts = urllib.parse.urlsplit(BASE)
if parts.hostname not in ('127.0.0.1', 'localhost'):
    raise RuntimeError('Tests may only target a local disposable instance.')
ORIGIN = f'{parts.scheme}://{parts.netloc}'
ROOT = Path(__file__).resolve().parent.parent
DATABASE = Path(os.environ.get('TEST_DATABASE', ROOT / 'storage/security-test.sqlite'))
PASSWORD = 'Test-only-long-password!47'


class Client:
    def __init__(self):
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        self.csrf = ''
        status, data, _ = self.request('/api/session')
        if status != 200:
            raise AssertionError((status, data))
        self.csrf = data['csrf']

    def request(self, path, data=None, *, raw=None, headers=None, method=None):
        request_headers = {'Accept': 'application/json'}
        if data is not None or raw is not None:
            method = method or 'POST'
            request_headers.update({'Content-Type': 'application/json', 'Origin': ORIGIN, 'X-CSRF-Token': self.csrf})
        request_headers.update(headers or {})
        body = json.dumps(data).encode() if data is not None else raw
        req = urllib.request.Request(BASE + path, data=body, headers=request_headers, method=method)
        try:
            response = self.opener.open(req, timeout=15)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            content = response.read().decode('utf-8', errors='replace')
            try:
                result = json.loads(content)
            except json.JSONDecodeError:
                result = content
            if isinstance(result, dict) and response.status < 300 and 'csrf' in result:
                self.csrf = result['csrf']
            return response.status, result, response.headers

    def register(self, name='Security test'):
        email = uuid.uuid4().hex + '@example.test'
        status, data, _ = self.request('/api/register', {'name': name, 'email': email, 'password': PASSWORD})
        if status != 201:
            raise AssertionError((status, data))
        return email, data

    def cookie(self):
        return next(cookie.value for cookie in self.jar if cookie.name == 'stacknova_session')


class SecurityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Reset only rate counters on the designated disposable fixture, never the application DB.
        if DATABASE.name != 'security-test.sqlite' or parts.port != 8097:
            raise RuntimeError('Use the designated security-test database and port 8097.')
        with closing(sqlite3.connect(DATABASE)) as db:
            versions = db.execute('SELECT version FROM schema_migrations ORDER BY version').fetchall()
            if versions != [(1,), (2,)]:
                raise RuntimeError('Migrate the disposable fixture before running tests.')
            db.execute('DELETE FROM rate_limits')
            db.commit()

    def setUp(self):
        self.client = Client()

    def test_01_security_headers_and_assets(self):
        status, page, headers = self.client.request('/')
        self.assertEqual(status, 200)
        self.assertEqual(headers['X-Content-Type-Options'], 'nosniff')
        self.assertEqual(headers['X-Frame-Options'], 'DENY')
        self.assertIn("script-src 'self'", headers['Content-Security-Policy'])
        self.assertNotIn("script-src 'self' 'unsafe-inline'", headers['Content-Security-Policy'])
        self.assertEqual(headers['Cache-Control'], 'no-store')
        self.assertNotIn('cdn.tailwindcss.com', page)
        for path in ['/assets/app.js', '/assets/utilities.css', '/assets/theme.css', '/assets/icons.css', '/assets/bootstrap-icons.woff2']:
            self.assertEqual(self.client.request(path)[0], 200, path)
        _, _, cookie_headers = Client().request('/api/session', headers={'Cookie': ''})
        cookie = cookie_headers.get('Set-Cookie', '')
        self.assertIn('HttpOnly', cookie)
        self.assertIn('SameSite=Strict', cookie)

    def test_02_csrf_and_origin(self):
        body = {'service': 'website', 'scope': '1', 'cms': False}
        for override in [{'X-CSRF-Token': ''}, {'X-CSRF-Token': 'invalid'}, {'Origin': 'https://evil.example'}, {'Origin': ''}, {'Origin': ORIGIN + '.evil.test'}]:
            self.assertEqual(self.client.request('/api/estimates', body, headers=override)[0], 403)
        self.assertEqual(self.client.request('/api/estimates', body)[0], 201)

    def test_03_validation_and_error_privacy(self):
        cases = [
            ({'raw': b'{broken'}, 400),
            ({'raw': b'[]'}, 422),
            ({'raw': b'{}', 'headers': {'Content-Type': 'text/plain'}}, 415),
            ({'raw': b'x' * 17000}, 413),
            ({'data': {'message': {'$ne': None}}}, 422),
            ({'data': {'message': 'x' * 1001}}, 422),
        ]
        for options, expected in cases:
            status, data, _ = self.client.request('/api/chat', **options)
            self.assertEqual(status, expected, data)
            serialized = json.dumps(data)
            for secret in ['PDO', 'Stack trace', 'C:\\', 'SELECT ', 'password_hash']:
                self.assertNotIn(secret, serialized)
        self.assertEqual(self.client.request('/api/chat', method='PUT')[0], 405)
        self.assertEqual(self.client.request('/api/unknown')[0], 404)
        self.assertEqual(self.client.request('/api/session', headers={'Host': 'evil.example'})[0], 400)

    def test_04_prices_computed_on_server(self):
        status, data, _ = self.client.request('/api/estimates', {'service': 'website', 'scope': '1', 'cms': False, 'low_satang': 1, 'high_satang': 1, 'user_id': 999})
        self.assertEqual(status, 201)
        item = data['estimate']
        self.assertEqual(item['low_satang'], 3500000)
        self.assertEqual(item['high_satang'], 4600000)
        self.assertNotIn('user_id', item)
        self.assertEqual(self.client.request('/api/estimates/' + item['id'])[0], 200)
        for service, scope, cms in [('bad', '1', False), ('website', '-1', False), ('website', '1', 'false'), ('brand', '1', True)]:
            self.assertEqual(self.client.request('/api/estimates', {'service': service, 'scope': scope, 'cms': cms})[0], 422)

    def test_05_guest_and_account_ownership(self):
        _, data, _ = self.client.request('/api/estimates', {'service': 'store', 'scope': '1.5', 'cms': True})
        estimate_id = data['estimate']['id']
        self.client.request('/api/chat', {'message': 'Private guest project'})
        outsider = Client()
        self.assertEqual(outsider.request('/api/estimates/' + estimate_id)[0], 404)
        self.assertEqual(outsider.request('/api/chat')[1]['messages'], [])
        email, result = self.client.register()
        self.assertNotIn('email', result['user'])
        self.assertNotIn('password_hash', json.dumps(result))
        self.assertEqual(self.client.request('/api/estimates/' + estimate_id)[0], 200)
        outsider.register()
        self.assertEqual(outsider.request('/api/estimates/' + estimate_id)[0], 404)
        self.assertEqual(outsider.request('/api/estimates')[1]['estimates'], [])
        self.assertEqual(outsider.request('/api/chat')[1]['messages'], [])
        self.client.request('/api/logout', {})
        self.assertEqual(self.client.request('/api/estimates/' + estimate_id)[0], 404)
        status, _, _ = self.client.request('/api/login', {'email': email, 'password': PASSWORD})
        self.assertEqual(status, 200)
        self.assertEqual(self.client.request('/api/estimates/' + estimate_id)[0], 200)
        self.assertIn('Private guest project', json.dumps(self.client.request('/api/chat')[1]))

    def test_06_session_rotation_and_revocation(self):
        old_cookie = self.client.cookie()
        old_csrf = self.client.csrf
        email, _ = self.client.register()
        self.assertNotEqual(old_cookie, self.client.cookie())
        self.assertNotEqual(old_csrf, self.client.csrf)
        status, session, _ = self.client.request('/api/session', headers={'Cookie': 'stacknova_session=' + old_cookie})
        self.assertEqual(status, 200)
        self.assertIsNone(session['user'])
        # The explicit old cookie response replaced this client's cookie; log in again.
        self.assertEqual(self.client.request('/api/login', {'email': email, 'password': PASSWORD})[0], 200)
        authenticated_cookie = self.client.cookie()
        self.assertEqual(self.client.request('/api/logout', {})[0], 200)
        _, session, _ = self.client.request('/api/session', headers={'Cookie': 'stacknova_session=' + authenticated_cookie})
        self.assertIsNone(session['user'])

    def test_07_injection_payloads_are_data(self):
        payloads = ["' OR '1'='1", '1; DROP TABLE users--', '<script>alert(1)</script>', '\" onmouseover=\"alert(1)', '{{7*7}}', '(a+)+$']
        for payload in payloads:
            self.assertEqual(self.client.request('/api/chat', {'message': payload})[0], 200)
        history = [row['body'] for row in self.client.request('/api/chat')[1]['messages'] if row['role'] == 'user']
        self.assertEqual(history, payloads)
        for payload in payloads[:2]:
            status, _, _ = self.client.request('/api/login', {'email': payload, 'password': PASSWORD})
            self.assertIn(status, (401, 422))
        with closing(sqlite3.connect(DATABASE)) as db:
            self.assertEqual(db.execute('PRAGMA integrity_check').fetchone()[0], 'ok')
            self.assertEqual(db.execute('PRAGMA foreign_key_check').fetchall(), [])
            self.assertTrue(db.execute("SELECT name FROM sqlite_master WHERE name='users'").fetchone())
        source = (ROOT / 'assets/app.js').read_text(encoding='utf-8')
        self.assertIn('item.textContent = text', source)
        self.assertNotIn('.innerHTML', source)

    def test_08_password_hashes_and_account_delete(self):
        email, response = self.client.register()
        user_id = response['user']['id']
        other = Client()
        other_email, other_response = other.register()
        with closing(sqlite3.connect(DATABASE)) as db:
            hashes = [db.execute('SELECT password_hash FROM users WHERE email=?', (value,)).fetchone()[0] for value in [email, other_email]]
        self.assertNotEqual(hashes[0], hashes[1])
        self.assertTrue(all(value.startswith('$2y$12$') and PASSWORD not in value for value in hashes))
        self.client.request('/api/chat', {'message': 'Delete this private message'})
        self.client.request('/api/estimates', {'service': 'brand', 'scope': '1', 'cms': False})
        self.assertEqual(self.client.request('/api/account/delete', {'password': 'incorrect-password'})[0], 401)
        self.assertEqual(self.client.request('/api/account/delete', {'password': PASSWORD})[0], 200)
        with closing(sqlite3.connect(DATABASE)) as db:
            for table in ['users', 'sessions', 'estimates', 'chat_messages']:
                key = 'id' if table == 'users' else 'user_id'
                self.assertEqual(db.execute(f'SELECT count(*) FROM {table} WHERE {key}=?', (user_id,)).fetchone()[0], 0)
        self.assertEqual(other.request('/api/session')[1]['user']['id'], other_response['user']['id'])
        self.assertEqual(self.client.request('/api/login', {'email': email, 'password': PASSWORD})[0], 401)

    def test_09_private_files_are_not_served(self):
        paths = ['/src/bootstrap.php', '/storage/stacknova.sqlite', '/storage/security-test.sqlite', '/config.local.php', '/.env', '/migrations/001_initial.sql', '/tests/test_security.py', '/package.json', '/index.html', '/views/home.html', '/.aetox/launch.json', '/assets/../src/Auth.php', '/assets/%2e%2e/src/Auth.php']
        for path in paths:
            status, body, _ = self.client.request(path)
            self.assertIn(status, (400, 403, 404), path)
            self.assertNotIn('<?php', str(body))
            self.assertNotIn('SQLite format', str(body))

    def test_10_duplicate_and_password_policy(self):
        email, _ = self.client.register()
        status, _, _ = self.client.request('/api/register', {'name': 'Duplicate', 'email': email, 'password': PASSWORD})
        self.assertEqual(status, 409)
        for password in ['short', 'a' * 73, 'valid-length-but\x00null']:
            self.assertEqual(self.client.request('/api/register', {'name': 'Invalid', 'email': uuid.uuid4().hex + '@example.test', 'password': password})[0], 422)
        self.assertEqual(self.client.request('/api/login', {'email': email, 'password': 'wrong-password'})[0], 401)

    def test_11_session_expiration_and_token_storage(self):
        self.client.register()
        token = self.client.cookie()
        digest = hashlib.sha256(token.encode()).hexdigest()
        self.assertEqual(len(token), 64)
        with closing(sqlite3.connect(DATABASE)) as db:
            row = db.execute('SELECT token_hash FROM sessions WHERE token_hash=?', (digest,)).fetchone()
            self.assertEqual(row[0], digest)
            self.assertNotEqual(row[0], token)
            db.execute('UPDATE sessions SET last_seen=0 WHERE token_hash=?', (digest,))
            db.commit()
        _, response, _ = self.client.request('/api/session')
        self.assertIsNone(response['user'])
        self.assertNotEqual(self.client.cookie(), token)
        with closing(sqlite3.connect(DATABASE)) as db:
            self.assertIsNone(db.execute('SELECT token_hash FROM sessions WHERE token_hash=?', (digest,)).fetchone())
        current = hashlib.sha256(self.client.cookie().encode()).hexdigest()
        with closing(sqlite3.connect(DATABASE)) as db:
            db.execute('UPDATE sessions SET expires_at=0 WHERE token_hash=?', (current,))
            db.commit()
        previous = self.client.cookie()
        self.assertEqual(self.client.request('/api/session')[0], 200)
        self.assertNotEqual(previous, self.client.cookie())

    def test_99_brute_force_rate_limit(self):
        email = uuid.uuid4().hex + '@example.test'
        for _ in range(10):
            self.assertEqual(self.client.request('/api/login', {'email': email, 'password': 'bad-but-long-password'})[0], 401)
        status, _, headers = self.client.request('/api/login', {'email': email, 'password': 'bad-but-long-password'})
        self.assertEqual(status, 429)
        self.assertIn('Retry-After', headers)


if __name__ == '__main__':
    unittest.main()
