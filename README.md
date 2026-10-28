# Obsidian Range

A self-contained cybersecurity CTF platform for hackathons and training events. Players investigate downloadable evidence with their own tooling (Kali Linux, Wireshark, Ghidra, Burp, CyberChef and so on) and submit flags that are validated server-side. Flags can be unique per player, so sharing answers is detectable.

- **No MongoDB, no external services.** Storage is a single SQLite file created on first start.
- **No player setup.** Guests play instantly; registering later keeps their progress.
- **Challenge packs.** Organisers add a folder; no code changes or rebuild.

> **Scope note.** This repository ships the platform and three neutral *calibration* packs that prove the full lifecycle. It does **not** ship a full competition's worth of challenge content (network, web, forensics, reversing and so on); those are authored by your organisers as packs. See [docs/AUTHORING.md](docs/AUTHORING.md).

## Quick start

Requires **Node.js 22.13+** (uses the built-in `node:sqlite`) and pnpm.

```bash
pnpm install
pnpm admin:create organiser 'a-long-passphrase'   # optional: creates an admin
pnpm dev                                          # http://localhost:3000
```

Production:

```bash
pnpm build
DATA_DIR=/var/lib/range pnpm start
```

The database, schema migrations and the flag secret are created automatically in `DATA_DIR` (default `./data`). Back that folder up.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` / `build` / `start` | Run the app |
| `pnpm test` | Unit and integration tests (vitest) |
| `pnpm typecheck` / `pnpm lint` | Static checks |
| `pnpm smoke` | End-to-end test against a running server (`BASE`, `ADMIN_HANDLE`, `ADMIN_PASSWORD`) |
| `pnpm admin:create <handle> <password>` | Create or promote an administrator |
| `pnpm db:reset --yes` | Wipe players, progress and logs (packs untouched) |
| `pnpm tsx scripts/hash-flag.ts '<flag>'` | Print the `flag` JSON for a static challenge |

## Configuration

All optional. See [.env.example](.env.example).

| Variable | Default | Meaning |
| --- | --- | --- |
| `DATA_DIR` | `./data` | SQLite database and generated flag secret |
| `CHALLENGES_DIR` | `./challenges` | Where packs are loaded from |
| `FLAG_PREFIX` | `RANGE` | Flag wrapper, e.g. `RANGE{...}` |
| `FLAG_SECRET` | auto-generated | HMAC secret (>= 32 chars) for per-player flags |
| `ADMIN_HANDLE` / `ADMIN_PASSWORD` | unset | Bootstrap an admin at startup |
| `TRUST_PROXY` | `0` | Trust `X-Forwarded-For` (only behind your own proxy) |
| `COOKIE_SECURE` | on in production | `Secure` session cookie. Set `0` for plain-HTTP LAN events |
| `APP_ORIGIN` | derived from `Host` | Exact public origin for CSRF checks behind a rewriting proxy |
| `SESSION_TTL_DAYS` | `30` | Session lifetime |

## What is implemented

**Challenge engine** — categories, four difficulty levels, tags, missions; server-side flag validation (constant-time); static flags (SHA-256 in the pack) and **per-player dynamic flags** (HMAC) embedded into template artifacts; hints with point penalties; prerequisite chains; per-challenge attempt caps; rate limiting; flag-sharing detection; static or decaying (dynamic) scoring; competition window and scoreboard freeze; per-challenge and per-player reset.

**Players** — guest sessions, optional registration with in-place guest upgrade, scrypt-hashed passwords, opaque session tokens (stored hashed), logout and password change.

**Admin** — live settings, enable/disable and re-point challenges, quick-create static challenges, pack error reporting, ban/unban/reset/delete players, event and submission logs.

**UI** — dark SOC-style interface: landing, operator console, operations board with filters, challenge briefing/evidence/hints/submit, scoreboard with progression chart, admin.

## Tests and results

```
pnpm test        42 tests, 3 files, all passing
pnpm smoke       45 HTTP checks against a production build, all passing
pnpm lint        clean        pnpm typecheck   clean        pnpm build   succeeds
```

The tests cover flag validation, per-player flags and sharing detection, secret leakage in API shapes, prerequisites, hints and scoring (including decay, ties, freeze, bans), competition windows, rate limits and attempt caps, resets, artifact path-traversal, sessions (hashed storage, expiry, revocation, isolation), guest upgrade, passwords, migrations, and solving the shipped packs from their downloaded evidence.

## What changed from the original project

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the original architecture, its weaknesses, the MongoDB removal map, and the new design. Security controls and the threat model are in [docs/SECURITY.md](docs/SECURITY.md).

## Known limitations

- **No live vulnerable targets are provisioned.** Challenges are evidence-based (files to analyse offline). Hosting live targets (web apps, SSH hosts, AD labs) needs separate isolated infrastructure; the engine does not spawn containers. See the roadmap in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- SQLite means a **single app instance** (multiple processes on one host are fine; multiple hosts are not).
- Per-IP limits need `TRUST_PROXY=1` behind a proxy; otherwise a global ceiling applies.
- The Dockerfile and compose file are provided but were **not built or run** in the development environment (no Docker daemon was available).
- The UI was type-checked, linted, built and served (all pages return 200) but **not visually reviewed in a browser** or tested with assistive technology.
- Dynamic flags are tied to `FLAG_SECRET`; rotating it mid-event invalidates issued flags.
