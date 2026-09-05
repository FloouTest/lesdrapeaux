// Cloudflare Pages Function — GET /api/ranked/leaderboard
// Renvoie les 50 meilleurs joueurs du mode classe, tries par ligue (division) puis par FP.

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function onRequestGet({ request, env }) {
  try {
    const category = new URL(request.url).searchParams.get("category") === "capitals" ? "capitals" : "flags";
    const table = category === "capitals" ? "ranked_players" : "players";
    const { results } = await env.DB.prepare(
      `SELECT pseudo, division, points, games_played FROM ${table} ORDER BY division DESC, points DESC LIMIT 50`
    ).all();
    return jsonResponse({ ok: true, players: results });
  } catch (err) {
    return jsonResponse({ ok: false, error: "Erreur lors de la lecture du classement classé." }, 500);
  }
}
