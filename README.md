# Arcana Pack — Frontend

Vue 3 + Vite + Pinia. Parle au backend Express sur `http://localhost:3001`.

```bash
npm install
cp .env.example .env
npm run dev          # http://localhost:5173
```

Compte admin (créé par `npm run db:init` côté back) :

- `admin@arcana.local` / `password`

Le catalogue est vide : univers, cartes et boosters se créent depuis l’admin.

## Docker

Nginx sert le build Vite. L’URL de l’API est figée au build (`VITE_API_BASE`).

```bash
docker build \
  --build-arg VITE_API_BASE=https://arcana-back.inelli-prog.com/api \
  -t villaroyakevin/arcana-pack-front:latest .
docker push villaroyakevin/arcana-pack-front:latest
```

Kubernetes manifests live in `Arcana-Cards/infra` (`arcana/`).
