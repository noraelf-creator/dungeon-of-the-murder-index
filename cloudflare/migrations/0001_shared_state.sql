CREATE TABLE IF NOT EXISTS memos (
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL, page_id TEXT NOT NULL, section_id TEXT NOT NULL,
 title TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '', resolved INTEGER NOT NULL DEFAULT 0,
 character TEXT NOT NULL DEFAULT '', card TEXT NOT NULL DEFAULT '', revision INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS memos_section ON memos(project_id,page_id,section_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS memos_project ON memos(project_id,updated_at);
CREATE TABLE IF NOT EXISTS todos (
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL, todo_key TEXT NOT NULL, label TEXT NOT NULL,
 completed INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0,
 revision INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS todos_key ON todos(project_id,todo_key) WHERE deleted_at IS NULL;
CREATE TABLE IF NOT EXISTS edit_sessions (token_hash TEXT PRIMARY KEY,project_id TEXT NOT NULL,expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS auth_attempts (id TEXT PRIMARY KEY,window INTEGER NOT NULL,count INTEGER NOT NULL);
