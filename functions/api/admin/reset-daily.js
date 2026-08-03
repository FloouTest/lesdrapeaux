// Cloudflare Pages Function — POST /api/admin/reset-daily
// Deux modes (protégé par identifiants admin, voir _shared.js) :
//   { "mode": "reset" }                  -> remet le compteur quotidien de TOUS les joueurs à 0
//   { "mode": "bonus", "amount": 3 }     -> accorde N partie(s) supplémentaire(s) à TOUS les
//                                            joueurs pour aujourd'hui (sans toucher au réglage
//                                            de limite quotidienne)

import { jsonResponse, isAuthorized, unauthorized } from "./_shared.js";

export async function onRequestPost({ request, env }) {
  if (!isAuthorized(request, env)) return unauthorized();
  try {
    const body = await request.json().catch(() => ({}));
    const mode = body.mode === "bonus" ? "bonus" : "reset";

    if (mode === "reset") {
      await env.DB.prepare("UPDATE players SET games_today = 0").run();
      return jsonResponse({ ok: true, message: "Compteur quotidien réinitialisé pour tous les joueurs." });
    }

    const amount = Math.max(1, Math.min(50, parseInt(body.amount, 10) || 1));
    await env.DB.prepare("UPDATE players SET games_today = MAX(0, games_today - ?)").bind(amount).run();
    return jsonResponse({
      ok: true,
      message: `${amount} partie(s) bonus accordée(s) à tous les joueurs pour aujourd'hui.`,
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: "Erreur lors de la réinitialisation." }, 500);
  }
}
