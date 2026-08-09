// Cloudflare Pages Function — POST /api/account/claim
// Définit le mot de passe d'un pseudo :
// - s'il n'existe pas encore dans "players", crée la ligne avec ce mot de passe.
// - s'il existe déjà mais n'a jamais eu de mot de passe (utilisateur "d'avant" cette
//   fonctionnalité), le protège avec ce mot de passe (premier arrivé, premier servi).
// - s'il a déjà un mot de passe, refuse (il faut passer par /api/account/login).

import { jsonResponse, normalizePseudo, hashPassword, randomSaltHex } from "./shared.js";

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const pseudo = normalizePseudo(body.pseudo);
    const password = String(body.password ?? "");

    if (!pseudo) return jsonResponse({ ok: false, error: "Pseudo manquant." }, 400);
    if (password.length < 4) {
      return jsonResponse({ ok: false, error: "Le mot de passe doit contenir au moins 4 caractères." }, 400);
    }

    const row = await env.DB.prepare(
      "SELECT password_hash FROM players WHERE pseudo = ?"
    ).bind(pseudo).first();

    if (row && row.password_hash) {
      return jsonResponse({ ok: false, error: "Ce pseudo est déjà protégé par un mot de passe. Utilise la connexion." }, 409);
    }

    const salt = randomSaltHex();
    const hash = await hashPassword(password, salt);

    if (row) {
      // Pseudo existant, jamais protege -> on le protege maintenant (grandfathering)
      await env.DB.prepare(
        "UPDATE players SET password_hash = ?, password_salt = ?, updated_at = datetime('now') WHERE pseudo = ?"
      ).bind(hash, salt, pseudo).run();
    } else {
      // Nouveau pseudo -> creation de la ligne avec le mot de passe d'emblee
      await env.DB.prepare(
        `INSERT INTO players (pseudo, division, points, streak, games_played, games_today, games_today_date, password_hash, password_salt, updated_at)
         VALUES (?, 0, 0, 0, 0, 0, '', ?, ?, datetime('now'))`
      ).bind(pseudo, hash, salt).run();
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: "Erreur lors de la création du compte." }, 500);
  }
}
