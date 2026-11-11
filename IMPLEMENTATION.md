# Implementation Notes

How the Senior Angular Task Management Dashboard was built, and why key choices were made.

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Angular 21 (standalone) | Matches assignment target (20/21.next) |
| UI | Angular Material + CDK | Fast, accessible primitives; CDK covers drag-and-drop |
| Charts | Chart.js (direct) | Assignment allows Chart.js; avoided `ng2-charts` peer conflicts with Angular 21 |
| State (UI) | Signals + `TaskStoreService` | Lightweight reactive filters/selection without NgRx overhead |
| Data reads | `httpResource` | Assignment requires the new HTTP resource API |
| Data writes | `HttpClient` | Mutations stay explicit; resources reload after success |
| Mock API | Custom Node HTTP server | Full control over assignment-shaped payloads (`tasks-response`, etc.) |
| Tests | Vitest via `@angular/build:unit-test` | Default for Angular 21 CLI apps |
| Quality | ESLint + Prettier + Husky | Required code-quality gates |

## Folder layout

```
senior-frontend-test/
├── data-fetching/          # Seed generator from the assignment
├── task-dashboard/         # Angular application
│   ├── mock-api/           # build-db + REST server
│   ├── src/app/
│   │   ├── core/           # models, services, interceptors, validators
│   │   ├── shared/         # presentational components
│   │   ├── features/       # dashboard, tasks, users (lazy)
│   │   └── layout/         # shell / navigation
│   └── ...
├── IMPLEMENTATION.md       # This file
└── SENIOR_ANGULAR_DEVELOPER_ASSIGNMENT.md
```

## Architecture decisions

### 1. Smart / presentational split

- **Smart:** `Dashboard`, `Users` — inject services, open dialogs, run mutations, own loading/error UX.
- **Presentational:** `StatCard`, `TaskCard`, `TaskFilters`, `TaskList`, charts, `ActivityFeed` — `@Input`/`input()` + `output()` only, `OnPush`.

This keeps UI reusable and easy to unit-test in isolation.

### 2. Signals for UI state, resources for server state

- `TaskStoreService` holds filter/search/selection as signals (`computed` for `hasActiveFilters`).
- `TaskService` exposes `httpResource` refs for tasks, statistics, assignees, and activity.
- A private `refreshToken` signal + `reload()` keeps lists fresh after create/update/delete/reorder.

### 3. Mock API shape

Assignment `DATA_README.md` defines wrapped responses. The mock server exposes:

- `GET /tasks-response` → `{ tasks, meta }`
- `GET /statistics-response` → `{ statistics, lastUpdated }`
- `GET /assignees`, `GET /activity`
- `POST /tasks`, `PATCH|DELETE /tasks/:id`
- `PUT /tasks-reorder` (supports board drag-and-drop)

`mock-api/build-db.mjs` merges generated JSON, derives assignees, activity, overdue flags, and maps emoji icons → Material icon names.

### 4. Forms

Reactive `TaskForm` dialog with:

- Custom validators: `titleValidator`, `dueDateValidator`, `tagsValidator`
- Dynamic quick-tag controls (`addQuickTag`) as the “dynamic form controls” requirement
- Explicit touched/error display in the template

### 5. Performance

- `ChangeDetectionStrategy.OnPush` on feature and shared components
- Lazy routes for `dashboard` and `users`
- `@for` track-by via task `id` / status
- GET cache interceptor (cleared on mutations)
- Retry interceptor (GET, exponential backoff)
- Chart.js instances destroyed in `ngOnDestroy`

### 6. Drag and drop

CDK `DragDropModule` board columns (`todo` / `in_progress` / `done`):

- Same-column drop → reorder
- Cross-column drop → status change + reorder persistence via API

### 7. Styling / UX

- Material 3 theme (azure palette)
- Responsive grids for stats, charts, filters, and board columns
- Skeleton loader while resources load
- Confirm dialog before delete; snackbars for mutation feedback
- Light enter/hover transitions on cards

## Testing

| Area | Coverage approach |
|------|-------------------|
| Validators | Pure unit tests |
| Store | Signal filter behavior |
| Cache interceptor | `HttpTestingController` |
| Task service | CRUD + live statistics |
| Components | `StatCard`, `TaskForm`, `App` |

Local CI (`npm run ci`) runs lint → tests with coverage → production build. Target: **≥ 80%** statement/line coverage on exercised modules.

## Tooling & delivery extras

- **Husky + lint-staged** — ESLint/Prettier on commit
- **GitHub Actions** — `.github/workflows/ci.yml` (Node 22)
- **Docker** — `Dockerfile` + `docker-compose.yml` (nginx web + API)
- **README** — setup, architecture, scripts, limitations

## Trade-offs / known limitations

1. Seed statistics are illustrative; after mutations, UI can also derive live counts via `computeLiveStatistics`.
2. No authentication or role model (out of scope).
3. Coverage focuses on core/services/validators/key UI; large templates (dashboard board) remain thinner by design to keep the suite maintainable.
4. Chart.js is used without an Angular wrapper to avoid peer-dependency friction on Angular 21.
5. Desktop Figma is the visual source; mobile/tablet are responsive adaptations of that layout.

## How to run

```bash
node data-fetching/generate-data.js
cd task-dashboard
npm install
npm run dev
```

- App: http://localhost:4200  
- API: http://localhost:3000  

```bash
npm run ci   # lint + coverage tests + build
```

## Mapping to evaluation criteria

| Criterion | Where it shows up |
|-----------|-------------------|
| Technical excellence | Standalone, signals, `httpResource`, OnPush, DI, interceptors, SoC folders |
| Functionality | Full CRUD, filters/search, stats, charts, activity, users, DnD |
| Testing | Vitest unit/component suite + coverage in CI |
| Documentation | README + this IMPLEMENTATION.md + conventional commit history |
