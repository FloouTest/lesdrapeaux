// Cloudflare Pages Function — POST /api/ranked
// Enregistre une partie du mode classé (format fixe : Monde entier / 20 drapeaux / Saisie libre).
// Système de ligues à promotion : 13 paliers (Explorateur 3 -> ... -> Vexillologue Suprême),
// 100 FP (Flags Points) requis pour passer au palier suivant. Limite de 5 parties classées
// par jour (au-delà, la partie ne rapporte aucun FP). Bonus de série (1-5 FP) pour les
// parties consécutives à 80%+ de bonnes réponses.
// Aucune vérification anti-triche : le score envoyé par le client est accepté tel quel.
//
// Nécessite une base D1 liée à ce projet Pages sous le nom de binding "DB"
// avec la table "players" mise à jour (voir migration_v4_ranked_leagues.sql).

const RANKED_MAX_DIVISION = 12; // index de "Vexillologue Suprême" (13 paliers, de 0 à 12)
const RANKED_DAILY_LIMIT = 5;
const RANKED_POINTS_PER_LEAGUE = 100;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function clampInt(value, min, max) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

function computeFpGain(score, total, streak) {
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

function applyRankedGain(division, points, gained) {
  let d = division;
  let p = points + gained;
  while (p >= RANKED_POINTS_PER_LEAGUE && d < RANKED_MAX_DIVISION) {
    p -= RANKED_POINTS_PER_LEAGUE;
    d += 1;
  }
  return { division: d, points: p };
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const pseudo = String(body.pseudo ?? "Joueur").trim().slice(0, 20) || "Joueur";
    const score = clampInt(body.score, 0, 20);
    const total = clampInt(body.total, 1, 20);
    const today = todayKey();

    let row = await env.DB.prepare(
      "SELECT division, points, streak, games_played, games_today, games_today_date FROM players WHERE pseudo = ?"
    ).bind(pseudo).first();

    if (!row) {
      row = { division: 0, points: 0, streak: 0, games_played: 0, games_today: 0, games_today_date: today };
    }

    let gamesToday = row.games_today_date === today ? row.games_today : 0;

    if (gamesToday >= RANKED_DAILY_LIMIT) {
      // Limite quotidienne atteinte : partie jouable mais aucun FP, aucun changement d'etat.
      await env.DB.prepare(
        `INSERT INTO players (pseudo, division, points, streak, games_played, games_today, games_today_date, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(pseudo) DO UPDATE SET
           games_today = excluded.games_today,
           games_today_date = excluded.games_today_date,
           updated_at = datetime('now')`
      ).bind(pseudo, row.division, row.points, row.streak, row.games_played, gamesToday, today).run();

      return jsonResponse({
        ok: true, base: 0, bonus: 0, gained: 0,
        division: row.division, points: row.points, streak: row.streak,
        dailyLimitReached: true, gamesToday,
      });
    }

    const fp = computeFpGain(score, total, row.streak);
    const applied = applyRankedGain(row.division, row.points, fp.gained);
    gamesToday += 1;
    const gamesPlayed = row.games_played + 1;

    await env.DB.prepare(
      `INSERT INTO players (pseudo, division, points, streak, games_played, games_today, games_today_date, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(pseudo) DO UPDATE SET
         division = excluded.division,
         points = excluded.points,
         streak = excluded.streak,
         games_played = excluded.games_played,
         games_today = excluded.games_today,
         games_today_date = excluded.games_today_date,
         updated_at = datetime('now')`
    ).bind(pseudo, applied.division, applied.points, fp.newStreak, gamesPlayed, gamesToday, today).run();

    return jsonResponse({
      ok: true, base: fp.base, bonus: fp.bonus, gained: fp.gained,
      division: applied.division, points: applied.points, streak: fp.newStreak,
      dailyLimitReached: false, gamesToday,
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: "Erreur lors de l'enregistrement de la partie classée." }, 500);
  }
}
