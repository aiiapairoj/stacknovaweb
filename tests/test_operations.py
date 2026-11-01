"""Rehearse schema, retention, snapshot and restore on a new disposable DB."""
from contextlib import closing
import os
from pathlib import Path
import sqlite3
import subprocess
import tempfile
import time
import unittest

ROOT = Path(__file__).resolve().parent.parent


class OperationsTests(unittest.TestCase):
    def test_clean_migration_backup_retention_and_restore(self):
        with tempfile.TemporaryDirectory(prefix='ops-test-', dir=ROOT / 'storage') as directory:
            path = Path(directory) / 'disposable.sqlite'
            env = dict(os.environ, APP_ENV='test', APP_ORIGIN='http://127.0.0.1:8097', APP_BASE_PATH='', APP_DATABASE=str(path))

            def php(tool):
                result = subprocess.run(['php', str(ROOT / 'tools' / tool)], env=env, capture_output=True, text=True, timeout=30)
                self.assertEqual(result.returncode, 0, result.stderr)
                return result.stdout

            self.assertIn('Applied migration 1', php('migrate.php'))
            self.assertNotIn('Applied migration', php('migrate.php'))
            now = int(time.time())
            old = now - 366 * 86400
            with closing(sqlite3.connect(path)) as db:
                db.execute('PRAGMA foreign_keys = ON')
                self.assertEqual(db.execute('SELECT version FROM schema_migrations ORDER BY version').fetchall(), [(1,), (2,)])
                for ident, seen in [(1, old), (2, now)]:
                    db.execute('INSERT INTO users(id, email, display_name, password_hash, created_at, last_login) VALUES (?, ?, ?, ?, ?, ?)', (ident, f'fixture{ident}@example.test', 'Disposable operation fixture', 'not-a-real-login', seen, seen))
                    db.execute('INSERT INTO chat_messages(user_id, role, body, created_at) VALUES (?, ?, ?, ?)', (ident, 'user', 'Synthetic retention test', now))
                for created in [now - 31 * 86400, now]:
                    db.execute('INSERT INTO chat_messages(session_hash, role, body, created_at) VALUES (?, ?, ?, ?)', ('synthetic-session', 'user', 'Guest fixture', created))
                db.commit()
                counts_before = db.execute('SELECT count(*) FROM chat_messages').fetchone()[0]
            self.assertIn('Backup created:', php('backup.php'))
            backups = list((Path(directory) / 'backups').glob('*.sqlite'))
            self.assertEqual(len(backups), 1)
            self.assertIn('Expired records removed', php('maintenance.php'))
            with closing(sqlite3.connect(path)) as db:
                self.assertEqual(db.execute('SELECT id FROM users').fetchall(), [(2,)])
                self.assertEqual(db.execute('SELECT count(*) FROM chat_messages').fetchone()[0], 2)
                self.assertEqual(db.execute('PRAGMA integrity_check').fetchone()[0], 'ok')
                self.assertEqual(db.execute('PRAGMA foreign_key_check').fetchall(), [])
            # A restoration rehearsal uses a fresh database, not an overwrite of the live DB.
            restored = Path(directory) / 'restored.sqlite'
            with closing(sqlite3.connect(backups[0])) as source, closing(sqlite3.connect(restored)) as target:
                source.backup(target)
                self.assertEqual(target.execute('PRAGMA integrity_check').fetchone()[0], 'ok')
                self.assertEqual(target.execute('SELECT count(*) FROM chat_messages').fetchone()[0], counts_before)
                self.assertEqual(target.execute('SELECT count(*) FROM users').fetchone()[0], 2)


if __name__ == '__main__':
    unittest.main()
