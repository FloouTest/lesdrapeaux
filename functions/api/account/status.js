// Cloudflare Pages Function — POST /api/account/status
// Indique si un pseudo a déjà un mot de passe défini, pour que le client sache s'il doit
// proposer un écran de connexion (mot de passe existant) ou de création (nouveau pseudo,
// ou pseudo existant jamais encore protégé — "grandfathering" des utilisateurs déjà là).

import { jsonResponse, normalizePseudo } from "./shared.js";

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const pseudo = normalizePseudo(body.pseudo);
    if (!pseudo) return jsonResponse({ ok: false, error: "Pseudo manquant." }, 400);

    const row = await env.DB.prepare(
      "SELECT password_hash FROM players WHERE pseudo = ?"
    ).bind(pseudo).first();

    const hasPassword = !!(row && row.password_hash);
    return jsonResponse({ ok: true, hasPassword });
  } catch (err) {
    return jsonResponse({ ok: false, error: "Erreur lors de la vérification du pseudo." }, 500);
  }
}
