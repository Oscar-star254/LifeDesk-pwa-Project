# LifeDesk

## Stack
React 19, TypeScript, Vite 8, Tailwind CSS 4, a local-first data layer, and a service worker. This static-first architecture is simple to deploy and ready for a secure REST backend.

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
```

## Run
```bash
pnpm install
pnpm dev
```
Figma Make already runs the development server. Submit the prefilled demo login to explore seeded data.

## Production
```bash
pnpm build
pnpm preview
```
Deploy `dist/` to any HTTPS static host with SPA fallback. For production multi-user auth, connect `/api/*` to a server with Argon2id hashes, secure HTTP-only sessions, CSRF protection, rate limiting, per-user authorization, and validated object-storage uploads. Failed API writes are queued by the service worker.

Place final transparent mascot artwork at `public/assets/hero-mascot.png`; the built-in CSS panda remains as a fallback.
