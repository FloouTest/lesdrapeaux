// Cloudflare Pages Function — GET /api/history?pseudo=...
// Renvoie les 10 dernières parties jouées par un pseudo, en mélangeant les parties
// classiques (table "leaderboard") et les parties classées (table "ranked_history"),
// triées par date décroissante.
//
// Utilisé à la fois par l'onglet "Historique" du jeu (pour le joueur courant) et par la
// recherche de joueur du panneau d'administration (pour n'importe quel pseudo).

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const pseudo = (url.searchParams.get("pseudo") || "").trim().slice(0, 20);
    if (!pseudo) return jsonResponse({ ok: false, error: "Pseudo manquant." }, 400);

    const { results } = await env.DB.prepare(
      `SELECT created_at, 'casual' AS type, continent AS label, mode, score, total, points,
              NULL AS division, 0 AS daily_limit_reached, details
       FROM leaderboard WHERE pseudo = ?
       UNION ALL
       SELECT created_at, 'ranked' AS type, 'Classé' AS label, 'saisie' AS mode, score, total,
              gained AS points, division_after AS division, daily_limit_reached, details
       FROM ranked_history WHERE pseudo = ?
       ORDER BY created_at DESC
       LIMIT 10`
    ).bind(pseudo, pseudo).all();

    return jsonResponse({ ok: true, history: results });
  } catch (err) {
    return jsonResponse({ ok: false, error: "Erreur lors de la lecture de l'historique." }, 500);
  }
}
