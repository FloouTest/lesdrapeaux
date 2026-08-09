// Cloudflare Pages Function — POST /api/account/login
// Vérifie le mot de passe d'un pseudo déjà protégé.

import { jsonResponse, normalizePseudo, verifyPassword } from "./shared.js";

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const pseudo = normalizePseudo(body.pseudo);
    const password = String(body.password ?? "");

    if (!pseudo) return jsonResponse({ ok: false, error: "Pseudo manquant." }, 400);

    const row = await env.DB.prepare(
      "SELECT password_hash, password_salt FROM players WHERE pseudo = ?"
    ).bind(pseudo).first();

    if (!row || !row.password_hash) {
      return jsonResponse({ ok: false, error: "Ce pseudo n'a pas encore de mot de passe." }, 404);
    }

    const valid = await verifyPassword(password, row.password_salt, row.password_hash);
    if (!valid) {
      return jsonResponse({ ok: false, error: "Mot de passe incorrect." }, 401);
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: "Erreur lors de la connexion." }, 500);
  }
}
