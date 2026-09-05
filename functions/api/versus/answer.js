import { answersFor, authenticate, cleanCode, ensureTables, json, normalize, parseFlags } from "./_shared.js";

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json(), code = cleanCode(body.code), index = Number(body.index);
    const suppliedToken = String(body.token || request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") || "");
    if (!code || !suppliedToken || !Number.isInteger(index) || typeof body.answer !== "string")
      return json({ ok: false, error: "Requête invalide." }, 400);
    await ensureTables(env.DB);
    const room = await env.DB.prepare("SELECT * FROM versus_rooms WHERE code = ?").bind(code).first();
    if (!room) return json({ ok: false, error: "Salon introuvable." }, 404);
    const actor = await authenticate(env.DB, code, suppliedToken);
    if (!actor) return json({ ok: false, error: "Accès refusé." }, 403);
    if (room.status !== "active") return json({ ok: true, ignored: true, applied: false, status: room.status, winner: room.winner });
    const flags = parseFlags(room.flags);
    if (!flags[index]) return json({ ok: false, error: "Index hors limites." }, 400);
    const submittedAnswer = normalize(body.answer);
    const correct = answersFor(flags[index]).some(answer => submittedAnswer === normalize(answer));
    // D1 batch() executes these statements in one transaction. Materializing the
    // eligibility row is important: the UPDATE also mutates versus_players, so a
    // correlated guard could otherwise observe its own writes.
    const [answerResult, , playersResult, roomResult] = await env.DB.batch([
      env.DB.prepare(`WITH eligible AS MATERIALIZED (
        SELECT a.slot
        FROM versus_rooms r
        JOIN versus_players a ON a.room_code = r.code
        WHERE r.code = ? AND r.status = 'active' AND a.slot = ?
          AND a.question_index = ? AND a.hp > 0
      )
      UPDATE versus_players SET
        question_index = question_index + CASE WHEN slot = ? THEN 1 ELSE 0 END,
        hp = CASE WHEN slot = ? THEN CASE WHEN ? THEN MIN(1000, hp + 50) ELSE MAX(0, hp - 25) END
                  WHEN ? THEN MAX(0, hp - 100) ELSE hp END
      WHERE room_code = ? AND EXISTS (SELECT 1 FROM eligible)`)
        .bind(code, actor.slot, index, actor.slot, actor.slot, correct ? 1 : 0, correct ? 1 : 0, code),
      env.DB.prepare(`WITH standings AS MATERIALIZED (
        SELECT pseudo, hp, question_index FROM versus_players WHERE room_code = ?
      )
      UPDATE versus_rooms SET
        status = 'finished',
        winner = CASE
          WHEN (SELECT COUNT(*) FROM standings WHERE hp > 0) <= 1
            THEN COALESCE((SELECT pseudo FROM standings WHERE hp > 0 LIMIT 1), 'draw')
          WHEN (SELECT COUNT(*) FROM standings
                WHERE hp = (SELECT MAX(hp) FROM standings WHERE hp > 0)) = 1
            THEN (SELECT pseudo FROM standings
                  WHERE hp = (SELECT MAX(hp) FROM standings WHERE hp > 0) LIMIT 1)
          ELSE 'draw'
        END,
        updated_at = datetime('now')
      WHERE code = ? AND status = 'active'
        AND ((SELECT COUNT(*) FROM standings WHERE hp > 0) <= 1
          OR NOT EXISTS (SELECT 1 FROM standings WHERE hp > 0 AND question_index < ?))`)
        .bind(code, code, flags.length),
      env.DB.prepare("SELECT slot, pseudo, hp, question_index FROM versus_players WHERE room_code = ? ORDER BY slot").bind(code),
      env.DB.prepare("SELECT status, winner FROM versus_rooms WHERE code = ?").bind(code),
    ]);
    const applied = answerResult.meta.changes > 0;
    const players = playersResult.results;
    const finalRoom = roomResult.results[0];
    const self = players.find(p => p.slot === actor.slot), opponents = players.filter(p => p.slot !== actor.slot);
    return json({ ok: true, applied, correct,
      ...(!correct && applied ? { correctAnswer: answersFor(flags[index])[0] } : {}),
      status: finalRoom.status, winner: finalRoom.winner,
      selfHp: self.hp, oppHp: opponents[0]?.hp ?? null, selfIndex: self.question_index, oppIndex: opponents[0]?.question_index ?? null,
      players: players.map(p => ({ playerId: p.slot, role: `p${p.slot}`, pseudo: p.pseudo, hp: p.hp, index: p.question_index })) });
  } catch (error) { return json({ ok: false, error: "Erreur lors du traitement de la réponse." }, 500); }
}
