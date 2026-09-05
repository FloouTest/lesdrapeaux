# Atlas des Drapeaux

Application React/Vite de quiz géographique en français.

## Développement

```bash
npm install
npm run dev
npm test
npm run build
```

En développement, Vite transmet par défaut les routes `/api/*` à `https://lesdrapeaux.pages.dev`. Les classements, l’historique, le mode classé et Versus utilisent donc l’API de production — y compris sa base D1.

Pour utiliser un autre serveur Pages Functions :

```bash
VITE_API_PROXY=http://127.0.0.1:8788 npm run dev
```

Le proxy reçoit une origine (`scheme://host[:port]`) et conserve le chemin `/api/*`.

## Architecture

- `src/App.jsx` — navigation et écrans React
- `src/data/countries.js` et `capitals.js` — données importées (aucune globale navigateur)
- `src/game.js` — comparaison des réponses et utilitaires
- `src/styles/` — tokens, styles globaux, composants et fonctionnalités
- `functions/` — API Cloudflare Pages (hors frontend)
- `admin.html` — interface d'administration, entrée Vite indépendante

La production émet `index.html`, les assets React et `admin.html` dans `dist/`.
