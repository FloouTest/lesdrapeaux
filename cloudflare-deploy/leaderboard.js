// Cloudflare Pages Function — /api/leaderboard
// GET  : renvoie le top 50 du classement (filtrable par ?continent=Afrique)
// POST : enregistre un nouveau score
//
// Nécessite une base D1 liée à ce projet Pages sous le nom de binding "DB".
// Voir les instructions de déploiement fournies séparément.

const MAX_LIMIT = 50;
const ALLOWED_MODES = new Set(["qcm", "saisie"]);

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const continent = url.searchParams.get("continent");

    let query =
      "SELECT pseudo, continent, mode, score, total, mistakes, seconds, created_at FROM leaderboard";
    const params = [];

    if (continent && continent !== "Tous") {
      query += " WHERE continent = ?";
      params.push(continent);
    }

    // Classement par précision (score/total) décroissante puis par rapidité croissante
    query += " ORDER BY (CAST(score AS REAL) / total) DESC, seconds ASC LIMIT ?";
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

    if (!continent) {
      return jsonResponse({ ok: false, error: "Catégorie manquante." }, 400);
    }
    if (score > total) {
      return jsonResponse({ ok: false, error: "Score incohérent." }, 400);
    }

    await env.DB.prepare(
      `INSERT INTO leaderboard (pseudo, continent, mode, score, total, mistakes, seconds)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(pseudo, continent, mode, score, total, mistakes, seconds)
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
