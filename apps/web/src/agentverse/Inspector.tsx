import { Button } from "~/components/ui/button";
import { LastReplyPreview } from "./ResultDialog";
import type { Selection } from "./characters";
import type { AgentDetails } from "./liveThreads";
import { formatDuration, STATE_LABEL, type AgentSpec } from "./stateToAnimation.logic";

export type InspectorProps = {
  selected: Selection;
  spec: AgentSpec | undefined;
  details: AgentDetails | undefined;
  now: number;
  environment: string | undefined;
  onPickAgent: (id: string) => void;
  following: boolean;
  stopping: boolean;
  onOpen: () => void;
  onStop: () => void;
  onViewResult: () => void;
  onFollow: () => void;
};

export function Inspector(p: InspectorProps) {
  const { selected, spec, details } = p;
  const running = spec?.stoppable ?? false;
  const since = details?.startedAt ? formatDuration(p.now - details.startedAt) : null;
  return (
    <aside className="absolute top-3 right-3 w-64 rounded-lg border border-border bg-card p-3 text-sm text-foreground shadow-md">
      <div className="flex items-center gap-2">
        {selected.kind === "agent" && (
          <span
            className="size-3 rounded-full"
            style={{ backgroundColor: selected.color }}
            aria-hidden
          />
        )}
        <h2 className="min-w-0 truncate font-semibold">{selected.name}</h2>
        {selected.kind === "agent" && selected.demo && (
          <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-3xs font-semibold text-muted-foreground uppercase">
            Demo
          </span>
        )}
      </div>
      {selected.kind === "agent" ? (
        <>
          {selected.demo && <p className="text-muted-foreground">{selected.role}</p>}
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
            <dt className="text-muted-foreground">Status</dt>
            <dd>{STATE_LABEL[selected.status] ?? selected.status}</dd>
            {selected.demo && (
              <>
                <dt className="text-muted-foreground">Task</dt>
                <dd>{selected.task}</dd>
              </>
            )}
            {p.environment && (
              <>
                <dt className="text-muted-foreground">Environment</dt>
                <dd className="break-words">{p.environment}</dd>
              </>
            )}
            {details?.project && (
              <>
                <dt className="text-muted-foreground">Project</dt>
                <dd className="break-words">{details.project}</dd>
              </>
            )}
            {details && (
              <>
                <dt className="text-muted-foreground">Model</dt>
                <dd className="break-words">{details.model}</dd>
              </>
            )}
            {details?.branch && (
              <>
                <dt className="text-muted-foreground">Branch</dt>
                <dd className="break-words">{details.branch}</dd>
              </>
            )}
            {since && (
              <>
                <dt className="text-muted-foreground">{running ? "Running" : "Last run"}</dt>
                <dd>{running ? since : `started ${since} ago`}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Location</dt>
            <dd>{selected.location}</dd>
          </dl>
          {spec && (
            <LastReplyPreview
              environmentId={spec.environmentId}
              threadId={spec.threadId}
              runId={details?.runId ?? null}
            />
          )}
          {selected.error && (
            <p
              role="alert"
              className="mt-3 max-h-32 overflow-y-auto rounded-md border border-border bg-muted p-2 text-xs break-words whitespace-pre-wrap text-destructive-foreground"
            >
              {selected.error}
            </p>
          )}
          {spec && (
            <div className="mt-3 flex gap-2">
              <Button className="flex-1" size="compact" onClick={p.onOpen}>
                {spec.status === "talk" ? "Answer" : "Open thread"}
              </Button>
              {running && (
                <Button
                  className="flex-1"
                  size="compact"
                  variant="outline"
                  disabled={p.stopping}
                  onClick={p.onStop}
                >
                  {p.stopping ? "Stopping..." : "Stop"}
                </Button>
              )}
            </div>
          )}
          {spec && (
            <Button
              className="mt-2 w-full"
              size="compact"
              variant="outline"
              onClick={p.onViewResult}
            >
              View result
            </Button>
          )}
          <Button className="mt-2 w-full" size="compact" variant="ghost" onClick={p.onFollow}>
            {p.following ? "Stop following" : "Follow with camera"}
          </Button>
        </>
      ) : (
        <>
          <p className="text-muted-foreground">Occupants</p>
          {selected.occupants.length === 0 ? (
            <p className="mt-1">Nobody nearby</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {selected.occupants.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-left hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    onClick={() => p.onPickAgent(o.id)}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: o.color }}
                      aria-hidden
                    />
                    <span className="truncate">{o.name}</span>
                    <span className="ml-auto text-muted-foreground">
                      {STATE_LABEL[o.status] ?? o.status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </aside>
  );
}
