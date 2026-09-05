-- Ajoute les catégories drapeaux/capitales sans modifier les anciens scores.
-- wrangler d1 execute flags-quiz-db --remote --file=./migration_v5_capitals.sql
ALTER TABLE leaderboard ADD COLUMN category TEXT NOT NULL DEFAULT 'flags';
ALTER TABLE ranked_history ADD COLUMN category TEXT NOT NULL DEFAULT 'flags';
CREATE INDEX IF NOT EXISTS idx_leaderboard_category ON leaderboard(category);
CREATE INDEX IF NOT EXISTS idx_ranked_history_category ON ranked_history(category, pseudo, created_at);
CREATE TABLE IF NOT EXISTS ranked_players (
  pseudo TEXT PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'capitals' CHECK(category = 'capitals'),
  division INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  games_today INTEGER NOT NULL DEFAULT 0,
  games_today_date TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ranked_players_ranking ON ranked_players(category, division, points);
-- Les anciens profils restent dans players et sont lus pour category=flags (compatibilité).
