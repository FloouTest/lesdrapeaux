// Cloudflare Pages Function — POST /api/versus/answer
// Traite une réponse (bonne ou mauvaise) de façon atomique côté SQL (expressions relatives,
// pas de lecture-puis-écriture en JS) pour éviter toute perte de mise à jour si les deux
// joueurs répondent au même instant. Aucune vérification anti-triche sur la validité de la
// réponse elle-même (le client valide via sa propre logique de comparaison, comme partout
// ailleurs dans ce projet) — seul l'index attendu est vérifié, pour empêcher un rejeu/doublon.
//
// Règles : bonne réponse = +50 pv soi / -100 pv adversaire. Mauvaise réponse = -25 pv soi.
// 0 pv = défaite.

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
    const pseudo = String(body.pseudo ?? "").trim().slice(0, 20);
    const index = parseInt(body.index, 10);
    const correct = !!body.correct;

    if (!code || Number.isNaN(index)) {
      return jsonResponse({ ok: false, error: "Requête invalide." }, 400);
    }

    const row = await env.DB.prepare("SELECT * FROM versus_matches WHERE code = ?").bind(code).first();
    if (!row) return jsonResponse({ ok: false, error: "Salon introuvable." }, 404);

    const isP1 = row.player1 === pseudo;
    const isP2 = row.player2 === pseudo;
    if (!isP1 && !isP2) return jsonResponse({ ok: false, error: "Tu ne fais pas partie de ce salon." }, 403);

    if (row.status !== 'active') {
      return jsonResponse({ ok: true, ignored: true, status: row.status, winner: row.winner });
    }

    // Mise a jour atomique (expressions relatives cote SQL), protegee par l'index attendu
    // pour eviter qu'une meme reponse soit comptee deux fois (double-clic, requete rejouee).
    const selfIndexCol = isP1 ? 'p1_index' : 'p2_index';
    const selfHpCol = isP1 ? 'p1_hp' : 'p2_hp';
    const oppHpCol = isP1 ? 'p2_hp' : 'p1_hp';

    const update = await env.DB.prepare(
      `UPDATE versus_matches SET
         ${selfIndexCol} = ${selfIndexCol} + 1,
         ${selfHpCol} = CASE WHEN ? THEN MIN(1000, ${selfHpCol} + 50) ELSE MAX(0, ${selfHpCol} - 25) END,
         ${oppHpCol} = CASE WHEN ? THEN MAX(0, ${oppHpCol} - 100) ELSE ${oppHpCol} END,
         updated_at = datetime('now')
       WHERE code = ? AND ${selfIndexCol} = ? AND status = 'active'`
    ).bind(correct ? 1 : 0, correct ? 1 : 0, code, index).run();

    // Etat frais apres mise a jour (que la ligne ait ete touchee ou non par CETTE requete :
    // si l'index ne correspondait plus, on renvoie simplement l'etat actuel sans erreur).
    const fresh = await env.DB.prepare("SELECT * FROM versus_matches WHERE code = ?").bind(code).first();

    if (fresh.status === 'active') {
      let winner = null;
      if (fresh.p1_hp <= 0 && fresh.p2_hp <= 0) {
        winner = 'draw';
      } else if (fresh.p1_hp <= 0) {
        winner = fresh.player2;
      } else if (fresh.p2_hp <= 0) {
        winner = fresh.player1;
      } else {
        const flagsLen = JSON.parse(fresh.flags).length;
        if (fresh.p1_index >= flagsLen && fresh.p2_index >= flagsLen) {
          // Les deux ont fini la liste sans KO -> celui avec le plus de pv gagne
          if (fresh.p1_hp === fresh.p2_hp) winner = 'draw';
          else winner = fresh.p1_hp > fresh.p2_hp ? fresh.player1 : fresh.player2;
        }
      }
      if (winner) {
        await env.DB.prepare(
          "UPDATE versus_matches SET status = 'finished', winner = ?, updated_at = datetime('now') WHERE code = ? AND status = 'active'"
        ).bind(winner, code).run();
      }
    }

    const finalRow = await env.DB.prepare("SELECT * FROM versus_matches WHERE code = ?").bind(code).first();
    const selfHp = isP1 ? finalRow.p1_hp : finalRow.p2_hp;
    const oppHp = isP1 ? finalRow.p2_hp : finalRow.p1_hp;
    const selfIndex = isP1 ? finalRow.p1_index : finalRow.p2_index;
    const oppIndex = isP1 ? finalRow.p2_index : finalRow.p1_index;

    return jsonResponse({
      ok: true,
      status: finalRow.status,
      selfHp, oppHp, selfIndex, oppIndex,
      winner: finalRow.winner,
      applied: update.meta.changes > 0,
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: "Erreur lors du traitement de la réponse." }, 500);
  }
}
