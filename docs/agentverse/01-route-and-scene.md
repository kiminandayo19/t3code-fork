# 01 Route and scene

**Status:** Done (with 01b polish).
**Goal:** an explorable isometric campus.
**Files:** `apps/web/src/routes/_chat.agentverse.tsx`, `apps/web/src/agentverse/`, `apps/web/package.json` (phaser), nav/command-palette entry.
**Scope:** lazy Phaser import, isometric ground, roads, vegetation, six district buildings from a Tiled JSON map (Kenney sprites via `assets/atlas.*`), camera pan/zoom/bounds, DEMO banner.
**Done when:** route loads, camera works, no console errors, Phaser stays out of the main chunk.
**Verify:** `vp run check:changed`; open the route via `test-t3-app`; check the bundle.
