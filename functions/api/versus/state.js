// Cloudflare Pages Function — GET /api/versus/state?code=XXXXX&pseudo=...
// Renvoie l'état courant du match, du point de vue du pseudo demandeur (soi/adversaire).
// Appelée en polling rapide par le client (~1 fois par seconde) pour simuler du temps réel
// sans Durable Objects.

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const code = (url.searchParams.get("code") || "").trim().toUpperCase().slice(0, 10);
    const pseudo = (url.searchParams.get("pseudo") || "").trim().slice(0, 20);

    if (!code) return jsonResponse({ ok: false, error: "Code manquant." }, 400);

    const row = await env.DB.prepare("SELECT * FROM versus_matches WHERE code = ?").bind(code).first();
    if (!row) return jsonResponse({ ok: false, error: "Salon introuvable." }, 404);

    const isP1 = row.player1 === pseudo;
    const isP2 = row.player2 === pseudo;
    if (!isP1 && !isP2) return jsonResponse({ ok: false, error: "Tu ne fais pas partie de ce salon." }, 403);

    const role = isP1 ? 'p1' : 'p2';
    const selfHp = isP1 ? row.p1_hp : row.p2_hp;
    const oppHp = isP1 ? row.p2_hp : row.p1_hp;
    const selfIndex = isP1 ? row.p1_index : row.p2_index;
    const oppIndex = isP1 ? row.p2_index : row.p1_index;

    return jsonResponse({
      ok: true,
      code,
      role,
      status: row.status,
      opponentJoined: !!row.player2,
      opponentPseudo: isP1 ? row.player2 : row.player1,
      selfHp, oppHp, selfIndex, oppIndex,
      winner: row.winner,
      flags: JSON.parse(row.flags),
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: "Erreur lors de la lecture de l'état du salon." }, 500);
  }
}
