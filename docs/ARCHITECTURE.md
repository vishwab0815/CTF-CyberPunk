# Architecture

## 1. The original project

**Stack:** Next.js 16 (App Router), React 19, Tailwind 4, NextAuth v4 (credentials + JWT), Mongoose 9 / MongoDB.
**Shape:** seven linear, browser-centric puzzle levels. Each level was a page in `app/levels/N` backed by `app/api/levels/N`; `proxy.ts` gated access by level; `/api/submit-flag` compared a submission to a `Flag` document.

**Weaknesses found**

| Area | Problem |
| --- | --- |
| Flag secrecy | Flags were hardcoded in route source, in `scripts/seed-flags.ts`, and in a committed `SOLUTIONS.md`. Anyone with the repo had every answer. |
| Flag uniqueness | One global flag per level, compared case-insensitively. Trivially shareable. |
| Abuse control | Only level 6 had rate limiting; the main submit endpoint had none. |
| Challenge quality | Several levels were solved by reading page source or a click/Konami puzzle, not by security tooling. |
| Coupling | Challenge logic, UI and data were fused per level; adding a challenge meant new pages, routes, models and seed scripts. |
| Operations | Required a MongoDB deployment (plus an Atlas keep-alive workflow) and a manual seed before first use. A DB lookup ran on every session refresh. |

**MongoDB footprint (all removed)**

| Was | Why | Now |
| --- | --- | --- |
| `mongoose` dependency, `lib/mongodb.ts`, `MONGODB_URI` | Connection | `node:sqlite` (built into Node), `lib/server/db.ts` |
| `User`, `Submission`, `LevelProgress` models | Accounts, attempts, progress | `players`, `submissions`, `solves` tables |
| `Flag` model + seed script | Flag storage | Flags live in packs (hashed) or are derived by HMAC; nothing to seed |
| `Employee`, `Level3_1_*` models | Level 6/7 state and the NoSQL-injection level | Removed with their levels |
| NextAuth + DB lookup in JWT callback | Sessions | Opaque session tokens in `sessions` |
| `scripts/*seed*`, `db-keepalive`, `.github/workflows/mongodb-keepalive.yml` | Seeding and Atlas keep-alive | Migrations run automatically; no keep-alive needed |

Dependencies dropped: `mongoose`, `next-auth`, `bcryptjs`, `framer-motion`, `react-hook-form`, `@hookform/resolvers`.

## 2. The new design

```
Browser (React client components)
   │  fetch /api/*  (same-origin, JSON, HttpOnly session cookie)
   ▼
Next.js route handlers ── lib/server/http.ts  (session, CSRF, body limits, error mapping)
   │
   ▼
Services (lib/server/)
   engine.ts     catalog, unlock rules, submit, hints, artifacts, progress
   scoring.ts    values, decay, freeze, scoreboard
   flags.ts      HMAC flags, constant-time check, sharing detection
   players.ts / sessions.ts / crypto.ts
   admin.ts / settings.ts / events.ts / ratelimit.ts
   registry.ts   merges pack challenges + admin-created ones + overrides
   │
   ├── SQLite (DATA_DIR/range.db, WAL)    ← platform state
   └── challenges/<pack>/                  ← challenge definitions + evidence (read-only)
```

**Technology choices**

- **SQLite via `node:sqlite`** — zero install, no native build, one file to back up. Writes are serialized by SQLite; transactions use `BEGIN IMMEDIATE`. Fine for hundreds of concurrent players on one host.
- **Services take an explicit `Ctx`** (db + config + secret). Route handlers get it from a process-wide singleton; tests build an in-memory one. Nothing in the engine touches HTTP.
- **Packs on disk** instead of a database table keeps challenges reviewable in git and lets organisers add content without a deploy. Admin-created "custom" challenges (static flag, no files) cover quick additions.
- **Plain React + Tailwind**, a small design token set in `app/globals.css`, system fonts (no network fetches at build or run time).

**Data model** (`lib/server/db.ts`, migration 1): `players`, `sessions`, `solves`, `submissions`, `hint_unlocks`, `issued_flags`, `events`, `rate_limits`, `settings`, `challenge_overrides`, `custom_challenges`. Migrations are append-only and tracked by `PRAGMA user_version`.

**Scoring.** A challenge's value is its points (static) or decays linearly toward `points × minRatio` over `dynamicDecay` solves (dynamic). A player's score is the sum of the *current* value of their solves minus hints they unlocked, never below 0. Ties break by earliest last solve. Admins and banned players are excluded. Before the freeze time the public board is live; after it, only activity up to the freeze counts (admins can still see live).

## 3. Roadmap (not implemented)

1. **Live lab orchestration** — per-team containerised targets (web apps, SSH hosts, AD simulations) with TTLs and teardown, on an isolated network, driven by an orchestrator service with no Docker socket exposed to the web tier.
2. **Challenge content** for the remaining disciplines: network/PCAP, web exploitation, OSINT, Linux privilege escalation, reversing and binary exploitation, cloud/container, Active Directory, and a capstone chain. The pack format and `requires` chains are ready for them.
3. Team accounts and team scoring; first-blood bonuses; WebSocket live updates.
4. Per-pack automated solution verification in CI (the calibration test is the template).
5. Postgres backend for multi-host deployments.
