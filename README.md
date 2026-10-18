# LifeDesk

## Stack
React 19, TypeScript, Vite 8, Tailwind CSS 4, Node.js HTTP APIs, SQLite, Argon2id, and a service worker. The UI remains usable with seeded local data while the same-origin API provides production authentication and isolated finance storage.

## Structure
```text
public/
  icons/                 PWA icons
  manifest.webmanifest   install metadata
  sw.js                  offline shell and write queue
src/
  App.tsx                auth, shell, finance, academics, schedule, goals
  index.css              design system and responsive layouts
  main.tsx               entry point
server/
  database.mjs           SQLite migrations and transaction helper
  domain.mjs             validation and finance split rules
  index.mjs              secure auth and finance REST API
tests/
  domain.test.mjs        auth validation and finance logic tests
```

## Run
```bash
pnpm install
pnpm dev
```
Figma Make already runs the development server. Submit the prefilled demo login to explore seeded data.

To run the API separately outside Figma Make:

```bash
cp .env.example .env
pnpm api
```

## Production
```bash
pnpm build
pnpm preview
```
Deploy `dist/` with the Node API behind the same HTTPS origin. The API includes Argon2id password hashes, expiring secure HTTP-only sessions, email verification/reset tokens, CSRF protection, rate limiting, input validation, SQLite migrations, atomic transactions, and per-user query isolation. Failed API writes are queued by the service worker. Set `NODE_ENV=production`, `APP_ORIGIN`, and `DATABASE_PATH` in the host environment.

Run the automated domain checks with:

```bash
pnpm test
```

Place final transparent mascot artwork at `public/assets/hero-mascot.png`; the built-in CSS panda remains as a fallback.
