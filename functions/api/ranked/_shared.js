// Fonctions partagées entre les routes /api/ranked/*
// (fichier non routé : Cloudflare Pages ignore les chemins commençant par "_")

export const RANKED_MAX_DIVISION = 12; // index de "Vexillologue Suprême" (13 paliers, de 0 à 12)
export const RANKED_POINTS_PER_LEAGUE = 100;
export const DEFAULT_DAILY_LIMIT = 5;

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export function clampInt(value, min, max) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

export function computeFpGain(score, total, streak) {
  const accuracy = total > 0 ? score / total : 0;
  const base = Math.round(25 * accuracy); // 0 a 25
  let newStreak, bonus;
  if (accuracy >= 0.8) {
    newStreak = streak + 1;
    bonus = Math.min(newStreak, 5);
  } else {
    newStreak = 0;
    bonus = 0;
  }
  return { base, bonus, gained: base + bonus, newStreak };
}

export function applyRankedGain(division, points, gained) {
  let d = division;
  let p = points + gained;
  while (p >= RANKED_POINTS_PER_LEAGUE && d < RANKED_MAX_DIVISION) {
    p -= RANKED_POINTS_PER_LEAGUE;
    d += 1;
  }
  return { division: d, points: p };
}

// Limite quotidienne de parties classées, réglable par l'admin via /api/admin/settings.
// Repli sur DEFAULT_DAILY_LIMIT si la table "settings" n'existe pas encore ou est vide.
export async function getDailyLimit(env) {
  try {
    const row = await env.DB.prepare(
      "SELECT value FROM settings WHERE key = 'ranked_daily_limit'"
    ).first();
    if (row) {
      const n = parseInt(row.value, 10);
      if (!Number.isNaN(n) && n > 0) return n;
    }
  } catch (e) { /* table absente -> valeur par defaut */ }
  return DEFAULT_DAILY_LIMIT;
}
