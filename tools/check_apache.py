"""Read-only checks of the local XAMPP deployment boundary, not the test router."""
import json
import urllib.error
import urllib.request

BASE = 'http://localhost/StackNova'


def get(path):
    try:
        response = urllib.request.urlopen(BASE + path, timeout=10)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        return response.status, response.read(), response.headers


status, body, headers = get('/')
assert status == 200, status
assert headers['X-Content-Type-Options'] == 'nosniff'
assert "script-src 'self'" in headers['Content-Security-Policy']
assert headers.get('X-Powered-By') is None
status, body, _ = get('/api/session')
assert status == 200
assert json.loads(body)['user'] is None
paths = [
    '/storage/stacknova.sqlite', '/storage/stacknova.sqlite-wal',
    '/storage/security-test.sqlite', '/src/bootstrap.php', '/config.local.php',
    '/migrations/001_initial.sql', '/tools/migrate.php', '/views/home.html',
    '/tests/test_security.py', '/node_modules/tailwindcss/package.json',
    '/package.json', '/.gitignore', '/.aetox/launch.json', '/index.html',
    '/assets/../src/Auth.php', '/assets/%2e%2e/src/Auth.php',
]
for path in paths:
    status, body, _ = get(path)
    assert status in (400, 403, 404), (path, status)
    assert b'<?php' not in body and b'SQLite format' not in body, path
print(f'Apache page/API OK; private-file checks passed: {len(paths)}.')
print('This check does not validate HTTPS, host patching or production cookies.')
