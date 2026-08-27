// Cloudflare Pages Function — POST /api/versus/join
// Rejoint un salon existant (le deuxième joueur). Passe le salon en "active".

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const code = String(body.code ?? "").trim().toUpperCase().slice(0, 10);
    const pseudo = String(body.pseudo ?? "Joueur").trim().slice(0, 20) || "Joueur";

    if (!code) return jsonResponse({ ok: false, error: "Code manquant." }, 400);

    const row = await env.DB.prepare("SELECT * FROM versus_matches WHERE code = ?").bind(code).first();
    if (!row) return jsonResponse({ ok: false, error: "Salon introuvable. Vérifie le code." }, 404);

    if (row.player1 === pseudo || row.player2 === pseudo) {
      // Reconnexion : le joueur etait deja dans ce salon (rechargement de page, etc.)
      return jsonResponse({ ok: true, code, role: row.player1 === pseudo ? 'p1' : 'p2', flags: JSON.parse(row.flags) });
    }

    if (row.player2) {
      return jsonResponse({ ok: false, error: "Ce salon est déjà complet." }, 409);
    }

    await env.DB.prepare(
      "UPDATE versus_matches SET player2 = ?, status = 'active', updated_at = datetime('now') WHERE code = ? AND player2 IS NULL"
    ).bind(pseudo, code).run();

    return jsonResponse({ ok: true, code, role: 'p2', flags: JSON.parse(row.flags) });
  } catch (err) {
    return jsonResponse({ ok: false, error: "Erreur lors de la connexion au salon." }, 500);
  }
}
