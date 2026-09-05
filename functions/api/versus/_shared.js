const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const VERSUS_CATEGORIES = ["flags", "capitals", "map"];
export const VERSUS_CONTINENTS = [
  "Monde entier",
  "Afrique",
  "Europe",
  "Asie",
  "Amérique",
  "Océanie",
];

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

export function cleanCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .slice(0, 10);
}
export function cleanPseudo(value) {
  return (
    String(value || "Joueur")
      .trim()
      .slice(0, 20) || "Joueur"
  );
}
export function token() {
  return crypto.randomUUID() + crypto.randomUUID();
}
export function code() {
  let value = "";
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  for (const byte of bytes) value += CODE_CHARS[byte % CODE_CHARS.length];
  return value;
}

export async function ensureTables(db) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS versus_rooms (
    code TEXT PRIMARY KEY, host_token TEXT NOT NULL, flags TEXT NOT NULL,
    max_players INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'waiting', winner TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
    )
    .run();
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS versus_players (
    room_code TEXT NOT NULL, slot INTEGER NOT NULL, token TEXT NOT NULL UNIQUE,
    pseudo TEXT NOT NULL, hp INTEGER NOT NULL DEFAULT 1000, question_index INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (room_code, slot), UNIQUE (room_code, pseudo)
  )`,
    )
    .run();
  // Separate table avoids ALTER TABLE assumptions and keeps existing rooms readable.
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS versus_room_settings (
    room_code TEXT PRIMARY KEY, category TEXT NOT NULL, continent TEXT NOT NULL
  )`,
    )
    .run();
  // Kept separate so deployments with the original settings table need no ALTER.
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS versus_room_options (
    room_code TEXT PRIMARY KEY, answer_mode TEXT NOT NULL
  )`,
    )
    .run();
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS versus_map_options (
    room_code TEXT PRIMARY KEY, prompt_mode TEXT NOT NULL DEFAULT 'country',
    first_to_find INTEGER NOT NULL DEFAULT 0
  )`,
    )
    .run();
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS versus_map_progress (
    room_code TEXT NOT NULL, slot INTEGER NOT NULL, question_index INTEGER NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    started_at INTEGER NOT NULL,
    PRIMARY KEY (room_code, slot, question_index)
  )`,
    )
    .run();
}

export async function authenticate(db, roomCode, suppliedToken) {
  if (!suppliedToken) return null;
  return db
    .prepare("SELECT * FROM versus_players WHERE room_code = ? AND token = ?")
    .bind(roomCode, String(suppliedToken))
    .first();
}

export function parseFlags(raw) {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
export function publicFlag(flag, answerMode = "free") {
  if (Array.isArray(flag)) return { image: flag[1] };
  if (flag && typeof flag === "object") {
    const result =
      typeof flag.prompt === "string"
        ? {
            prompt: flag.prompt,
            ...(typeof flag.image === "string" ? { image: flag.image } : {}),
          }
        : { image: flag.image || flag.url || flag.src || null };
    // Choices are public in MCQ mode; answer and aliases always remain private.
    if (answerMode === "mcq" && Array.isArray(flag.choices))
      result.choices = flag.choices;
    return result;
  }
  return { image: null };
}
export function answersFor(flag) {
  if (Array.isArray(flag)) return [flag[0]];
  if (!flag || typeof flag !== "object") return [];
  return [
    flag.answer || flag.name || flag.country,
    ...(Array.isArray(flag.aliases) ? flag.aliases : []),
  ].filter((value) => typeof value === "string" && value.trim());
}
export function answerFor(flag) {
  return answersFor(flag)[0];
}
export function roomSettings(row) {
  return {
    category: VERSUS_CATEGORIES.includes(row.category) ? row.category : "flags",
    continent: row.continent || "Monde entier",
    answerMode: row.answer_mode === "mcq" ? "mcq" : "free",
    mapPromptMode: row.prompt_mode === "capital" ? "capital" : "country",
    firstToFind: Boolean(row.first_to_find),
  };
}
export function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}
