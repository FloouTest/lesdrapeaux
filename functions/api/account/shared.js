// Fonctions partagées entre les routes /api/account/* — pas de prefixe "_" (voir note plus
// bas), pour rester importable par les fichiers voisins dans le bundle Cloudflare Pages.
//
// Hachage de mot de passe avec PBKDF2-SHA256 (Web Crypto, natif dans les Workers), sel
// aléatoire par compte. Rien n'est jamais stocké en clair.

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

function bufToHex(buf) {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function hexToBuf(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

export function randomSaltHex() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bufToHex(bytes);
}

export async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: hexToBuf(saltHex), iterations: 100000, hash: "SHA-256" },
    keyMaterial, 256
  );
  return bufToHex(derived);
}

export async function verifyPassword(password, saltHex, expectedHashHex) {
  const computed = await hashPassword(password, saltHex);
  if (computed.length !== expectedHashHex.length) return false;
  // Comparaison en temps constant (evite les attaques par mesure de timing)
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ expectedHashHex.charCodeAt(i);
  }
  return diff === 0;
}

export function normalizePseudo(raw) {
  return String(raw ?? "").trim().slice(0, 20);
}
