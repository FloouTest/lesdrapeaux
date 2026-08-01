-- Schéma de la table du classement mondial (Cloudflare D1 / SQLite)

CREATE TABLE IF NOT EXISTS leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pseudo TEXT NOT NULL,
  continent TEXT NOT NULL,
  mode TEXT NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  mistakes INTEGER NOT NULL,
  seconds INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_continent ON leaderboard(continent);
CREATE INDEX IF NOT EXISTS idx_leaderboard_ranking ON leaderboard(score, total, seconds);
