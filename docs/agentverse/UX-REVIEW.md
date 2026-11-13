# Agentverse UX and product review

**Basis:** a read of the code and the earlier headless-browser screenshots, plus what we know of how people use T3 Code. **No live session with real threads and no user test has been run**, so every item is a hypothesis to confirm with the Replay (dev) provider and a few real users. Ratings are my judgment, not measurements.

## 1. What job is this for?

People who run several agents want to answer three questions fast:

1. Is anything **waiting on me** or **broken**?
2. What is **running**, and for how long?
3. How do I **get to it**?

The campus is a good "ambient" view, but today it answers none of these better than the sidebar does, and it is slower (agents must walk, labels are small). The product bet to make: **the campus is the place to feel and triage the whole fleet, the sidebar stays the place to work**. Everything below is judged against that.

## 2. Findings, by priority

### P0: the screen can lie or hide what matters

**Status: all three fixed in code (typecheck, lint, unit tests pass); not yet checked in a browser.** Sidebar dot counts only threads waiting on a request, not failures.

| #   | Finding                                                                                                                                                                                                            | Why it matters                                                                                           | Suggested fix                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Inspector shows the animation, not the real state.** While an agent walks to its district, `Status` reads "walk" and the badge is empty, though the thread is `running` or `failed`. A walk can take 10 to 15 s. | A stale or wrong label is the thing T3 users notice most. An error is invisible until the agent arrives. | Show the real run status (and a badge) from the first frame. Show the error immediately. Walk is decoration only. Consider a much faster walk or a short fade-teleport. |
| 2   | **Needs-attention is not surfaced.** A thread waiting for an answer or a failed run is just one more small sprite.                                                                                                 | The most valuable event in a multi-agent tool is "an agent is blocked on you".                           | A "Needs you" strip: count chips (waiting N, failed N) that pan to the agent on click, an offscreen arrow, and a count on the sidebar Agentverse button.                |
| 3   | **Finished threads leave on the next shell change, not on a timer**, and the 24-agent cap drops the rest silently.                                                                                                 | A completed or failed agent can sit forever, or a thread can vanish with no explanation.                 | Expire on a timer; show "+N more" and a way to list them. Make the 10 min window a visible setting or a toggle ("show recently finished").                              |

### P1: usable, but weak for real work

**Status: items 4, 6, 7, 8 and 9 are done in code (not yet seen in a browser). Item 5 (place = project) is decided and built: each project gets its own building on a generated city that grows when full.**

| #   | Finding                                                                                                                                                                                                                                 | Suggested fix                                                                                                                                                                                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4   | **No roster.** The only way to find an agent is to spot a sprite on a canvas. Overview zoom makes sprites and 15 px labels hard to read; there is no search.                                                                            | A left list (name, project, state dot, time in state), keyboard navigable, click to focus. This also fixes accessibility (see 11) and the cap (3).                                                                                                         |
| 5   | **Location carries no meaning.** Districts are assigned by _status_ (work: Engineering, error: Testing). The badge already says the status, so "where" adds nothing, and it moves the agent every time status changes.                  | Make place mean **project** (one building per project, or per repo) or **provider**. Then position is stable and informative: "my web project is busy, my API project is quiet". Status stays on the badge. This is the biggest design decision to settle. |
| 6   | **Inspector is thin.** "Task: Run running" is filler. Missing: project, provider and model, branch, started or finished time and duration, last message snippet, pending request kind.                                                  | Fill it from fields the shell row already has (`projectId`, `providerInstanceId`, `modelSelection`, `branch`, `latestRunStartedAt`, `latestVisibleMessage`, `pendingRuntimeRequest.kind`). Drop the invented-sounding "Task" line.                         |
| 7   | **Actions are minimal and ambiguous.** "Follow" (camera) sits next to "Open thread" and "Stop" with equal weight. Stop gives no pending or done feedback and no confirmation. Send message, pause and resume are not built.             | Make Open thread the primary action. Show Stopping... state, disable while pending. Keep Follow as a secondary icon. Add "Answer" (jump to the pending request) for blocked agents.                                                                        |
| 8   | **First run and empty state are flat.** "No active threads right now" over an empty campus. "Show demo agents" is a developer concept.                                                                                                  | Empty state that explains the view in one line and offers "Start a thread". Show idle recent threads dimmed so the world is not empty. Hide or rename the demo toggle (dev only).                                                                          |
| 9   | **Crowding.** Agents in one district share a tile and overlap; two threads with the same title look alike; skins are a hash of the id so the same thread keeps its look but different threads can match. Labels do not scale with zoom. | Spread agents over several tiles around the front of a building. Include project initial or number in the label. Scale label size with zoom, hide labels when zoomed out and show only badges.                                                             |

### P2: polish and reach

**Status: done in code except the "Show in Agentverse" button in the thread header (the `?thread=` deep link exists). Not seen in a browser.**

| #   | Finding                                                                                                                                                                                                                | Suggested fix                                                                                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10  | **Metrics panel is always on** and sits over the map next to the minimap, buttons and inspector, which collides on small windows.                                                                                      | Behind a dev flag or a collapsed "i" button.                                                                                                                           |
| 11  | **Accessibility.** Canvas only: no keyboard access to agents or buildings, no screen-reader text, status shown by colour and emoji, walking is not reduced under `prefers-reduced-motion` (only low power is toggled). | Roster (item 4) gives keyboard and SR access. Status as text plus icon. Under reduced motion, no walking, just teleport. Check label contrast on bright agent colours. |
| 12  | **Discoverability.** Reached from the sidebar and command palette only. No keybinding, no deep link, no remembered camera or selection, nothing in Settings or user docs.                                              | Keybinding; `?thread=` deep link from the thread header ("Show in Agentverse"); remember last view; add a short section to `docs/user/`.                               |
| 13  | **Multi-environment and connection modes.** Threads from several environments mix with no environment label. "Connecting" is shown for any state without live shells, including a server that is down.                 | Show environment in the inspector and roster. Distinguish connecting, offline and empty. Test remote and relay modes.                                                  |
| 14  | **Always-running render loop** (30 fps) conflicts with the "no continuously repainting animation" rule and battery use on laptops.                                                                                     | Idle the loop when nothing moves or changes (task 05 gap); pause when hidden; measure on a real GPU, not headless.                                                     |
| 15  | **Buildings are decorative.** Clicking one lists occupants, which are not clickable.                                                                                                                                   | Either make occupants clickable or drop building selection until places mean something (item 5).                                                                       |
| 16  | **Touch and small screens** are out of scope but the page does not say so.                                                                                                                                             | A one-line "best on desktop" notice below a width, until mobile is planned.                                                                                            |

## 3. Suggested order of work

1. **Truthful state** (1, 3, 6): real status and error from frame one, timer expiry, richer inspector. Small, no design risk.
2. **Triage** (2, 4, 7): roster plus "needs you" strip plus a clear primary action. This is what makes the page worth opening.
3. **Meaningful place** (5, 9): decide location = project, spread agents, scale labels. Needs a design decision first.
4. **Reach and quality** (8, 10 to 16): empty state, accessibility, deep links, idle rendering, docs.

## 4. Open questions for the owner

- Is the campus meant to be **a place to work from** or an **ambient dashboard**? It changes whether item 5 (place = project) or item 4 (roster) leads.
- Should location mean **project**, **provider**, or stay **status**?
- Should Agentverse be on by default for all users or behind a setting while it is exploratory?
- How many concurrent agents does a typical user run? If it is under 10, the cap and crowding matter less; if 30 or more, culling and a roster are mandatory.

## 5. How to check these claims

- Run the Replay `showcase` scenario and watch finding 1 (status reads "walk") and 3.
- Put 5 real threads in different states and time how long it takes a new user to find the blocked one (finding 2). Target: under 5 s without help.
- Success measures once improved: time to find a blocked or failed agent, share of Agentverse sessions that end in "Open thread" or "Answer", and frame time on a laptop GPU while idle.
