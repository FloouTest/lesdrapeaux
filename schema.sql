-- Schéma des tables (Cloudflare D1 / SQLite)
-- Utilise ce fichier uniquement pour une INSTALLATION NEUVE.
-- Si ta base existe déjà, utilise plutôt les fichiers migration_v2.sql
-- et migration_v4_ranked_leagues.sql pour ajouter les nouvelles fonctionnalités
-- sans perdre les données déjà enregistrées.

CREATE TABLE IF NOT EXISTS leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pseudo TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'flags',
  continent TEXT NOT NULL,
  mode TEXT NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  mistakes INTEGER NOT NULL,
  seconds INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  flag_count INTEGER,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_continent ON leaderboard(continent);
CREATE INDEX IF NOT EXISTS idx_leaderboard_category ON leaderboard(category);
CREATE INDEX IF NOT EXISTS idx_leaderboard_flagcount ON leaderboard(flag_count);
CREATE INDEX IF NOT EXISTS idx_leaderboard_ranking ON leaderboard(points, seconds);

-- Mode classé : système de ligues à promotion (13 paliers, 100 FP par palier)
CREATE TABLE IF NOT EXISTS players (
  pseudo TEXT PRIMARY KEY,
  division INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  games_today INTEGER NOT NULL DEFAULT 0,
  games_today_date TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_players_ranking ON players(division, points);

-- Progression séparée par sujet. `players` reste la source des anciens profils drapeaux.
CREATE TABLE IF NOT EXISTS ranked_players (
  pseudo TEXT PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'capitals' CHECK(category = 'capitals'),
  division INTEGER NOT NULL DEFAULT 0, points INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0, games_played INTEGER NOT NULL DEFAULT 0,
  games_today INTEGER NOT NULL DEFAULT 0, games_today_date TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ranked_players_ranking ON ranked_players(category, division, points);

-- Réglages du mode classé, modifiables via le panneau d'administration (admin.html)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO settings (key, value) VALUES ('ranked_daily_limit', '5')
  ON CONFLICT(key) DO NOTHING;

-- Historique des parties classées (une ligne par partie jouée), pour l'onglet "Historique"
CREATE TABLE IF NOT EXISTS ranked_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pseudo TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'flags',
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  gained INTEGER NOT NULL,
  division_after INTEGER NOT NULL,
  points_after INTEGER NOT NULL,
  daily_limit_reached INTEGER NOT NULL DEFAULT 0,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ranked_history_pseudo ON ranked_history(pseudo, created_at);

-- Historique du mode « Trouve sur la carte ».
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
