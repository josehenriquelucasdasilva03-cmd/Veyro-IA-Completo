-- Veyro IA authenticated conversation persistence (owner-scoped, no passwords).
CREATE TABLE IF NOT EXISTS veyro_conversations (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id),
 title TEXT NOT NULL DEFAULT 'Nova conversa',
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_veyro_conversations_user_date ON veyro_conversations(user_id,updated_at DESC);
CREATE TABLE IF NOT EXISTS veyro_conversation_messages (
 id TEXT PRIMARY KEY,
 conversation_id TEXT NOT NULL REFERENCES veyro_conversations(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id),
 role TEXT NOT NULL CHECK(role IN ('user','assistant')),
 text TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_veyro_messages_owner_date ON veyro_conversation_messages(user_id,conversation_id,created_at);
CREATE TABLE IF NOT EXISTS veyro_user_memories (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id),
 text TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_veyro_memories_owner ON veyro_user_memories(user_id,created_at DESC);
