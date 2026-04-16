# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

CoachFoot is a vanilla JS PWA (Progressive Web App) for managing amateur football teams. There is no build step, no bundler, no package manager. It runs directly in the browser as static files, backed by Supabase.

To develop, just open `index.html` in a browser or serve the directory with any static server:

```bash
python3 -m http.server 8080
# or
npx serve .
```

## Architecture

This is a single-page application with all pages defined in `index.html` and shown/hidden via `switchPage()`. There is no router library.

### Script loading order (defined at bottom of `index.html`)

| Order | File | Role |
|-------|------|------|
| 0 | `js/store.js` | Central state (Pub/Sub) |
| 1 | `js/config.js` | Supabase client (`sb`), global state proxies, formation schemas (`SCHEMAS`) |
| 2 | `js/helpers.js` | Shared utilities: `toast()`, `initials()`, `fmtDate()`, `genInviteCode()`, `exportICal()` |
| 3 | `js/auth.js` | Login, signup, logout, password reset |
| 4 | `js/team.js` | Team creation and invite code flow |
| 5 | `js/players.js` | Player CRUD and stats |
| 6 | `js/compo.js` | Drag-and-drop tactical lineup builder |
| 7 | `js/planning.js` | Match and training event management |
| 8 | `js/history.js` | Match results and match ratings |
| 9 | `js/messages.js` | Team convocation (summons) generation |
| 10 | `js/settings.js` | Team settings (coach only) |
| 11 | `js/dashboard.js` | Player profile/stats view |
| 12 | `js/fines.js` | Team fines ("La Caisse") |
| 13 | `js/league.js` | Multi-team championship/tournament |
| 14 | `js/app.js` | Boot sequence, `initApp()`, navigation, data loading |

### State management

`store.js` defines a global `window.store` (an `AppStore` instance). State keys: `user`, `profile`, `currentTeam`, `players`, `events`, `messages`, `results`, `fines`, `cars`, `mvp_votes`, `league_matches`, `league_teams`, `currentCompo`, `selectedRole`.

In `config.js`, these keys are exposed directly as global variables (`window.user`, `window.players`, etc.) via `Object.defineProperty` proxies that read/write through the store. So you can write `players = [...]` or `store.set('players', [...])` interchangeably.

### Backend: Supabase

The Supabase client (`sb`) is created in `config.js`. The key tables are:

- `profiles` — user profile with `role` (`'coach'` or `'player'`) and `team_id`
- `teams` — team record with `coach_id` and `invite_code`
- `players` — roster entries linked to a team via `team_id`, optionally linked to an account via `profile_id`
- `events` — matches and training sessions
- `results` — match scores, notes, and player ratings
- `fines` — financial penalties per player
- `mvp_votes` — player MVP votes per match
- `league_matches` — cross-team championship fixtures

RLS (Row Level Security) is enabled. SQL setup scripts are in the repo root: apply them in order (`SUPABASE_SETUP.sql` → `V3` → `V4`) via the Supabase SQL editor.

### User roles

Two roles exist: `coach` and `player`. The helper `isCoach()` (defined in `app.js`) checks `profile.role === 'coach'`. Most write operations and management pages are coach-only.

### Boot sequence

`auth.js` registers `sb.auth.onAuthStateChange`. On sign-in it calls `boot(user)` in `app.js`, which:
1. Loads the user's `profile`
2. Auto-recovers missing `team_id` for both roles
3. Either shows the team setup screen or calls `initApp()`

`initApp()` renders the bottom nav, loads all data from Supabase, and shows the default page.

### Navigation

Pages are `<div class="page" id="page-{name}">` elements. `switchPage(name)` hides all pages and shows the target one, then calls the relevant render function.

### Tactical formations

`SCHEMAS` in `config.js` defines player positions as `{role, x, y}` percentage coordinates over an SVG pitch (300×440 viewBox). Supported formations: `4-3-3`, `4-4-2`, `3-5-2`, `4-2-3-1`.

### PWA

`manifest.json` declares standalone display mode. Service worker registration is **intentionally disabled** at the bottom of `index.html` due to a Safari infinite-hang bug with the Supabase API.
