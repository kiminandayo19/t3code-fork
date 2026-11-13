# Agentverse

**Current state and handoff notes: [STATUS.md](STATUS.md). Read it first.**

An isometric "living campus" view of T3 Code agents, as a `/agentverse` route in `apps/web`. Desktop gets it for free. Mobile is out of scope for now.

**Product and UX review, with prioritized improvements: [UX-REVIEW.md](UX-REVIEW.md).**

## Decisions

- A route in `apps/web`, not a separate app or Electron package.
- Phaser is dynamically imported on the route only, so startup and bundle size stay unaffected.
- Characters will be real thread sessions, read from the environment shell snapshot (`state/shell.ts`, thread `status` and `lastError`; see STATUS.md). No new adapter layer. (`state/agentSessions.ts` is only an importer, not the live source.)
- DEMO agents (Nova, Atlas, Pixel, Echo) exist only as clearly labelled fixtures.
- Controls go through `createEnvironmentRpcCommand`. Never simulate success.
- Assets: Kenney CC0 packs (buildings, tiles, roads) plus original generated character sheets. Raw packs stay untracked in `assets/3d-assets/`; only packed atlases are committed.
- Result text and files come from the selected thread's turn items, not the shell row (its `latestVisibleMessage` is always null). See 06.
- Text-to-speech runs on the environment's server (Piper), not in the client, so remote and tunnel setups work; the browser voice is only the fallback. See 08.
- Pathfinding is our own Dijkstra in `grid.logic.ts`, not easystar.

## Tasks (one per turn, verify, then stop)

1. [01-route-and-scene.md](01-route-and-scene.md) (done)
2. [02-characters.md](02-characters.md) (done)
3. [03-pathfinding-inspector.md](03-pathfinding-inspector.md) (done)
4. [04-real-data.md](04-real-data.md)
5. [05-controls-and-perf.md](05-controls-and-perf.md)
6. [06-result-and-preview.md](06-result-and-preview.md) (done)
7. [07-message-dock-and-voice.md](07-message-dock-and-voice.md) (done)
8. [08-speak-reply.md](08-speak-reply.md) (done, Piper unverified)
