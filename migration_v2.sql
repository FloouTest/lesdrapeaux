-- Migration à exécuter UNE SEULE FOIS sur une base déjà en place
-- (celle que tu as déjà déployée et qui fonctionne).
-- Ajoute les colonnes nécessaires au système de points et au filtrage
-- par nombre de drapeaux, sans toucher aux données existantes.
--
-- Commande :
--   wrangler d1 execute flags-quiz-db --remote --file=./migration_v2.sql

ALTER TABLE leaderboard ADD COLUMN points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE leaderboard ADD COLUMN flag_count INTEGER;

CREATE INDEX IF NOT EXISTS idx_leaderboard_flagcount ON leaderboard(flag_count);
CREATE INDEX IF NOT EXISTS idx_leaderboard_ranking ON leaderboard(points, seconds);
