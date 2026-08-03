// Cloudflare Pages Function — POST /api/admin/reset-ranked
// Supprime DÉFINITIVEMENT tous les joueurs et scores du mode classé (ligues, FP, séries,
// compteurs quotidiens). Action irréversible : le panneau d'administration doit faire
// confirmer cette action deux fois avant d'appeler cette route.
// (protégé par identifiants admin, voir _shared.js)

import { jsonResponse, isAuthorized, unauthorized } from "./_shared.js";

export async function onRequestPost({ request, env }) {
  if (!isAuthorized(request, env)) return unauthorized();
  try {
    const body = await request.json().catch(() => ({}));
    // Confirmation supplémentaire côté serveur : le corps de la requête doit contenir
    // exactement ce texte, pour éviter qu'un appel accidentel ne vide le classement.
    if (body.confirm !== "SUPPRIMER LE CLASSEMENT CLASSE") {
      return jsonResponse({ ok: false, error: "Confirmation manquante ou incorrecte." }, 400);
    }

    const before = await env.DB.prepare("SELECT COUNT(*) AS n FROM players").first();
    await env.DB.prepare("DELETE FROM players").run();

    return jsonResponse({
      ok: true,
      message: `Classement classé réinitialisé : ${before ? before.n : 0} joueur(s) supprimé(s).`,
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: "Erreur lors de la réinitialisation du classement." }, 500);
  }
}
