# 04 Real data

**Status:** Code done, awaiting browser check with Replay (dev). Read STATUS.md for the real-data pointers first.
**Scope:** pure `stateToAnimation.logic.ts` mapping session status to animation and district, with tests. Replace DEMO with real sessions. Keep DEMO behind an explicit toggle.
**Done when:** a `Replay (dev)` provider turn animates its character, and errors are visible and inspectable.
**Verify:** `vp test run` on the logic file; test-t3-app with the Replay provider.

**Notes for whoever starts this:**

- Replace `demoPatrols.ts` and the patrol loop in `characters.ts` (`Agent.update`/`startLeg`) with a status plus a destination per real session. Reuse `findPath` and `frontTile`.
- Source of truth is the shell snapshot (`environmentShell.stateValueAtom`, `snapshot.threads[].status`), not `state/agentSessions.ts`. Details and field list are in STATUS.md.
- DEMO must stay available behind an explicit toggle and stay labelled DEMO. Real agents must never be labelled DEMO, and no event may be invented.
- Errors must be visible and inspectable (inspector needs a place to show the failure).
