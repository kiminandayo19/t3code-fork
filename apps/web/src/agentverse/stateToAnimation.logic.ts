// Pure mapping from a thread shell row to what the campus shows. No tool events here: the shell row has none.
export type Animation = "idle" | "think" | "work" | "talk" | "success" | "error";

export type ThreadInput = {
  id: string;
  environmentId: string;
  threadId: string;
  projectKey: string;
  title: string;
  status: string;
  hasRequest: boolean;
  error: string | null;
  hidden: boolean;
  finishedAt: number | null;
  updatedAt: number;
};

export type AgentSpec = {
  id: string;
  environmentId: string;
  threadId: string;
  stoppable: boolean;
  attention: boolean;
  name: string;
  status: Animation;
  district: string;
  task: string;
  error: string | null;
};

export const RECENT_MS = 10 * 60_000;
export const MAX_AGENTS = 24;

const ACTIVE = new Set(["preparing", "queued", "starting", "running", "waiting"]);

export function mapThread(t: Pick<ThreadInput, "status" | "hasRequest">): { status: Animation } {
  if (t.hasRequest) return { status: "talk" };
  switch (t.status) {
    case "running":
      return { status: "work" };
    case "preparing":
    case "queued":
    case "starting":
    case "waiting":
      return { status: "think" };
    case "failed":
      return { status: "error" };
    case "completed":
      return { status: "success" };
    default:
      return { status: "idle" };
  }
}

// Only live work, a waiting request, or a recent finish becomes a character, so old threads do not fill the campus.
function visible(t: ThreadInput, now: number) {
  if (t.hidden) return false;
  if (t.hasRequest || ACTIVE.has(t.status)) return true;
  return (
    (t.status === "failed" || t.status === "completed") &&
    t.finishedAt !== null &&
    now - t.finishedAt < RECENT_MS
  );
}

const needsAttention = (m: { status: Animation }) => m.status === "talk" || m.status === "error";

// Blocked and failed threads sort first so the cap can never hide them; `overflow` counts what the cap dropped.
export function buildAgentSpecs(threads: readonly ThreadInput[], now: number) {
  const shown = threads
    .filter((t) => visible(t, now))
    .toSorted(
      (a, b) =>
        Number(needsAttention(mapThread(b))) - Number(needsAttention(mapThread(a))) ||
        b.updatedAt - a.updatedAt,
    );
  const specs: AgentSpec[] = shown.slice(0, MAX_AGENTS).map((t) => {
    const m = mapThread(t);
    return {
      id: t.id,
      environmentId: t.environmentId,
      threadId: t.threadId,
      stoppable: t.hasRequest || ACTIVE.has(t.status),
      attention: needsAttention(m),
      name: t.title.length > 18 ? `${t.title.slice(0, 17)}…` : t.title || "Untitled",
      status: m.status,
      district: t.projectKey,
      task: t.hasRequest ? "Waiting for your answer" : `Run ${t.status}`,
      error: m.status === "error" ? (t.error ?? "The run failed without an error message") : null,
    };
  });
  return { specs, overflow: shown.length - specs.length };
}

export function hashId(id: string) {
  let h = 0;
  for (const c of id) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0;
  return h;
}

export function formatDuration(ms: number) {
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "under a minute";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min`;
}

export const STATE_LABEL: Record<string, string> = {
  talk: "Needs you",
  error: "Failed",
  work: "Working",
  think: "Thinking",
  success: "Done",
  idle: "Idle",
  walk: "Moving",
  tool: "Using a tool",
};
