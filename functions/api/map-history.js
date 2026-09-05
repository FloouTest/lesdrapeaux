function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

function clampInt(value, min, max) {
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number)) return min;
  return Math.max(min, Math.min(max, number));
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const pseudo =
      String(body.pseudo ?? "Joueur")
        .trim()
        .slice(0, 20) || "Joueur";
    const promptMode = body.promptMode === "capital" ? "capital" : "country";
    const score = clampInt(body.score, 0, 10000);
    const total = clampInt(body.total, 1, 10000);
    const attempts = clampInt(body.attempts, total, total * 6);
    const seconds = clampInt(body.seconds, 0, 36000);
    const details = Array.isArray(body.details)
      ? JSON.stringify(body.details.slice(0, 30)).slice(0, 8000)
      : null;

    if (score > total) {
      return jsonResponse({ ok: false, error: "Score incohérent." }, 400);
    }

    await env.DB.prepare(
      `INSERT INTO map_history (pseudo, prompt_mode, score, total, attempts, seconds, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(pseudo, promptMode, score, total, attempts, seconds, details)
      .run();

    return jsonResponse({ ok: true });
  } catch {
    return jsonResponse(
      { ok: false, error: "Erreur lors de l'enregistrement de la partie." },
      500,
    );
  }
}
