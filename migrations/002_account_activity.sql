ALTER TABLE users ADD COLUMN last_login INTEGER NOT NULL DEFAULT 0;
UPDATE users SET last_login = created_at WHERE last_login = 0;
CREATE INDEX users_last_login ON users(last_login);
