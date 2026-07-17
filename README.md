# Escape the Lagos Tech Traffic 🚐

A promotional browser game for **DevFest Lagos 2026**. Dodge danfos, escape
production bugs, collect tech boosts and reach the venue before the keynote
starts.

Built with **Next.js 16 + TypeScript + Phaser 3**, with a self-contained
SQLite-backed leaderboard API. All artwork is generated procedurally in code
(flat, ink-outlined, pastel style derived from [devfestlagos.com](https://devfestlagos.com/))
and almost all audio is synthesized with the Web Audio API — no external
assets, no licensing baggage. The one exception is a set of recorded danfo
conductor calls (`public/sfx/conductor-*.m4a`) played when passing close to a
Lagos Danfo — see [Sound](#sound) below.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

Production:

```bash
npm run build
npm start
```

There are **no required environment variables**. The leaderboard database is
created automatically at `.data/game.db` (WAL-mode SQLite).

Checks:

```bash
npm run lint
npm run typecheck
```

## How it plays

- 3-lane vertical runner, ~60–120 s per run. Reach **2,000 m** before the
  90-second keynote clock runs out.
- **Vehicles**: DevFest Shuttle (balanced, one-hit shield), Lagos Danfo
  (fast, heavy steering, bigger near-miss bonus), Delivery Bike (nimble,
  slim hitbox, no shield). Score multipliers compensate difficulty.
- **Traffic obstacles**: lane-changing danfos, slow trucks, weaving okadas,
  potholes, construction barriers, broken-down cars.
- **Tech obstacles**: Production Bug (a ladybug the size of a fridge),
  Merge Conflict, Infinite Loading Spinner, Expired API Key gate, Unnamed
  Figma Layers, Friday Deploy zone.
- **Power-ups** (stored, activated with Space or the on-screen button):
  Coffee Boost, Cloud Shield, Stable Wi-Fi (slow-mo), Gemini Route Assist
  (highlights the safe corridor — fully deterministic, no live AI).
- **Collectibles**: community stars, code tokens, Wi-Fi signals and event
  badges (+5 s on the clock).
- 3 integrity pips, short invulnerability after hits, no one-hit deaths.
- Route beats: morning commute → mainland traffic → flyover → sudden rain →
  DevFest approach with gate, crowds and confetti.

### Controls

| Input    | Action                          |
| -------- | ------------------------------- |
| ← → / A D | change lane                    |
| Space    | use stored power-up             |
| Esc / P  | pause                           |
| Swipe    | change lane (touch)             |
| Tap left/right third | change lane (touch) |

The game pauses automatically when the tab loses focus.

## Fairness

`src/game/systems/director.ts` owns spawning. It maintains a **safe lane**
that random-walks at most one lane per obstacle row; the corridor is never
blocked, transitions keep both old and new lanes clear, and set-piece
obstacles (bug crossings, merges, okadas, deploy zones) reserve extra clear
road. Slow movers block safe-lane shifts into their lane. There is no
unavoidable damage.

Dev aids for verifying this: append `?simloop` (setTimeout game loop for
RAF-suspended test browsers) and/or `?autopilot` (threat-based self-driving)
to `/play`.

## Scoring

Deterministic and versioned (`s1`) — see `src/game/balancing/scoring.ts`,
shared verbatim by the client and the server:

```
total = round((distance·2 + collectibles + nearMisses·100·vehicleBonus
        + comboScore + remainingSeconds·120) · vehicleMultiplier)
        − collisions·400
```

## Leaderboard & score integrity

- No sign-in anywhere. Anyone can play immediately; personal bests live in
  `localStorage`.
- Submitting a score is equally frictionless: the first submission silently
  registers a **device identity** using the driver name from the setup
  screen — the server issues a random token (stored hashed, verified with a
  constant-time compare) that stays on the device. No email, no account, no
  dialog. Display names don't need to be unique, so there is never a
  "name taken" roadblock; each submission also re-syncs the public
  name/avatar to whatever the player last entered.
- `POST /api/scores` never trusts the submitted score. The server:
  - recomputes the score from run components with the shared formula and
    rejects mismatches;
  - bounds-checks duration, distance vs. physical top speed, timer
    consistency, collision/dodge/collectible/combo rates against what the
    spawner can actually produce;
  - is idempotent per `sessionId` (duplicates return the original result);
  - rate-limits per IP and per player (in-memory + DB-backed);
  - **flags** plausible-but-suspicious runs instead of publishing them.
- Weekly (ISO week, UTC) and all-time boards show one row per player —
  their best verified run. Ties break by remaining time, then fewer
  collisions, then more near misses, then earlier submission.
- Failed submissions are stored locally as *pending* and retried when the
  connection returns; duplicates are impossible thanks to `sessionId`
  idempotency.

## Sound

`src/game/systems/audio.ts` synthesizes music, engine drone, rain, and all
SFX live via the Web Audio API. The one recorded exception: three danfo
conductor call clips in `public/sfx/`, loaded and decoded on `unlock()`. When
the player passes within 70px of a `danfoLaneChanger` obstacle, one clip is
picked at random and played once per obstacle (`RunScene.updateObstacles`,
`hornPlayed` flag on the obstacle).

## Architecture

```
src/
  app/                 # Next.js App Router pages + API routes
  components/          # layout + landing UI
  config/              # design tokens, site copy, avatars, versions
  features/            # leaderboard, play flow, player, results, settings
  game/
    assets/            # procedural texture painter (all game art)
    balancing/         # vehicles, run constants, deterministic scoring
    scenes/            # Boot / Run / Hud Phaser scenes
    systems/           # difficulty director, WebAudio synth
  services/
    analytics/         # sendBeacon event tracker (never blocks gameplay)
    database/          # SQLite repositories, validation, rate limiting
  types/ utils/
```

Phaser owns the whole game loop (movement, spawning, collisions, timing,
HUD); React never re-renders during play. The game bundle is dynamically
imported so the landing page stays light.

### Why SQLite instead of Supabase?

The brief suggested Supabase, but production Supabase credentials are not
available to this build, and a leaderboard that only works with missing
secrets would ship broken. Every query is contained in
`src/services/database/`, the SQL is Postgres-friendly, and the auth token
model maps 1:1 onto Supabase rows — swapping the storage layer in is a
contained change. If federated sign-in (Google / magic link) is ever
wanted, it can attach to the same device-identity rows once real OAuth
credentials exist — the game itself never requires it.

## Accessibility

- Reduced motion (follows `prefers-reduced-motion`, overridable), high
  contrast, and larger-interface settings — persisted locally and applied
  in both the DOM and the game.
- Full keyboard play and keyboard-navigable menus with visible focus.
- Obstacle warnings are visual (indicator blinks, warning triangles),
  never sound-only; status never relies on red/green alone.
- Semantic leaderboard markup; mobile rows collapse into cards — no
  horizontal scrolling; works down to 320 px.

## Known placeholders

- Ticket link points at devfestlagos.com (no dedicated URL published yet).
- No official DevFest logo asset is bundled — the game uses its own
  brand-adjacent mark (four community dots) instead.

Not affiliated with Google; DevFest Lagos is a Google Developer Groups
Lagos community event.
