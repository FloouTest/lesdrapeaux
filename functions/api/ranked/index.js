// Cloudflare Pages Function — POST /api/ranked
// Enregistre une partie du mode classé (format fixe : Monde entier / 20 drapeaux / Saisie libre).
// Système de ligues à promotion : 13 paliers (Explorateur 3 -> ... -> Vexillologue Suprême),
// 100 FP (Flags Points) requis pour passer au palier suivant. La limite quotidienne de parties
// classées est réglable par l'admin (voir /api/admin/settings), 5 par défaut. Au-delà, la partie
// ne rapporte aucun FP. Bonus de série (1-5 FP) pour les parties consécutives à 80%+ de bonnes
// réponses.
// Aucune vérification anti-triche : le score envoyé par le client est accepté tel quel.
//
// Nécessite une base D1 liée à ce projet Pages sous le nom de binding "DB"
// avec la table "players" à jour (voir migration_v4_ranked_leagues*.sql).

import { jsonResponse, clampInt, todayKey, computeFpGain, applyRankedGain, getDailyLimit } from "./_shared.js";

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const pseudo = String(body.pseudo ?? "Joueur").trim().slice(0, 20) || "Joueur";
    const score = clampInt(body.score, 0, 20);
    const total = clampInt(body.total, 1, 20);
    const today = todayKey();
    const dailyLimit = await getDailyLimit(env);

    let row = await env.DB.prepare(
      "SELECT division, points, streak, games_played, games_today, games_today_date FROM players WHERE pseudo = ?"
    ).bind(pseudo).first();

    if (!row) {
      row = { division: 0, points: 0, streak: 0, games_played: 0, games_today: 0, games_today_date: today };
    }

    let gamesToday = row.games_today_date === today ? row.games_today : 0;

    if (gamesToday >= dailyLimit) {
      // Limite quotidienne atteinte : partie jouable mais aucun FP, aucun changement d'etat.
      await env.DB.prepare(
        `INSERT INTO players (pseudo, division, points, streak, games_played, games_today, games_today_date, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(pseudo) DO UPDATE SET
           games_today = excluded.games_today,
           games_today_date = excluded.games_today_date,
           updated_at = datetime('now')`
      ).bind(pseudo, row.division, row.points, row.streak, row.games_played, gamesToday, today).run();

      await env.DB.prepare(
        `INSERT INTO ranked_history (pseudo, score, total, gained, division_after, points_after, daily_limit_reached)
         VALUES (?, ?, ?, 0, ?, ?, 1)`
      ).bind(pseudo, score, total, row.division, row.points).run();

      return jsonResponse({
        ok: true, base: 0, bonus: 0, gained: 0,
        division: row.division, points: row.points, streak: row.streak,
        dailyLimitReached: true, gamesToday, dailyLimit,
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

    await env.DB.prepare(
      `INSERT INTO ranked_history (pseudo, score, total, gained, division_after, points_after, daily_limit_reached)
       VALUES (?, ?, ?, ?, ?, ?, 0)`
    ).bind(pseudo, score, total, fp.gained, applied.division, applied.points).run();

    return jsonResponse({
      ok: true, base: fp.base, bonus: fp.bonus, gained: fp.gained,
      division: applied.division, points: applied.points, streak: fp.newStreak,
      dailyLimitReached: false, gamesToday, dailyLimit,
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: "Erreur lors de l'enregistrement de la partie classée." }, 500);
  }
}
