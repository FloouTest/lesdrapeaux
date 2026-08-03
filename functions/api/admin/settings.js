// Cloudflare Pages Function — /api/admin/settings
// GET  : renvoie la limite quotidienne actuelle de parties classées
// POST : modifie cette limite (protégé par identifiants admin, voir _shared.js)

import { jsonResponse, isAuthorized, unauthorized } from "./_shared.js";

async function ensureSettingsTable(env) {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)"
  ).run();
}

export async function onRequestGet({ request, env }) {
  if (!isAuthorized(request, env)) return unauthorized();
  try {
    await ensureSettingsTable(env);
    const row = await env.DB.prepare(
      "SELECT value FROM settings WHERE key = 'ranked_daily_limit'"
    ).first();
    const dailyLimit = row ? parseInt(row.value, 10) : 5;
    return jsonResponse({ ok: true, dailyLimit });
  } catch (err) {
    return jsonResponse({ ok: false, error: "Erreur lors de la lecture des réglages." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!isAuthorized(request, env)) return unauthorized();
  try {
    await ensureSettingsTable(env);
    const body = await request.json();
    const limit = Math.max(1, Math.min(100, parseInt(body.dailyLimit, 10) || 5));
    await env.DB.prepare(
      `INSERT INTO settings (key, value) VALUES ('ranked_daily_limit', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).bind(String(limit)).run();
    return jsonResponse({ ok: true, dailyLimit: limit });
  } catch (err) {
    return jsonResponse({ ok: false, error: "Erreur lors de la mise à jour des réglages." }, 500);
  }
}
