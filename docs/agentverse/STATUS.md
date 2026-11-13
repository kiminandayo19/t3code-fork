# Agentverse status and handoff

Read this first, then the next task file. Update it at the end of every task.

**Last updated:** after tasks 06 to 08 (result preview, message dock and voice, speak reply). **Next:** browser-verify everything below with the Replay provider (nothing since task 03 has been seen in a browser), then UX-REVIEW P1. Open work is listed under "Remaining" at the end.
**Everything uncommitted** on branch `arif-config` (fork of T3 Code). Nothing has been committed or PR'd.

## Done

| Task                       | State                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Verified                                                                                                                                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01 Route and scene         | Done. `/agentverse` renders an isometric campus from a Tiled map using Kenney sprites. Camera pan/zoom/bounds, district buttons, DEMO banner.                                                                                                                                                                                                                                                                                                                                 | Browser (Chrome via playwright), typecheck, lint                                                                                                                                                         |
| 01b Visual polish          | Done. 20x20 map, paved lots, one roof per district, pond with shoreline, trees/shadows.                                                                                                                                                                                                                                                                                                                                                                                       | Browser screenshots                                                                                                                                                                                      |
| 02 Characters              | Done. 4 DEMO agents (Nova, Atlas, Pixel, Echo), 8 animations, labels, badges, selection ring, inspector.                                                                                                                                                                                                                                                                                                                                                                      | Browser                                                                                                                                                                                                  |
| 03 Pathfinding + inspector | Done. Dijkstra over a walkable grid, follow camera, minimap, building click with occupants.                                                                                                                                                                                                                                                                                                                                                                                   | 3 unit tests, browser                                                                                                                                                                                    |
| 04 Real data               | Code done (+ P0 fixes below). `stateToAnimation.logic.ts` maps thread rows to animation + district; `AgentversePage` reads live shells via `liveThreadsAtom` and pushes specs to Phaser (`setSpecs`); DEMO behind a toggle; inspector shows `lastError`.                                                                                                                                                                                                                      | 3 unit tests, typecheck, lint. **Not yet run in a browser with Replay (dev).**                                                                                                                           |
| 05 Controls and perf       | Code done except pause/resume (see Remaining). Also **Send message** (`threadEnvironment.startTurn`, `dispatchMode: "auto"`), idle sleep, culling, reduced motion (agents teleport, camera jumps). Inspector has **Open thread** (navigate) and **Stop** (`threadEnvironment.interruptTurn` via `useOrchestrationCommand`, which checks the operate scope; failure toasts, no fake success). **Low power** toggle (Canvas, 15 fps), default on when `prefers-reduced-motion`. | typecheck, lint, tests. Not run in a browser.                                                                                                                                                            |
| 06 Result and preview      | Done. Inspector **View result** opens a dialog with the full latest message and a previewer for files the latest run wrote. See 06-result-and-preview.md.                                                                                                                                                                                                                                                                                                                     | 2 unit tests, typecheck, lint. Not run in a browser.                                                                                                                                                     |
| 07 Message dock and voice  | Done. Bottom-center `MessageDock.tsx` (the chat composer's Tiptap editor, markdown in/out, scrollable) dictates via `useEnvironmentSpeechInput`; Send while recording stops, transcribes, then sends. Not run in a browser.                                                                                                                                                                                                                                                   | typecheck, lint                                                                                                                                                                                          |
| 08 Speak reply             | Done. `SpeakButton.tsx` (Piper via `POST /api/voice/speak`, falling back to browser `speechSynthesis`; server side `speech/Piper.ts` + `piperAssets.ts`, pinned hashes) in the Inspector reply and the result dialog; `speak.logic.ts` strips markdown/code and caps length. Not run in a browser.                                                                                                                                                                            | Unit tests (speak text, asset table, endpoint), typecheck, lint. **The downloaded Piper binary was never executed by the agent** (blocked), so real synthesis and the `tar` install step are unverified. |

## Where things are

Everything is in `apps/web/src/agentverse/`, plus `routes/_chat.agentverse.tsx` an "Open Agentverse" entry in `components/CommandPalette.tsx`, and an Agentverse button in the sidebar utility row (`components/sidebar/SidebarChrome.tsx`, `mainAppLocation.ts` treats `/agentverse` as a utility page so Back appears). Also `Metrics.tsx` (FPS, renderer, object count, zoom, agent counts) and `liveThreads.ts` (shared thread atom). `routeTree.gen.ts` was regenerated and is committed upstream, so keep it in the diff.

| File                                       | Role                                                                                                                                                                                                                                            |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AgentversePage.tsx`                       | React shell: DEMO banner, inspector (agent or building), Follow button, district buttons, minimap mount. Phaser is loaded with a dynamic `import("./campusGame")` so it stays out of the main chunk.                                            |
| `campusGame.ts`                            | Phaser scene: ground, roads (autotiled), buildings, trees, camera, events. `createCampusGame(parent, lowPower, handlers)` returns `{overview, focus, follow, panTo, destroy}`.                                                                  |
| `characters.ts`                            | `Agent` class (sprite, label, badge, path-following state machine), `createAgents` (selection, building highlight, snapshots, minimap frame). **Selection/snapshots go to React via `handlers.onSelect`, only when the JSON changes.**          |
| `demoPatrols.ts`                           | DEMO routes, used only when the DEMO toggle is on (patrol driver in `createAgents`).                                                                                                                                                            |
| `stateToAnimation.logic.ts` (+ test)       | Pure: `mapThread`, `visible` (active, waiting request, or finished under 10 min ago), `buildAgentSpecs` (max 24). No tool events: the shell row has none.                                                                                       |
| `grid.logic.ts` (+ `.test.ts`)             | Pure: `buildCostGrid`, `findPath` (Dijkstra), `frontTile`. Roads cost 1, plaza 1.2, grass 2.5, buildings/water blocked.                                                                                                                         |
| `ResultDialog.tsx`, `resultFiles.logic.ts` | Task 06: last reply hook, result dialog, file popup, file list logic.                                                                                                                                                                           |
| `MessageDock.tsx`                          | Task 07: bottom-center Markdown message box with voice.                                                                                                                                                                                         |
| `SpeakButton.tsx`, `speak.logic.ts`        | Task 08: Speak button and text cleanup. Server side: `apps/server/src/speech/Piper.ts`, `piperAssets.ts`.                                                                                                                                       |
| `iso.ts`                                   | `TW=100`, `TH=50`, `project`, `unproject`. Single source of the projection.                                                                                                                                                                     |
| `Minimap.tsx`                              | Canvas minimap; static map painted once, dots redrawn from `onFrame` (4 Hz) via a ref, not React state.                                                                                                                                         |
| `districts.ts`                             | District ids/names for the buttons.                                                                                                                                                                                                             |
| `campus.map.json`                          | Tiled-format map. Ground tile ids: 1 grass, 2 road, 3 plaza, 4 garden, 5 water. Buildings are an object layer; **x/y/width/height are in tile units**, with properties `district`, `sprites` (comma list of atlas frames) and optional `roofs`. |
| `assets/`                                  | `atlas.png/json` (Kenney, built by `pack-atlas.py`), `characters.png/json` + `characters.meta.json` (original placeholder art, built by `gen-characters.py`), `KENNEY-LICENSE.txt`.                                                             |

## Conventions and facts that are easy to get wrong

- **Coordinates:** tile `(tx, ty)` projects to `x=(tx-ty)*50, y=(tx+ty)*25`. Screen-down is larger `tx+ty`. Depth sorting is `tx+ty` plus small offsets (ground < trees 0.5 < buildings 0.6/0.7 < agents 0.8). Labels are at depth 100000+.
- **Kenney road names:** `NS` runs along the `tx` axis, `EW` along `ty`. N = `tx-1`, S = `tx+1`, E = `ty-1`, W = `ty+1`.
- **Two sprite scales:** landscape tiles are 100 px wide, city/building tiles are 133 px (scaled by `SC` in code). Buildings draw at full size so neighbours overlap; this is intentional.
- **Characters:** one view direction, mirrored with `flipX`. Animation timing and names come from `characters.meta.json`; swapping art needs frames named `<id>/<animation>/<n>` and no code change.
- **Asset pipeline:** raw Kenney packs live in `assets/3d-assets/` (untracked, 5 MB, **do not commit**). Regenerate with `python3 -I apps/web/src/agentverse/assets/pack-atlas.py` and `gen-characters.py`. Needs Pillow.
- **Lint rules that bit us:** no raw Tailwind colours (use tokens like `bg-card`), no `text-[10px]` (use `text-3xs`), no em dashes in UI copy, effects need an `oxlint-disable ... t3code/no-unreasoned-state-sync -- reason` comment, `vp fmt` rewrites files (re-read before editing).
- **Pathfinding dependency:** easystar was dropped on purpose; `grid.logic.ts` is enough.

## Real-data pointers for task 04 (verified by reading the code, not yet used)

**Source of truth: the environment shell snapshot, not `state/agentSessions.ts`** (that file only imports external agent sessions).

- Read it with `useAtomValue(environmentShell.stateValueAtom(environmentId))` (`apps/web/src/state/shell.ts`). The value is `EnvironmentShellState` (`packages/client-runtime/src/state/shell.ts:49`): `snapshot: Option<OrchestrationV2ShellSnapshot>`, `status: "empty" | "cached" | "synchronizing" | "live"`, `removedAt`. Only trust it when `status === "live"`; otherwise show the world as connecting, not empty. Environment ids come from `enabledEnvironmentIds` / the catalog in `state/shell.ts` and `connection/catalog`.
- `snapshot.threads` (array of `OrchestrationV2ThreadShell`, `packages/contracts/src/orchestrationV2.ts:2147`) already has what the mapping needs, so **no per-thread subscription is needed for the first version**:
  - `status`: `"idle"` or a run status: `preparing | queued | starting | running | waiting | completed | interrupted | failed | cancelled | rolled_back`.
  - `activityRunStatus` (`preparing | starting | running | waiting`), `blockedOnThreadWait`, `latestRunStopRequested`.
  - `lastError`, `lastErrorClass`, `lastErrorCode` for the error state and the inspector.
  - `pendingRuntimeRequest` (an approval or question is waiting), `title`, `providerInstanceId`, `modelSelection`, `projectId`, `worktreePath`, `branch`, `latestRunStartedAt/CompletedAt`, `archivedAt`, `deletedAt`.
  - Filter out archived/deleted threads and decide which threads become characters (for example active ones only), or the world fills with every old thread.
- Likely mapping (to be decided and unit tested in `stateToAnimation.logic.ts`): `running` to work, `waiting`/`pendingRuntimeRequest` to think or talk, `completed` to success (short), `failed` to error, `idle`/others to idle. **Tool-call activity ("tool" animation, tool history, messages, artifacts) is not in the shell row.** It needs the per-thread subscription `orchestrationEnvironment.v2.thread` (`subscribeThread`) which I have not read. Do not invent tool events from the shell status.
- Mutations (task 05): `orchestrationEnvironment.v2.dispatchCommand`, `forceStopThread`, `stopWorkflow`, all built on `createEnvironmentRpcCommand`. Use the command's `permissionAtom` for availability and never fake success.
- Free testing: the `Replay (dev)` provider with the `showcase` scenario (see `.claude/skills/test-t3-app/SKILL.md`).
- Characters map to threads, not to the four named characters. Name from `title`, sprite chosen by a stable hash of the thread id. Keep the four DEMO characters behind an explicit toggle.
- `characters.ts` `Agent` currently runs its own patrol loop (`update`). Task 04 should drive `Agent` from a status plus a destination (reuse `findPath`, `frontTile`). `walk` only while moving.
- Still unverified: how many threads a normal environment has (performance of one sprite per thread), multi-environment behaviour (several environment ids), and remote/relay connection modes.

## How to run and verify

```
cd <repo root>
vp run dev            # run it from the harness/background; stop it by its task, never pkill
# open the pairing URL printed by dev-runner, then /agentverse
vp test run apps/web/src/agentverse
(cd apps/web && vp run typecheck)
vp lint apps/web/src/agentverse
```

- `vp run check:changed` has not been run yet. Run it before any push.
- Headless Chrome with software rendering runs the page at about 6 fps, so simulated time is slow in screenshot scripts; wait long (10 to 20 s) to see agents move. Do not read FPS from that.
- Pair a fresh browser with `node apps/server/src/bin.ts pair --base-dir .t3` (tokens are one-time). A stray second `vp run dev` fails with "server already running"; stop the first one.

## Known gaps and debt

- Overview framing, grass is flat, no landmark towers (Kenney set is low-rise); faint seams between paved tiles.
- Ground is hundreds of separate sprites, not baked into one cached layer; the loop is capped at 30 fps but does not idle when nothing changes. Low-power Canvas mode exists in `createCampusGame` but has no toggle.
- Selecting another agent while following keeps the "Stop following" state. Occupants in the building panel are not clickable.
- Agents can stand on the same tile; "Near X" location only within 4 tiles of a building.
- Placeholder characters are simple flat chibis, one view direction.
- No keyboard access to agents/buildings. Reduced motion makes agents teleport and the camera jump (Low power also defaults on).
- Mobile is not supported. Other surfaces (settings entry, keybinding) are not wired, only the command palette.
- Not profiled; bundle split of Phaser not confirmed with a production build.

## Task 04 notes

- Real agents spawn at Central Command and walk to the building of their project (see "Place = project"). State is shown by animation and badge only. `Agent.goTo(tile, status)` replaced the patrol loop.
- Character skin is a stable hash of the thread id; name is the thread title. Several agents in one district share a tile (known debt).
- Finished threads leave on a 30 s tick (see P0 below).
- Tool animation is unused for real agents (needs `subscribeThread`, not done).

## Task 05 not done

- Send message, pause, resume controls; no permission behavior tests added; viewport culling; idle-when-unchanged rendering (loop still runs at 30 fps); no profiling. Phaser sleeps its loop on a hidden tab by default, unverified here.

## UX review P0 (done)

- Inspector and badge show the real thread state from the first frame (`Agent.shown`); walking is only decoration.
- "Needs attention" strip (waiting or failed, click to focus via `reveal`), plus a dot on the sidebar Agentverse button (`liveThreads.ts`, `needsYouCountAtom`, requests only).
- Finished threads expire on a 30 s tick; blocked and failed sort first so the 24 cap never hides them; the banner says "N more not shown".

## Remaining

**Verification (blocks calling anything "done")**

- Run dev with `Replay (dev)` `showcase`: check real status and badge while walking, the Needs-attention strip, Stop, Open thread, expiry, the "+N more" banner, the sidebar dot, Metrics, Low power. Check the left stack on a narrow window.
- `vp run check:changed` before any push. Production build to confirm Phaser is split out. Nothing is committed.

**Task 05 leftovers**

- Pause and resume: no separate backend pause exists. Stop already holds the queue; "Resume queue" (`threadEnvironment.resumeThreadQueue`) needs `queueHeld`, which is on the run projection, not the shell row, so it needs the per-thread subscription. Not built.
- No new permission tests: `useOrchestrationCommand` already enforces the operate scope and has its own test; the new buttons only call it.
- Profile on a real GPU (Metrics shows "Objects drawn X of Y" and "0 (idle, loop asleep)").
- Idle sleep freezes sprite animations while nothing moves (badges still show state). Never sleeps in DEMO mode. Sleep and wake were not exercised in a browser: check pan, zoom, click, resize and a status change all wake it.

**UX-REVIEW P1**: all done (see below).

**UX-REVIEW P2**: done except a thread-header button that links to `/agentverse?thread=`.

**Known small gaps**

- Sidebar dot counts only threads waiting on a request. Tool animation unused for real agents. Following state not reset on selecting another agent.

## UX review P1 (done except place = project)

- `Roster.tsx`: searchable list (name or project), native buttons so Tab and Enter work, click focuses the agent. `Inspector.tsx` split out of the page: project, model, branch, run duration, last message, human state labels (`STATE_LABEL`).
- Actions: primary Open thread (becomes **Answer** when the thread waits on a request), Stop with a "Stopping..." state, Send, Follow demoted to a ghost button.
- Empty state card ("Nothing is running", Start a thread, Preview with demo agents); demo toggle is now "Preview demo" / "Back to live threads". Metrics is behind a button.
- Agents in one district fan out over nearby walkable tiles (`standingSlots`, slot by sorted id); labels scale with `1/zoom` clamped 0.8 to 2.
- Not verified in a browser: label scaling at several zooms, slot fan-out in a crowded district, the narrow-window layout of the left stack.

## Place = project, generated city (done)

- Decision: a building is a project. In live mode the map is generated (`layout.logic.ts`: `buildLayout`, `lotCell`, tested), not read from `campus.map.json`; the JSON is now only the DEMO campus (`DEMO_LAYOUT`).
- Layout: roads every 6 tiles, one 5x5 lot per project, building named with the project title. Projects are ordered oldest first (`createdAt`, archived ones skipped) and fill lots in square rings. The city starts at 3x3 lots and grows east and south when full, so no existing building ever moves. Roads and lots stay on the same tiles when it grows.
- Scene: `CampusScene.buildMap` replaces all map art and swaps the shared `world` object (grid, fronts, places) so agents keep their positions; `setLayout` rebuilds only when the layout key changes. The DEMO toggle rebuilds with the demo campus and re-fits the camera. The minimap, district buttons and camera bounds follow the layout.
- Removed: `districts.ts`, `assignDistricts`, `placeLabels`, label overrides.
- Limits: every building uses one of 4 sprite styles (cycled); a deleted or archived project shifts later buildings by one lot; the camera does not re-fit when the city grows; large cities (hundreds of projects) are untested. Not verified in a browser.

## UX review P2 (done)

- Metrics behind a button; Metrics, Low power and the camera view are remembered (`prefs.ts`, localStorage, try/catch). Low power toggling keeps the camera.
- Keybinding `agentverse.open` (`mod+alt+g`): contracts list, shared default, handler in `commandPaletteCommands.ts`, palette shortcut. User docs: `docs/user/agentverse.md`, linked from `docs/README.md`.
- Deep link `/agentverse?thread=<id>` (route `validateSearch`) reveals that agent once it appears.
- `connectionSummaryAtom`: top bar says offline vs connecting vs "N of M environments connected"; the inspector shows the environment name when more than one is enabled.
- Building occupants are buttons that focus the agent. Canvas has an `aria-label`, a polite live region announces how many threads need attention, and a desktop-only notice shows below `md`.
- Not done: thread-header "Show in Agentverse" button; canvas itself is still not keyboard navigable (the roster is the keyboard path); no browser check; `mod+alt+g` not checked for conflicts on every platform.
