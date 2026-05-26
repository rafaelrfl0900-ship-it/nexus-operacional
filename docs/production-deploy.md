# Deploy de producao

Este projeto suporta dois modelos de publicacao:

- Frontend estatico no GitHub Pages.
- Aplicacao completa em Docker Compose, com Web, API, PostgreSQL e volume de backups.

## GitHub Pages

O workflow `.github/workflows/pages.yml` ficou restrito a acionamento manual e deve ser usado somente como demonstracao publica sem dados reais.

Etapas executadas no CI:

- `npm install`
- `npm run prisma:generate`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build` em `apps/web`
- upload de `apps/web/out`

URL esperada:

```text
https://rafaelrfl0900-ship-it.github.io/nexus-operacional/
```

Esse modo publica somente o frontend e nao e o deploy operacional. Para login real, importacao, backups e banco de dados, use o deploy completo protegido com API e PostgreSQL.

## Docker Compose completo

1. Crie um `.env` a partir de `.env.example`.
2. Troque os segredos antes de usar em producao:

- `POSTGRES_PASSWORD`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `WEB_ORIGIN`
- `NEXT_PUBLIC_API_URL`
- `DATABASE_URL`
- `BACKUP_DIR`

3. Suba os servicos:

```bash
docker compose up -d --build
```

4. Aplique migrations e seed:

```bash
docker compose exec api npx prisma migrate deploy
docker compose exec api npm run prisma:seed
```

## URLs

- Web: `http://localhost:3000/nexus-operacional/`
- API: `http://localhost:3333/api`
- Health API: `http://localhost:3333/api/health`
- Health Web: `http://localhost:3000/health`

## Backups

O Compose monta o volume `nexus-backups` em `/app/backups` na API. O endpoint de backups usa `BACKUP_DIR` e registra cada snapshot na tabela `backups`, com tamanho e checksum.

## Dominio

Para usar dominio proprio, coloque um proxy reverso como Caddy, Nginx ou Traefik na frente dos servicos:

- Direcione o frontend para o container `web` na porta `3000`.
- Direcione a API para o container `api` na porta `3333`.
- Configure `WEB_ORIGIN` com a origem publica do frontend.
- Configure `NEXT_PUBLIC_API_URL` com a URL publica da API.
