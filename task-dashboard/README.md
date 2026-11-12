# TaskFlow — Senior Angular Task Management Dashboard

Production-style Angular 21 dashboard for the senior frontend assignment: CRUD tasks, filters/search, stats, Chart.js analytics, activity feed, assignees, and optional drag-and-drop status changes.

## Quick start

```bash
# from repo root
node data-fetching/generate-data.js

cd task-dashboard
npm install
npm run dev
```

- App: http://localhost:4200  
- Mock API: http://localhost:3000  

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | API + Angular together |
| `npm start` | Angular only |
| `npm run api` | Mock API only |
| `npm run data:generate` | Refresh JSON + `db.json` |
| `npm test` | Unit tests (Vitest via Angular) |
| `npm run lint` | ESLint |
| `npm run build` | Production build |
| `npm run ci` | Lint + coverage tests + build |

## Architecture

See also the repo-root [`IMPLEMENTATION.md`](../IMPLEMENTATION.md) for detailed design decisions and evaluation mapping.

- **Standalone components** with **OnPush** change detection
- **Smart/presentational** split: `Dashboard` / `Users` orchestrate; cards, filters, charts stay dumb
- **Signals** + `httpResource` for reactive reads; `HttpClient` for mutations
- **Lazy-loaded** feature routes (`dashboard`, `analytics`, `users`)
- **Responsive shell**: desktop sidebar; mobile hamburger drawer
- **Reactive forms** with custom validators (`title`, `dueDate`, `tags`)
- **HTTP interceptors**: GET cache + retry with backoff
- **CDK drag-and-drop** for column reorder / status changes

```
src/app/
  core/          models, services, interceptors, validators
  shared/        presentational UI (cards, charts, dialogs)
  features/      dashboard, tasks, users
  layout/        shell navigation
```

## API

Custom Node mock API (`mock-api/server.mjs`) shaped like the assignment responses:

- `GET /tasks-response` → `{ tasks, meta }`
- `GET /statistics-response` → `{ statistics, lastUpdated }`
- `GET /assignees`, `GET /activity`
- `POST|PATCH|DELETE /tasks/:id`, `PUT /tasks-reorder`

## Testing strategy

- Service unit tests with `HttpTestingController`
- Validator and store signal tests
- Component tests for dialogs / presentational cards
- Run `npm test` (and `npm run test:coverage` when coverage reporters are configured)

## Performance

- OnPush everywhere
- Lazy routes / code splitting
- `track` functions in `@for`
- GET response caching interceptor
- Chart instances destroyed on teardown

## Tooling / CI gates

- ESLint (`angular-eslint`) + Prettier
- Husky + lint-staged on pre-commit
- GitHub Actions CI (repo root `.github/workflows/ci.yml`):
  - lint, unit tests, **i18n parity**, content-a11y, production build
  - Playwright + **axe WCAG 2.1 AA** (critical + serious)
  - **Lighthouse** median score **> 90** (performance + accessibility)
  - **Docker Compose** build + smoke (`:8080` web, `:3000` API)
- GitHub Actions Deploy to GitHub Pages (`.github/workflows/deploy.yml`)
- Docker + docker-compose (web on `:8080`, API on `:3000`)

```bash
docker compose up --build
```


### Internationalization

EN/AR catalogs live under `src/app/core/i18n/`. The top-bar language chip toggles locale + `dir`/`lang` on `<html>`. CI fails if catalogs drift (`npm run test:i18n`).

### GitHub Pages deploy

1. Repo **Settings → Pages → Source**: GitHub Actions
2. Push to `main` (or run the **Deploy** workflow manually)
3. Live app: `https://<user>.github.io/senior-frontend-test/`

Production builds use `public/mock-db.json` + a static mock HTTP interceptor so the demo works without a Node API.

## Environment

| Variable | Default | Notes |
|----------|---------|-------|
| `apiUrl` | `http://localhost:3000` | `src/environments/environment*.ts` |
| `API_PORT` | `3000` | mock API |
| `DATA_DIR` | `../data-fetching` | override for Docker |

## Known limitations / next steps

- Statistics from the seed file are illustrative; live counts also derive from tasks after mutations
- No auth / multi-tenant roles
- Drag-and-drop reorder persists via a custom endpoint (not standard JSON Server)
## Design

Figma: [senior-frontend](https://www.figma.com/design/inRRwrw0RP3v5eIXVx6grq/senior---frontend)

The dashboard chrome matches the Figma **over-view** frame: Task Manager top bar + sidebar, four stat cards, status tabs / priority filter / New Task, and a three-column Kanban with priority badges and overdue tinting. Charts and activity sit below the board to satisfy assignment analytics requirements while keeping the primary viewport Figma-faithful.
