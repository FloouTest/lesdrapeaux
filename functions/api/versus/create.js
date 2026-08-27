// Cloudflare Pages Function — POST /api/versus/create
// Crée un salon 1v1 : génère un code court à partager et la séquence de drapeaux
// (identique pour les deux joueurs). Fichier autonome, sans import partagé.

const FLAG_COUNT = 40; // largement suffisant : a 100 pv/coup, un match se termine bien avant
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans O/0, I/1 (ambigus a l'oral/ecrit)

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

function randomCode(len = 5) {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return out;
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const pseudo = String(body.pseudo ?? "Joueur").trim().slice(0, 20) || "Joueur";
    const flags = Array.isArray(body.flags) ? body.flags.slice(0, FLAG_COUNT) : null;

    if (!flags || flags.length < 5) {
      return jsonResponse({ ok: false, error: "Liste de drapeaux invalide." }, 400);
    }

    // Le client genere la sequence (a partir de sa propre liste de pays, deja verifiee cote
    // jeu) ; le serveur se contente de la stocker telle quelle pour qu'elle soit identique
    // pour les deux joueurs.
    let code = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = randomCode();
      const existing = await env.DB.prepare("SELECT code FROM versus_matches WHERE code = ?").bind(candidate).first();
      if (!existing) { code = candidate; break; }
    }
    if (!code) return jsonResponse({ ok: false, error: "Impossible de générer un code, réessaie." }, 500);

    await env.DB.prepare(
      `INSERT INTO versus_matches (code, player1, flags, status) VALUES (?, ?, ?, 'waiting')`
    ).bind(code, pseudo, JSON.stringify(flags)).run();

    return jsonResponse({ ok: true, code });
  } catch (err) {
    return jsonResponse({ ok: false, error: "Erreur lors de la création du salon." }, 500);
  }
}
