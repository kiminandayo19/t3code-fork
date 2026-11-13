# 05 Controls and performance

**Status:** Done except pause/resume and profiling: Open thread, Stop, Send message, Low power, reduced motion, culling, idle sleep. See STATUS.md.
**Scope:** follow, open workspace, send message, pause, resume and stop via `createEnvironmentRpcCommand` with permission checks. Low-performance mode, pause rendering when the tab is hidden, reduced-motion, viewport culling.
**Done when:** every control calls a real backend action; the canvas is idle when nothing changes.
**Verify:** permission behavior tests; profile with the Canvas renderer forced.
