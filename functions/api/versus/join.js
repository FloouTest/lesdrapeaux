import {
  cleanCode,
  cleanPseudo,
  ensureTables,
  json,
  parseFlags,
  publicFlag,
  roomSettings,
  token,
} from "./_shared.js";

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const code = cleanCode(body.code),
      pseudo = cleanPseudo(body.pseudo);
    if (!code) return json({ ok: false, error: "Code manquant." }, 400);
    await ensureTables(env.DB);
    const room = await env.DB.prepare(
      `SELECT r.*, s.category, s.continent, o.answer_mode,
      m.prompt_mode, m.first_to_find FROM versus_rooms r
      LEFT JOIN versus_room_settings s ON s.room_code = r.code
      LEFT JOIN versus_room_options o ON o.room_code = r.code
      LEFT JOIN versus_map_options m ON m.room_code = r.code WHERE r.code = ?`,
    )
      .bind(code)
      .first();
    if (!room)
      return json(
        { ok: false, error: "Salon introuvable. Vérifie le code." },
        404,
      );
    if (room.status !== "waiting")
      return json({ ok: false, error: "Cette partie a déjà commencé." }, 409);
    const existing = await env.DB.prepare(
      "SELECT * FROM versus_players WHERE room_code = ? AND pseudo = ?",
    )
      .bind(code, pseudo)
      .first();
    if (existing)
      return json(
        {
          ok: false,
          error:
            "Pseudo déjà utilisé dans ce salon. Utilise ton jeton pour te reconnecter.",
        },
        409,
      );
    for (let attempt = 0; attempt < 10; attempt++) {
      const playerToken = token();
      const result = await env.DB.prepare(
        `WITH slots(n) AS (VALUES (2), (3), (4), (5), (6), (7), (8))
        INSERT OR IGNORE INTO versus_players (room_code, slot, token, pseudo)
        SELECT ?, n, ?, ? FROM slots
        WHERE n <= ? AND NOT EXISTS (SELECT 1 FROM versus_players WHERE room_code = ? AND slot = n)
          AND EXISTS (SELECT 1 FROM versus_rooms WHERE code = ? AND status = 'waiting') ORDER BY n LIMIT 1`,
      )
        .bind(code, playerToken, pseudo, room.max_players, code, code)
        .run();
      if (result.meta.changes > 0) {
        const player = await env.DB.prepare(
          "SELECT slot FROM versus_players WHERE token = ?",
        )
          .bind(playerToken)
          .first();
        const settings = roomSettings(room);
        const flags = parseFlags(room.flags).map((flag) =>
          publicFlag(flag, settings.answerMode),
        );
        return json({
          ok: true,
          code,
          token: playerToken,
          role: `p${player.slot}`,
          playerId: player.slot,
          flags,
          maxPlayers: room.max_players,
          ...settings,
        });
      }
      const count = await env.DB.prepare(
        "SELECT count(*) count FROM versus_players WHERE room_code = ?",
      )
        .bind(code)
        .first();
      if (count.count >= room.max_players)
        return json({ ok: false, error: "Ce salon est déjà complet." }, 409);
    }
    return json({ ok: false, error: "Connexion concurrente, réessaie." }, 409);
  } catch (error) {
    console.error("[versus/join] Failed to join room", error);
    return json(
      { ok: false, error: "Erreur lors de la connexion au salon." },
      500,
    );
  }
}
