// Cloudflare Pages Function — GET /api/admin/history
// Renvoie les 100 dernières parties jouées, tous joueurs confondus (classiques + classées),
// triées par date décroissante. Réservé à l'admin (voir shared.js).

import { jsonResponse, isAuthorized, unauthorized } from "./_shared.js";

export async function onRequestGet({ request, env }) {
  if (!isAuthorized(request, env)) return unauthorized();
  try {
    const { results } = await env.DB.prepare(
      `SELECT created_at, pseudo, 'casual' AS type, continent AS label, mode, score, total,
              points, NULL AS division, 0 AS daily_limit_reached
       FROM leaderboard
       UNION ALL
       SELECT created_at, pseudo, 'ranked' AS type, 'Classé' AS label, 'saisie' AS mode, score, total,
              gained AS points, division_after AS division, daily_limit_reached
       FROM ranked_history
       ORDER BY created_at DESC
       LIMIT 100`
    ).all();

    return jsonResponse({ ok: true, history: results });
  } catch (err) {
    return jsonResponse({ ok: false, error: "Erreur lors de la lecture de l'historique général." }, 500);
  }
}
