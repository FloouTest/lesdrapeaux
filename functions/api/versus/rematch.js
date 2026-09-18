import { cleanCode, ensureTables, json, VERSUS_CATEGORIES } from "./_shared.js";
import { validQuestion } from "./create.js";

// Restarts a finished room in place: same code, same players, same category/
// continent/answer mode as the room was created with, just a fresh question
// set and everyone's HP/progress reset to zero. This lets the host relaunch
// instantly without anyone re-sharing or re-typing the room code.
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const code = cleanCode(body.code);
    const suppliedToken = String(
      body.token ||
        request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ||
        "",
    );
    if (!code || !suppliedToken)
      return json({ ok: false, error: "Code ou jeton manquant." }, 400);
    await ensureTables(env.DB);
    const room = await env.DB.prepare(
      `SELECT r.status, r.host_token, s.category, o.answer_mode
      FROM versus_rooms r
      LEFT JOIN versus_room_settings s ON s.room_code = r.code
      LEFT JOIN versus_room_options o ON o.room_code = r.code
      WHERE r.code = ?`,
    )
      .bind(code)
      .first();
    if (!room) return json({ ok: false, error: "Salon introuvable." }, 404);
    if (room.host_token !== suppliedToken)
      return json(
        { ok: false, error: "Seul l'hôte peut relancer la partie." },
        403,
      );
    if (room.status !== "finished")
      return json(
        {
          ok: false,
          error: "La partie n'est pas encore terminée.",
          status: room.status,
        },
        409,
      );
    const category = VERSUS_CATEGORIES.includes(room.category)
      ? room.category
      : "flags";
    const answerMode = room.answer_mode === "mcq" ? "mcq" : "free";
    const flags = Array.isArray(body.flags) ? body.flags : null;
    if (
      !flags ||
      flags.length < 5 ||
      flags.length > 100 ||
      !flags.every((flag) => validQuestion(flag, category, answerMode))
    )
      return json({ ok: false, error: "Liste de questions invalide." }, 400);
    const [roomUpdate] = await env.DB.batch([
      env.DB.prepare(
        `UPDATE versus_rooms SET flags = ?, status = 'active', winner = NULL, updated_at = datetime('now')
        WHERE code = ? AND host_token = ? AND status = 'finished'`,
      ).bind(JSON.stringify(flags), code, suppliedToken),
      env.DB.prepare(
        `UPDATE versus_players SET hp = 1000, question_index = 0 WHERE room_code = ?`,
      ).bind(code),
      // Map progress rows are keyed by (room, slot, question_index); without
      // clearing them a rematch would reuse question_index 0 and inherit
      // stale attempt counts/start times from the previous match.
      env.DB.prepare(
        `DELETE FROM versus_map_progress WHERE room_code = ?`,
      ).bind(code),
    ]);
    if (!roomUpdate.meta.changes)
      return json(
        {
          ok: false,
          error: "La partie a déjà été relancée ou a changé d'état.",
        },
        409,
      );
    return json({ ok: true, code, status: "active" });
  } catch (error) {
    return json(
      { ok: false, error: "Erreur lors de la relance de la partie." },
      500,
    );
  }
}
