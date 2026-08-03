// Cloudflare Pages Function — /api/admin/player
// GET  ?pseudo=...  : renvoie l'état classé d'un joueur précis
// POST              : modifie manuellement division/points/série/parties du jour d'un joueur
// (protégé par identifiants admin, voir _shared.js)

import { jsonResponse, isAuthorized, unauthorized } from "./_shared.js";

export async function onRequestGet({ request, env }) {
  if (!isAuthorized(request, env)) return unauthorized();
  try {
    const url = new URL(request.url);
    const pseudo = (url.searchParams.get("pseudo") || "").trim().slice(0, 20);
    if (!pseudo) return jsonResponse({ ok: false, error: "Pseudo manquant." }, 400);

    const row = await env.DB.prepare(
      "SELECT pseudo, division, points, streak, games_played, games_today, games_today_date FROM players WHERE pseudo = ?"
    ).bind(pseudo).first();

    if (!row) return jsonResponse({ ok: false, error: "Joueur introuvable." }, 404);
    return jsonResponse({ ok: true, player: row });
  } catch (err) {
    return jsonResponse({ ok: false, error: "Erreur lors de la recherche du joueur." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!isAuthorized(request, env)) return unauthorized();
  try {
    const body = await request.json();
    const pseudo = String(body.pseudo || "").trim().slice(0, 20);
    if (!pseudo) return jsonResponse({ ok: false, error: "Pseudo manquant." }, 400);

    const division = Math.max(0, Math.min(12, parseInt(body.division, 10) || 0));
    const points = Math.max(0, parseInt(body.points, 10) || 0);
    const streak = Math.max(0, parseInt(body.streak, 10) || 0);
    const gamesToday = Math.max(0, parseInt(body.gamesToday, 10) || 0);

    const existing = await env.DB.prepare("SELECT pseudo FROM players WHERE pseudo = ?").bind(pseudo).first();
    if (!existing) return jsonResponse({ ok: false, error: "Joueur introuvable." }, 404);

    await env.DB.prepare(
      `UPDATE players SET division=?, points=?, streak=?, games_today=?, updated_at=datetime('now')
       WHERE pseudo=?`
    ).bind(division, points, streak, gamesToday, pseudo).run();

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: "Erreur lors de la mise à jour du joueur." }, 500);
  }
}
