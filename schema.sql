-- Schéma de la table du classement mondial (Cloudflare D1 / SQLite)
-- Utilise ce fichier uniquement pour une INSTALLATION NEUVE.
-- Si ta base existe déjà (classement qui fonctionne), utilise plutôt
-- migration_v2.sql pour ajouter les nouvelles colonnes sans perdre les données.

CREATE TABLE IF NOT EXISTS leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pseudo TEXT NOT NULL,
  continent TEXT NOT NULL,
  mode TEXT NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  mistakes INTEGER NOT NULL,
  seconds INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  flag_count INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_continent ON leaderboard(continent);
CREATE INDEX IF NOT EXISTS idx_leaderboard_flagcount ON leaderboard(flag_count);
CREATE INDEX IF NOT EXISTS idx_leaderboard_ranking ON leaderboard(points, seconds);
