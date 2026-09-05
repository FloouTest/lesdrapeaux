-- Ajoute l'historique du mode « Trouve sur la carte ».
-- À exécuter une seule fois sur une base existante :
-- wrangler d1 execute flags-quiz-db --remote --file=./migration_v6_map_history.sql
CREATE TABLE IF NOT EXISTS map_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pseudo TEXT NOT NULL,
  prompt_mode TEXT NOT NULL CHECK(prompt_mode IN ('country', 'capital')),
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  attempts INTEGER NOT NULL,
  seconds INTEGER NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_map_history_pseudo ON map_history(pseudo, created_at);
