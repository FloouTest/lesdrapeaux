// Fonctions partagées entre les routes /api/admin/*
// (fichier non routé : Cloudflare Pages ignore les chemins commençant par "_")
//
// L'authentification repose sur deux variables d'environnement à définir dans le
// dashboard Cloudflare (Workers & Pages -> ton projet -> Settings -> Environment
// variables), de préférence en tant que "Secret" :
//   ADMIN_USER     = admin
//   ADMIN_PASSWORD = (mot de passe, jamais écrit dans le code source)
//
// Le mot de passe n'est jamais stocké dans les fichiers du dépôt : il est saisi par
// l'administrateur dans admin.html et comparé ici, côté serveur, à la valeur secrète.

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export function isAuthorized(request, env) {
  const user = request.headers.get("X-Admin-User") || "";
  const pass = request.headers.get("X-Admin-Password") || "";
  if (!env.ADMIN_USER || !env.ADMIN_PASSWORD) return false;
  return user === env.ADMIN_USER && pass === env.ADMIN_PASSWORD;
}

export function unauthorized() {
  return jsonResponse({ ok: false, error: "Identifiants invalides." }, 401);
}
