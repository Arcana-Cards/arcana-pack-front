# Anacra Pack — Frontend

Vue 3 + Vite + Pinia. Parle au backend Express sur `http://localhost:3001`.

```bash
npm install
cp .env.example .env
npm run dev          # http://localhost:5173
```

Compte admin (créé par `npm run db:init` côté back) :

- `admin@anacra.local` / `password`

Le catalogue est vide : univers, cartes et boosters se créent depuis l’admin.

## Docker

Nginx sert le build Vite. L’URL de l’API est figée au build (`VITE_API_BASE`).

```bash
docker build \
  --build-arg VITE_API_BASE=https://anacra-back.inelli-prog.com/api \
  -t villaroyakevin/anacra-pack-front:latest .
docker push villaroyakevin/anacra-pack-front:latest
```

Kubernetes manifests live in `Anacra-Cards/infra` (`anacra/`).
