// Cloudflare Pages Function — /api/leaderboard
// GET  : renvoie le top 50 du classement, triable par continent et par
//        nombre de drapeaux (?continent=Afrique&flagCount=10, flagCount=null pour "complet")
// POST : enregistre un nouveau score (avec points calculés côté client)
//
// Nécessite une base D1 liée à ce projet Pages sous le nom de binding "DB".
// Voir DEPLOIEMENT.md et migration_v2.sql si ta base existe déjà.

const MAX_LIMIT = 50;
const ALLOWED_MODES = new Set(["qcm", "saisie"]);
const ALLOWED_FLAG_COUNTS = new Set([10, 20, 30]);

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const continent = url.searchParams.get("continent");
    const flagCountParam = url.searchParams.get("flagCount");

    let query =
      "SELECT pseudo, continent, mode, score, total, mistakes, seconds, points, flag_count AS flagCount, details, created_at " +
      "FROM leaderboard";
    const conditions = [];
    const params = [];

    if (continent && continent !== "Tous") {
      conditions.push("continent = ?");
      params.push(continent);
    }

    if (flagCountParam !== null) {
      if (flagCountParam === "null") {
        conditions.push("flag_count IS NULL");
      } else {
        const n = parseInt(flagCountParam, 10);
        if (ALLOWED_FLAG_COUNTS.has(n)) {
          conditions.push("flag_count = ?");
          params.push(n);
        }
      }
    }

    if (conditions.length) {
      query += " WHERE " + conditions.join(" AND ");
    }

    // Classement par points décroissants puis par rapidité croissante
    query += " ORDER BY points DESC, seconds ASC LIMIT ?";
    params.push(MAX_LIMIT);

    const stmt = env.DB.prepare(query).bind(...params);
    const { results } = await stmt.all();
    return jsonResponse({ ok: true, entries: results });
  } catch (err) {
    return jsonResponse({ ok: false, error: "Erreur lors de la lecture du classement." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();

    const pseudo = String(body.pseudo ?? "Joueur").trim().slice(0, 20) || "Joueur";
    const continent = String(body.continent ?? "").trim().slice(0, 60);
    const mode = ALLOWED_MODES.has(body.mode) ? body.mode : "qcm";
    const score = clampInt(body.score, 0, 1000);
    const total = clampInt(body.total, 1, 1000);
    const mistakes = clampInt(body.mistakes, 0, 1000);
    const seconds = clampInt(body.seconds, 0, 36000);
    const points = clampInt(body.points, 0, 1000000);

    let flagCount = null;
    if (body.flagCount !== null && body.flagCount !== undefined) {
      const n = parseInt(body.flagCount, 10);
      if (ALLOWED_FLAG_COUNTS.has(n)) flagCount = n;
    }

    let details = null;
    if (Array.isArray(body.details)) {
      details = JSON.stringify(body.details.slice(0, 60)).slice(0, 8000);
    }

    if (!continent) {
      return jsonResponse({ ok: false, error: "Catégorie manquante." }, 400);
    }
    if (score > total) {
      return jsonResponse({ ok: false, error: "Score incohérent." }, 400);
    }

    await env.DB.prepare(
      `INSERT INTO leaderboard (pseudo, continent, mode, score, total, mistakes, seconds, points, flag_count, details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(pseudo, continent, mode, score, total, mistakes, seconds, points, flagCount, details)
      .run();

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: "Erreur lors de l'enregistrement du score." }, 500);
  }
}

function clampInt(value, min, max) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}
