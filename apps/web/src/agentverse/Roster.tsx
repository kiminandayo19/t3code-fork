import { useState } from "react";

import type { AgentDetails } from "./liveThreads";
import { STATE_LABEL, type AgentSpec } from "./stateToAnimation.logic";

export function Roster(props: {
  specs: readonly AgentSpec[];
  details: ReadonlyMap<string, AgentDetails>;
  selectedId: string | null;
  onPick: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const rows = props.specs.filter(
    (s) =>
      q === "" ||
      s.name.toLowerCase().includes(q) ||
      (props.details.get(s.id)?.project ?? "").toLowerCase().includes(q),
  );
  return (
    <section
      aria-label="Threads"
      className="flex w-64 flex-col gap-1.5 rounded-lg border border-border bg-card p-2 text-sm text-foreground shadow-xs"
    >
      <input
        type="search"
        aria-label="Search threads"
        placeholder="Search threads"
        className="rounded-md border border-border bg-background px-2 py-1 text-xs"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ul className="max-h-60 space-y-0.5 overflow-y-auto">
        {rows.length === 0 && <li className="px-1 py-2 text-xs text-muted-foreground">No match</li>}
        {rows.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              aria-current={props.selectedId === s.id}
              onClick={() => props.onPick(s.id)}
              className="flex w-full flex-col rounded-md px-2 py-1 text-left hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring aria-[current=true]:bg-accent"
            >
              <span className="truncate font-medium">{s.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {STATE_LABEL[s.status]}
                {props.details.get(s.id)?.project ? ` · ${props.details.get(s.id)!.project}` : ""}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
