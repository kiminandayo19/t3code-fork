import * as DateTime from "effect/DateTime";
import * as Option from "effect/Option";
import type { OrchestrationV2ThreadShell } from "@t3tools/contracts";
import { enabledEnvironmentIds } from "@t3tools/client-runtime/state/connections";
import { AsyncResult, Atom } from "effect/reactivity";

import { environmentCatalog } from "~/connection/catalog";
import { environmentShell, liveShellEnvironmentIdsAtom } from "~/state/shell";
import type { ThreadInput } from "./stateToAnimation.logic";

// Inspector facts and what a new turn needs, kept out of the pure logic types.
export type AgentDetails = Pick<OrchestrationV2ThreadShell, "runtimeMode" | "interactionMode"> & {
  project: string | null;
  model: string;
  branch: string | null;
  startedAt: number | null;
  cwd: string | null;
  runId: string | null;
};

const millis = (d: DateTime.Utc | null | undefined) => (d ? DateTime.toEpochMillis(d) : null);

export const liveThreadsAtom = Atom.make((get) => {
  const live = get(liveShellEnvironmentIdsAtom);
  const threads: ThreadInput[] = [];
  const details = new Map<string, AgentDetails>();
  const projects: { key: string; title: string; createdAt: string }[] = [];
  for (const environmentId of live) {
    const snapshot = get(environmentShell.stateValueAtom(environmentId)).snapshot;
    if (Option.isNone(snapshot)) continue;
    const titles = new Map(snapshot.value.projects.map((p) => [p.id, p.title]));
    const roots = new Map(snapshot.value.projects.map((p) => [p.id, p.workspaceRoot]));
    for (const p of snapshot.value.projects) {
      if (p.archivedAt) continue;
      projects.push({ key: `${environmentId}:${p.id}`, title: p.title, createdAt: p.createdAt });
    }
    for (const t of snapshot.value.threads) {
      details.set(`${environmentId}:${t.id}`, {
        project: titles.get(t.projectId) ?? null,
        model: t.modelSelection.model,
        branch: t.branch,
        startedAt: millis(t.latestRunStartedAt),
        cwd: t.worktreePath ?? roots.get(t.projectId) ?? null,
        runId: t.latestRunId,
        runtimeMode: t.runtimeMode,
        interactionMode: t.interactionMode,
      });
      threads.push({
        id: `${environmentId}:${t.id}`,
        environmentId,
        threadId: t.id,
        projectKey: `${environmentId}:${t.projectId}`,
        title: t.title,
        status: t.status,
        hasRequest: t.pendingRuntimeRequest !== null,
        error: t.lastError ?? null,
        hidden: t.archivedAt !== null || t.deletedAt !== null,
        finishedAt: millis(t.latestRunCompletedAt),
        updatedAt: millis(t.updatedAt) ?? 0,
      });
    }
  }
  return {
    connected: live.size > 0,
    threads,
    details,
    // Oldest first, so a new project takes the next free lot.
    projects: projects
      .toSorted((a, b) => a.createdAt.localeCompare(b.createdAt) || a.key.localeCompare(b.key))
      .map(({ key, title }) => ({ key, title })),
  };
}).pipe(Atom.withLabel("agentverse-live-threads"));

// A number, so the always-mounted sidebar only re-renders when the count changes.
export const needsYouCountAtom = Atom.make(
  (get) => get(liveThreadsAtom).threads.filter((t) => !t.hidden && t.hasRequest).length,
).pipe(Atom.withLabel("agentverse-needs-you-count"));

// Tells "still connecting" from "nothing reachable", which look the same with no live shells.
export const connectionSummaryAtom = Atom.make((get) => {
  const ids = [...enabledEnvironmentIds(get(environmentCatalog.catalogValueAtom))];
  let live = 0;
  let offline = 0;
  for (const id of ids) {
    if (get(environmentShell.statusAtom(id)) === "live") {
      live++;
      continue;
    }
    const state = AsyncResult.value(get(environmentCatalog.stateAtom(id)));
    if (Option.isNone(state)) continue;
    const c = state.value;
    if (c.phase === "offline" || c.phase === "blocked" || (c.phase === "backoff" && c.attempt > 2))
      offline++;
  }
  return `${ids.length}:${live}:${offline}`;
}).pipe(Atom.withLabel("agentverse-connection-summary"));
