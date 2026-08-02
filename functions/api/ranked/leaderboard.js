// Cloudflare Pages Function — GET /api/ranked/leaderboard
// Renvoie les 50 meilleurs joueurs du mode classe, tries par ligue (division) puis par FP.

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(
      "SELECT pseudo, division, points, games_played FROM players ORDER BY division DESC, points DESC LIMIT 50"
    ).all();
    return jsonResponse({ ok: true, players: results });
  } catch (err) {
    return jsonResponse({ ok: false, error: "Erreur lors de la lecture du classement classé." }, 500);
  }
}
