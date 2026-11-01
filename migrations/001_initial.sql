CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at INTEGER NOT NULL
);
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    csrf TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE TABLE estimates (
    id TEXT PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_hash TEXT,
    service TEXT NOT NULL CHECK(service IN ('website', 'store', 'brand')),
    scope TEXT NOT NULL CHECK(scope IN ('1', '1.5', '2.2')),
    cms INTEGER NOT NULL CHECK(cms IN (0, 1)),
    low_satang INTEGER NOT NULL CHECK(low_satang >= 0),
    high_satang INTEGER NOT NULL CHECK(high_satang >= low_satang),
    created_at INTEGER NOT NULL
);
CREATE INDEX estimates_owner ON estimates(user_id, created_at);
CREATE INDEX estimates_session ON estimates(session_hash, created_at);
CREATE TABLE chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_hash TEXT,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    body TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE INDEX chat_owner ON chat_messages(user_id, id);
CREATE INDEX chat_session ON chat_messages(session_hash, id);
CREATE TABLE rate_limits (
    bucket TEXT PRIMARY KEY,
    hits INTEGER NOT NULL,
    reset_at INTEGER NOT NULL
);
