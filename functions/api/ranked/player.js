// Cloudflare Pages Function — GET /api/ranked/player?pseudo=...
// Renvoie la ligue actuelle d'un joueur (division, points, série) — 0 par défaut
// s'il n'a jamais joué en classé — ainsi que la limite quotidienne en vigueur.

import { jsonResponse, todayKey, getDailyLimit } from "./_shared.js";

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const pseudo = (url.searchParams.get("pseudo") || "Joueur").trim().slice(0, 20) || "Joueur";

    const row = await env.DB.prepare(
      "SELECT division, points, streak, games_played, games_today, games_today_date FROM players WHERE pseudo = ?"
    ).bind(pseudo).first();

    const today = todayKey();
    const gamesToday = row && row.games_today_date === today ? row.games_today : 0;
    const dailyLimit = await getDailyLimit(env);

    return jsonResponse({
      ok: true,
      division: row ? row.division : 0,
      points: row ? row.points : 0,
      streak: row ? row.streak : 0,
      games_played: row ? row.games_played : 0,
      games_today: gamesToday,
      dailyLimit,
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: "Erreur lors de la lecture de la ligue du joueur." }, 500);
  }
}
