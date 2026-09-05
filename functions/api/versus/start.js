import { cleanCode, ensureTables, json } from "./_shared.js";

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json(), code = cleanCode(body.code);
    const suppliedToken = String(body.token || request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") || "");
    if (!code || !suppliedToken) return json({ ok: false, error: "Code ou jeton manquant." }, 400);
    await ensureTables(env.DB);
    const result = await env.DB.prepare(`UPDATE versus_rooms SET status = 'active', updated_at = datetime('now')
      WHERE code = ? AND host_token = ? AND status = 'waiting'
      AND (SELECT count(*) FROM versus_players WHERE room_code = ?) BETWEEN 2 AND max_players`)
      .bind(code, suppliedToken, code).run();
    if (result.meta.changes) return json({ ok: true, code, status: "active" });
    const room = await env.DB.prepare("SELECT status, host_token FROM versus_rooms WHERE code = ?").bind(code).first();
    if (!room) return json({ ok: false, error: "Salon introuvable." }, 404);
    if (room.host_token !== suppliedToken) return json({ ok: false, error: "Seul l'hôte peut démarrer." }, 403);
    if (room.status !== "waiting") return json({ ok: false, error: "La partie a déjà démarré.", status: room.status }, 409);
    return json({ ok: false, error: "Deux joueurs minimum sont requis." }, 409);
  } catch (error) { return json({ ok: false, error: "Erreur lors du démarrage du salon." }, 500); }
}
