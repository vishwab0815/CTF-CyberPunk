# Authoring challenge packs

A pack is a folder inside `challenges/`:

```
challenges/
  my-challenge/
    challenge.json
    files/            # downloadable evidence (optional)
      capture.pcap
      notes.txt
```

Folders starting with `.` or `_` are ignored. Packs are re-scanned every few seconds and when an admin opens the Challenges tab, so no restart is needed. Invalid packs are skipped and reported in the admin UI.

## challenge.json

```json
{
  "id": "my-challenge",
  "title": "Human title",
  "category": "network",
  "difficulty": "intermediate",
  "points": 300,
  "mission": "Optional group name shown on the board",
  "tags": ["pcap", "wireshark"],
  "summary": "One line shown on the board, even while locked (<= 200 chars).",
  "briefing": "Scenario text. Blank line = new paragraph.",
  "objectives": ["What the player should achieve"],
  "tools": ["Wireshark", "tshark"],
  "hints": [{ "title": "Where to start", "text": "…", "cost": 30 }],
  "requires": ["another-challenge-id"],
  "maxAttempts": 50,
  "flag": { "type": "static", "sha256": "<hex>" },
  "artifacts": [{ "file": "capture.pcap", "description": "Edge capture", "template": false }]
}
```

- `category`: `network web osint linux forensics crypto reversing cloud enterprise hunting`
- `difficulty`: `beginner intermediate advanced expert`
- `requires` builds multi-stage chains. Locked challenges expose only title and summary; their brief, files, hints and submissions are refused until the prerequisites are solved.
- Artifact filenames must match `[A-Za-z0-9][A-Za-z0-9._-]*` and live in `files/`. Only files listed in `artifacts` are ever served.

## Flags

**Static** — same flag for everyone. Hash it and paste the result:

```bash
pnpm tsx scripts/hash-flag.ts 'RANGE{use_a_long_unguessable_value}'
```

Only the hash lives in the repo, but a short flag can be brute-forced from its hash, so make static flags long and random. Players can share a static flag, so prefer dynamic flags or per-player findings where you can.

**Dynamic** — unique per player:

```json
"flag": { "type": "dynamic", "tag": "my_challenge" },
"artifacts": [{ "file": "notes.txt", "template": true }]
```

With `"template": true`, the server replaces `{{FLAG}}` (the player's own flag, `RANGE{my_challenge_<20 hex>}`) and `{{HANDLE}}` in the file as it is downloaded. Use text files for templated artifacts. A player submitting another player's dynamic flag is flagged and logged as an alert.

For binary artifacts (pcaps, images, binaries) that cannot be templated, use a static flag, or have the player report a finding that is derivable only by analysing the file (a count, an id, a timestamp) and make the flag that finding.

## Validating a pack

1. Start the app and open the admin **Challenges** tab: pack errors are listed there.
2. Solve it yourself as a normal player using only the downloaded files and your tools.
3. Keep a written solution path for every challenge; a challenge without a verifiable solution path should not ship.
4. Add a test (see `tests/calibration.test.ts`) that solves the pack programmatically from its artifacts, so regressions are caught.

## Lab design guidance

- Prefer **offline evidence** (logs, captures, source, binaries, configs). These are safe, reproducible and need no infrastructure.
- Use **synthetic data only**: invented names, `.test` / `.example` domains, RFC 5737 addresses (`192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`).
- If you add **live targets**, run them in separate containers on an isolated network with no route to the platform or the internet, non-root users, read-only filesystems, dropped capabilities, and CPU/memory/pids limits. Never mount the Docker socket. See [SECURITY.md](SECURITY.md).
- Make difficulty come from technical depth and evidence correlation, not riddles. A misleading lead must be explainable once the solution is known.

The `challenges/_tools/generate-calibration.mjs` script shows how the shipped packs are generated.
