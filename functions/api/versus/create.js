import { code as makeCode, token, cleanPseudo, ensureTables, json, normalize, VERSUS_CATEGORIES, VERSUS_CONTINENTS } from "./_shared.js";

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const pseudo = cleanPseudo(body.pseudo);
    const maxPlayers = Number(body.maxPlayers ?? 2);
    const category = body.category ?? "flags", continent = body.continent ?? "Monde entier";
    const answerMode = body.answerMode ?? "free";
    const flags = Array.isArray(body.flags) ? body.flags : null;
    if (!Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 8)
      return json({ ok: false, error: "Le nombre de joueurs doit être compris entre 2 et 8." }, 400);
    if (!VERSUS_CATEGORIES.includes(category)) return json({ ok: false, error: "Catégorie invalide." }, 400);
    if (!VERSUS_CONTINENTS.includes(continent)) return json({ ok: false, error: "Continent invalide." }, 400);
    if (!["free", "mcq"].includes(answerMode)) return json({ ok: false, error: "Mode de réponse invalide." }, 400);
    if (!flags || flags.length < 5 || flags.length > 100 || !flags.every(flag => validQuestion(flag, category, answerMode)))
      return json({ ok: false, error: "Liste de questions invalide." }, 400);
    await ensureTables(env.DB);
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = makeCode();
      const playerToken = token();
      try {
        await env.DB.batch([
          env.DB.prepare("INSERT INTO versus_rooms (code, host_token, flags, max_players) VALUES (?, ?, ?, ?)").bind(code, playerToken, JSON.stringify(flags), maxPlayers),
          env.DB.prepare("INSERT INTO versus_players (room_code, slot, token, pseudo) VALUES (?, 1, ?, ?)").bind(code, playerToken, pseudo),
          env.DB.prepare("INSERT INTO versus_room_settings (room_code, category, continent) VALUES (?, ?, ?)").bind(code, category, continent),
          env.DB.prepare("INSERT INTO versus_room_options (room_code, answer_mode) VALUES (?, ?)").bind(code, answerMode),
        ]);
        return json({ ok: true, code, token: playerToken, role: "p1", playerId: 1, maxPlayers, category, continent, answerMode });
      } catch (error) { if (attempt === 7) throw error; }
    }
  } catch (error) { return json({ ok: false, error: "Erreur lors de la création du salon." }, 500); }
}

function nonEmptyString(value) { return typeof value === "string" && value.trim().length > 0; }
function validQuestion(question, category, answerMode) {
  if (answerMode === "free" && category === "flags" && Array.isArray(question))
    return question.length === 2 && question.every(nonEmptyString);
  if (!question || Array.isArray(question) || typeof question !== "object" || !nonEmptyString(question.answer)) return false;
  if (category === "flags" ? !nonEmptyString(question.image) : !nonEmptyString(question.prompt)) return false;
  if (question.aliases !== undefined && (!Array.isArray(question.aliases) || !question.aliases.every(nonEmptyString))) return false;
  if (answerMode === "free") return true;
  if (!Array.isArray(question.choices) || question.choices.length !== 4 || !question.choices.every(nonEmptyString)) return false;
  const normalizedChoices = question.choices.map(normalize);
  return new Set(normalizedChoices).size === 4 && normalizedChoices.includes(normalize(question.answer));
}
