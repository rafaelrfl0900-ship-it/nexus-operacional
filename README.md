# NEXUS OPERACIONAL

NEXUS OPERACIONAL is a web command center that transforms the legacy Excel workbook into a permanent industrial operations platform.

It includes production P1/P2, losses, overweight, downtime, productivity, weeks, historical archive, dashboards, reports, meeting mode, audit, imports and backups.

## Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS, ECharts, TanStack-ready structure.
- Backend: NestJS, TypeScript, Prisma, PostgreSQL, JWT auth and RBAC guards.
- Data: PostgreSQL, Prisma schema and migrations.
- Legacy import: Python scripts with safe XLSX inspection and cleaning.
- Quality: Vitest unit/integration tests and Playwright E2E.
- Infra: Docker Compose for Postgres, API and Web.

JavaScript is used only as runtime. TypeScript is the project language. Python is only for import, cleaning and migration helpers. Java, C# and C are intentionally not used.

## Local setup on Windows

PowerShell may block `npm.ps1`; use `npm.cmd`.

```powershell
cd .\nexus-operacional
npm.cmd install
Copy-Item .env.example .env
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
npm.cmd run prisma:seed
npm.cmd run dev
```

If Docker is installed:

```powershell
docker compose up -d --build
```

### Deploy with Docker Compose

Create a local `.env` from the example and update secrets and public URLs:

```powershell
copy .env.example .env
```

Edit `.env` and set:
- `POSTGRES_PASSWORD`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `WEB_ORIGIN` to your public frontend URL
- `NEXT_PUBLIC_API_URL` to your public API URL
- `DATABASE_URL` to point to your production database

Then start the stack:

```powershell
docker compose up -d --build
```

Apply Prisma migrations and seed data:

```powershell
docker compose exec api npx prisma migrate deploy
docker compose exec api npm run prisma:seed
```

If you need a lightweight production deployment on the same host, you can keep using the same `docker-compose.yml` with the production values in `.env`.

## Public deployment

The repository now includes a GitHub Actions workflow that builds the frontend statically on every push to `main`.

- Frontend build: `npm run build --workspace=@nexus/web`
- Pages artifact: `apps/web/out`

When GitHub Pages is enabled for this repository, the frontend will be published at:

```text
https://rafaelrfl0900-ship-it.github.io/nexus-operacional/
```

> Note: this GitHub Pages deployment publishes the frontend only. The full API/backend still needs a public host or Docker Compose server deployment.

For a full production deployment with API + PostgreSQL, host the repository on a server or a managed platform such as Render, Railway or a VPS, then use the current `docker-compose.yml` and `.env` values.

See `docs/production-deploy.md` for a step-by-step production deployment guide.

## Important URLs

- Web: `http://localhost:3000`
- API: `http://localhost:3333/api`
- Health: `http://localhost:3333/api/health`

## Initial admin

- Email: `admin@nexus.local`
- Password: `ChangeMe!2026`

Change the password before real company use.

## Legacy workbook import

The scripts tolerate invalid cells and formula errors such as `#N/A`, `#REF!`, `#DIV/0!` and `#VALUE!`.

```powershell
$xlsx = Get-ChildItem $env:USERPROFILE\Downloads -Filter '*MAIO*2026*(9).xlsx' | Select-Object -First 1 -ExpandProperty FullName
npm.cmd run import:excel -- --file $xlsx --report import-report.json
npm.cmd run migrate:legacy -- --report import-report.json
```

The importer now emits `legacyData.products`, a normalized product catalog merged from `Pacotes-caixas` and `Banco de Dados Pesagen`. In the supplied workbook it currently identifies 87 product/config rows and flags the known duplicated weighing codes `70974`, `73735`, `76379` and `76678`.

## Project structure

```txt
nexus-operacional/
  apps/
    api/   NestJS API
    web/   Next.js application
  prisma/  schema, migrations and seed
  scripts/ Excel import/clean/migration helpers
  tests/   unit, integration and e2e tests
  docs/    calculation rules and operational notes
```

## Acceptance coverage

Implemented foundation:

- P1/P2 production forms and backend calculation service.
- Protected yield and overweight calculation.
- Losses, downtime, productivity, goals, reports, presentations, audit, imports and backups modules.
- Weekly period model with close/reopen/archive actions.
- Permanent historical model with soft delete fields and audit logs.
- Dashboard with KPIs and ECharts visualizations.
- Python workbook inspection and safe data cleaning.
- Normalized product extraction from the workbook, with import errors ready for `import_errors`.
- JWT guard and RBAC metadata on protected API routes.
- Login screen connected to `/api/auth/login`.
- P1/P2 form calculation preview connected to `/api/production/preview`.
- Unit tests for production and downtime calculation.
- Unit tests for auth/RBAC guards.

Next production hardening:

- Run Prisma migrations against a live PostgreSQL instance.
- Import the full workbook rows into normalized tables.
- Add PDF/XLSX generation workers.
- Connect frontend forms to authenticated API mutations after the first real product/week IDs exist in PostgreSQL.
