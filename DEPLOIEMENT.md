# Rendre le classement mondial — Cloudflare Pages + D1.

Ce dossier contient tout ce qu'il faut :

```
cloudflare-deploy/
├── index.html                     ← le jeu (identique à quiz-drapeaux.html)
├── functions/api/leaderboard.js   ← l'API serverless (Pages Function)
└── schema.sql                     ← le schéma de la base D1
```

Le jeu essaie d'abord d'appeler `/api/leaderboard`. Si l'API répond, le
classement est mondial (partagé entre tous les visiteurs). Si elle ne
répond pas (site pas encore déployé, test en local, aperçu Claude), le
jeu bascule automatiquement sur un classement local à l'appareil — rien
ne casse, dans les deux cas.

## Étapes

### 1. Installer Wrangler (CLI Cloudflare)

```bash
npm install -g wrangler
wrangler login
```

### 2. Créer la base D1

```bash
wrangler d1 create flags-quiz-db
```

Cette commande affiche un `database_id` — note-le, il servira à l'étape 4.

### 3. Créer la table

```bash
wrangler d1 execute flags-quiz-db --remote --file=./schema.sql
```

(Sans `--remote`, la commande crée la table seulement en local pour les tests.)

### 4. Déployer le site sur Cloudflare Pages

Deux façons de faire, au choix :

**A. Via Git (recommandé)** — connecte ton repo GitHub/GitLab contenant ce
dossier à un projet Cloudflare Pages depuis le dashboard
(pages.cloudflare.com → Create a project → Connect to Git). Cloudflare
détecte automatiquement le dossier `functions/` et déploie l'API avec le
site à chaque push.

**B. Via la CLI, sans Git** :

```bash
wrangler pages deploy ./cloudflare-deploy --project-name=flags-quiz
```

### 5. Lier la base D1 au projet Pages

C'est l'étape qui rend l'API fonctionnelle — sans elle, `/api/leaderboard`
renverra une erreur 500 (le jeu continuera de marcher en mode local).

Dans le dashboard Cloudflare :
`Workers & Pages → flags-quiz → Settings → Functions → D1 database bindings`
→ **Add binding**
- Variable name : `DB` (doit correspondre exactement à `env.DB` dans le code)
- D1 database : `flags-quiz-db`

Puis redéploie une fois (un nouveau commit/push, ou `wrangler pages deploy`
à nouveau) pour que le binding soit pris en compte.

### 6. Vérifier

Ouvre `https://ton-projet.pages.dev/api/leaderboard` dans le navigateur :
tu dois voir `{"ok":true,"entries":[]}`. Si tu vois une erreur, vérifie le
binding D1 (étape 5) et que la table existe bien (étape 3, avec `--remote`).

## ⚠️ Tu as déjà une base D1 qui fonctionne ?

Ne relance pas `schema.sql` (il ne modifie pas une table déjà créée).
Exécute plutôt la migration, une seule fois, pour ajouter les colonnes
`points` et `flag_count` sans perdre les scores déjà enregistrés :

```bash
wrangler d1 execute flags-quiz-db --remote --file=./migration_v2.sql
```

Puis redéploie le site (nouveau push, ou `wrangler pages deploy` à nouveau)
pour que `index.html` et `functions/api/leaderboard.js` mis à jour prennent
effet.

## Notes

- Le pseudo reste stocké localement sur chaque appareil (comme un "nom
  mémorisé"), seul le classement des scores est mondial.
- Le classement garde tous les scores enregistrés ; adapte la requête SQL
  dans `leaderboard.js` (`LIMIT`, filtres par date, etc.) si tu veux le
  limiter ou le nettoyer périodiquement.
- Pour éviter les scores farfelus envoyés depuis la console du navigateur,
  la fonction fait déjà une validation basique (bornes numériques,
  score ≤ total). Pour aller plus loin, tu peux ajouter du rate limiting
  via les règles Cloudflare (dashboard → Security → WAF) ou un Turnstile
  côté client.
