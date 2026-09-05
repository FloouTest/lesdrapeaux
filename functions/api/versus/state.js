import { authenticate, cleanCode, ensureTables, json, parseFlags, publicFlag, roomSettings } from "./_shared.js";

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url), code = cleanCode(url.searchParams.get("code"));
    const suppliedToken = url.searchParams.get("token") || request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!code || !suppliedToken) return json({ ok: false, error: "Code ou jeton manquant." }, 400);
    await ensureTables(env.DB);
    const room = await env.DB.prepare(`SELECT r.*, s.category, s.continent, o.answer_mode FROM versus_rooms r
      LEFT JOIN versus_room_settings s ON s.room_code = r.code
      LEFT JOIN versus_room_options o ON o.room_code = r.code WHERE r.code = ?`).bind(code).first();
    if (!room) return json({ ok: false, error: "Salon introuvable." }, 404);
    const self = await authenticate(env.DB, code, suppliedToken);
    if (!self) return json({ ok: false, error: "Accès refusé." }, 403);
    const players = await env.DB.prepare("SELECT slot, pseudo, hp, question_index FROM versus_players WHERE room_code = ? ORDER BY slot").bind(code).all();
    const list = players.results.map(p => ({ playerId: p.slot, role: `p${p.slot}`, pseudo: p.pseudo, hp: p.hp, index: p.question_index, self: p.slot === self.slot }));
    const opponents = list.filter(p => !p.self);
    const flags = parseFlags(room.flags), settings = roomSettings(room);
    const makePublic = flag => publicFlag(flag, settings.answerMode);
    return json({ ok: true, code, role: `p${self.slot}`, playerId: self.slot, isHost: suppliedToken === room.host_token,
      status: room.status, maxPlayers: room.max_players, ...settings, playerCount: list.length, players: list,
      opponentJoined: opponents.length > 0, opponentPseudo: opponents[0]?.pseudo || null,
      selfHp: self.hp, oppHp: opponents[0]?.hp ?? null, selfIndex: self.question_index, oppIndex: opponents[0]?.index ?? null,
      winner: room.winner, flags: flags.map(makePublic), question: flags[self.question_index] ? makePublic(flags[self.question_index]) : null });
  } catch (error) { return json({ ok: false, error: "Erreur lors de la lecture de l'état du salon." }, 500); }
}
