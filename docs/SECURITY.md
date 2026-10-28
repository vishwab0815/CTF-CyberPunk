# Security model

## Trust boundaries and assumptions

| Actor / component | Trust |
| --- | --- |
| Players (guest or registered) | **Untrusted.** May send arbitrary requests, forge cookies, race requests, try to read others' flags. |
| Challenge pack authors | **Trusted** (organisers). Packs are read-only data; they cannot execute code on the platform. |
| Pack files | Treated as **untrusted content** when served (always `attachment`, `nosniff`, `sandbox` CSP). |
| Administrators | Trusted. Admin routes require an admin session. |
| Reverse proxy (if any) | Trusted only if `TRUST_PROXY=1` and it overwrites `X-Forwarded-For`. |
| Host / filesystem | The platform needs read/write on `DATA_DIR` and read on `CHALLENGES_DIR` only. |

Deployment assumption: the platform runs as a **non-root user**, behind TLS, on a host that is not shared with sensitive workloads. **This version runs no player-supplied or vulnerable code**; players analyse evidence on their own machines.

## Controls implemented (and where they are tested)

| Threat | Control |
| --- | --- |
| Reading others' / all flags | Static flags stored only as SHA-256 (packs) or keyed HMAC (admin-created); dynamic flags derived per player from a server secret, never stored. No API returns flags or digests (tests: `catalog never leaks secrets`, `does not leak the static flags`; smoke: `catalog never contains a flag or digest`). |
| Flag guessing / brute force | Per player+challenge (8/min), per player (30/min) and per IP (60/min) limits persisted in SQLite; per-challenge attempt cap (default 100, configurable); alerts logged. |
| Flag sharing | Dynamic flags are unique; submitting another player's flag marks both accounts `flagged` and logs an `alert`. |
| Timing attacks | `timingSafeEqual` on hashed values; dummy password hash on unknown handles. |
| Credential theft | scrypt (N=2^15) with per-hash salt; passwords NFKC-normalised; never returned by any API. |
| Session theft / fixation | 256-bit random tokens; only SHA-256 stored; `HttpOnly`, `SameSite=Lax`, `Secure` in production; new token on login, register and password change; password change revokes other sessions; ban revokes sessions. |
| CSRF | State-changing requests must carry a matching `Origin` (or same-origin `Sec-Fetch-Site`) **and** `Content-Type: application/json`. Verified: cross-origin and form POSTs are rejected. |
| Account takeover by login brute force | Per-handle (10/15 min) and per-IP limits; generic error message. |
| IDOR / cross-player access | Every query is scoped by the session's player id; the player id never comes from the request body. Verified with a two-player isolation test. |
| Privilege escalation | Role checked server-side per route; admins cannot be banned/deleted via the API; admin bootstrap only from env or CLI. |
| Path traversal | Artifact names are looked up in the pack's declared list and resolved against the pack's `files/` dir with a directory check; request input never forms a path (tests incl. `..%2F`, absolute paths, backslashes). |
| Locked-content bypass | Briefing, hints, artifacts and submissions all enforce prerequisites server-side. |
| SQL injection | All queries are parameterised; the only interpolated identifiers are fixed table names. |
| XSS | React escapes all output; a CSP restricts scripts to same-origin (inline allowed for Next.js hydration); pack text is rendered as text, never HTML. |
| Clickjacking / sniffing | `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`. |
| Oversized input | 32 KB JSON body cap; flag length cap; schema validation (zod) on all structured input. |
| Abuse by guest spam | Guest creation rate-limited (per IP, or a global ceiling without a trusted proxy). |
| Data loss / recovery | SQLite WAL; migrations versioned; `db:reset` is explicit and requires `--yes`; per-challenge and per-player reset in the admin UI. |
| Audit | `events` table records logins, failures, solves, hints, bans, resets, admin changes and abuse. |

## Known gaps and operator responsibilities

- **Dynamic flags depend on `FLAG_SECRET` / `DATA_DIR/flag-secret`.** Protect and back it up; anyone holding it can compute every player's flags. The file is created mode 0600 (best effort on Windows).
- **Static flags can be shared** between players and are only as strong as their entropy. Prefer dynamic or per-player findings.
- **Per-IP limits require a trusted proxy.** Without `TRUST_PROXY=1` they degrade to a global ceiling, which a determined attacker could use to starve guest creation.
- **CSP allows `'unsafe-inline'` scripts** (required by Next.js without a nonce pipeline). A nonce-based CSP is future work.
- **No MFA, email verification or password reset.** Registration is handle + password only, by design for low-friction events. Admins can reset a player's progress but there is no self-service password recovery.
- **Not penetration-tested.** The controls above are covered by automated tests and a smoke test, not by an independent security assessment. Review before exposing to the public internet.
- **No isolation layer exists yet because no live targets exist.** If you add live vulnerable targets, you own their isolation. Minimum bar: separate hosts or containers, an isolated network with no route to the platform, the internet or cloud metadata endpoints, non-root, read-only root filesystem, `--cap-drop ALL`, `no-new-privileges`, seccomp/AppArmor, CPU/memory/pids limits, short TTLs with teardown, per-team instances, and no Docker socket anywhere near the web tier.

## Reporting

Treat any bypass of the controls above as a bug in the platform and fix it before the event.
