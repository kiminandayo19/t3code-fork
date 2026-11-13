import { useAtomValue } from "@effect/atom-react";
import type { EnvironmentId, ThreadId } from "@t3tools/contracts";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import { toastManager } from "~/components/ui/toast";
import { useServerConfigs } from "~/state/entities";
import { threadEnvironment } from "~/state/threads";
import { useOrchestrationCommand } from "~/state/use-orchestration-command";
import type { MinimapFrame, Selection } from "./characters";
import { Inspector } from "./Inspector";
import { loadCampusGame } from "./loadCampusGame";
import { MessageDock } from "./MessageDock";
import { ResultDialog } from "./ResultDialog";
import { Metrics, type SceneStats } from "./Metrics";
import { Minimap } from "./Minimap";
import { Roster } from "./Roster";
import { newMessageId } from "~/lib/utils";
import { connectionSummaryAtom, liveThreadsAtom } from "./liveThreads";
import { readPrefs, writePrefs, type View } from "./prefs";
import { buildLayout, DEMO_LAYOUT, type Layout } from "./layout.logic";
import { buildAgentSpecs, type AgentSpec } from "./stateToAnimation.logic";

type Game = {
  overview: () => void;
  focus: (district: string) => void;
  follow: (id: string | null) => void;
  panTo: (x: number, y: number) => void;
  setSpecs: (specs: AgentSpec[]) => void;
  setDemo: (on: boolean) => void;
  reveal: (id: string) => void;
  getView: () => View;
  setLayout: (layout: Layout) => void;
  destroy: () => void;
};

const countBy = (specs: readonly AgentSpec[]) => {
  const out: Record<string, number> = {};
  for (const s of specs) out[s.status] = (out[s.status] ?? 0) + 1;
  return out;
};

const ATTENTION_SHOWN = 4;

export function AgentversePage() {
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<Game | null>(null);
  const setStats = useRef<((s: SceneStats) => void) | null>(null);
  const drawMinimap = useRef<((f: MinimapFrame) => void) | null>(null);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [following, setFollowing] = useState(false);
  const [ready, setReady] = useState(false);
  const [demo, setDemo] = useState(false);
  const [lowPower, setLowPower] = useState(
    () => readPrefs().lowPower ?? matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const openedThread = useRef<string | null>(null);
  const { thread: linkedThread } = useSearch({ from: "/_chat/agentverse" });
  const serverConfigs = useServerConfigs();
  const [total, liveCount, offlineCount] = useAtomValue(connectionSummaryAtom)
    .split(":")
    .map(Number) as [number, number, number];
  const navigate = useNavigate();
  const startTurn = useOrchestrationCommand(threadEnvironment.startTurn, { reportFailure: false });
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [stopping, setStopping] = useState<string | null>(null);
  const [showMetrics, setShowMetrics] = useState(() => readPrefs().metrics ?? false);
  const interrupt = useOrchestrationCommand(threadEnvironment.interruptTurn, {
    reportFailure: false,
  });
  const live = useAtomValue(liveThreadsAtom);
  const [now, setNow] = useState(() => Date.now());
  const layout = demo ? DEMO_LAYOUT : buildLayout(live.projects);
  const { specs, overflow } = buildAgentSpecs(live.threads, now);
  const attention = specs.filter((s) => s.attention);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- timer that lets finished threads leave the campus
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- mounts and tears down the Phaser canvas, an external system
  useEffect(() => {
    let cancelled = false;
    void loadCampusGame().then(({ createCampusGame }) => {
      if (cancelled || !host.current) return;
      game.current = createCampusGame(
        host.current,
        lowPower,
        {
          onSelect: setSelected,
          onFollow: setFollowing,
          onFrame: (f, s) => {
            drawMinimap.current?.(f);
            setStats.current?.(s);
          },
        },
        readPrefs().view,
      );
      setReady(true);
    });
    return () => {
      cancelled = true;
      setReady(false);
      if (game.current) writePrefs({ view: game.current.getView() });
      game.current?.destroy();
      game.current = null;
    };
  }, [lowPower]);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- pushes thread state into the Phaser scene, an external system
  useEffect(() => {
    if (ready) game.current?.setSpecs(specs);
  }, [ready, specs]);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- builds a building per project in the Phaser scene
  useEffect(() => {
    if (ready) game.current?.setLayout(buildLayout(live.projects));
  }, [ready, live.projects]);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- focuses the linked thread once its agent exists in the scene
  useEffect(() => {
    if (!ready || demo || !linkedThread || openedThread.current === linkedThread) return;
    const spec = specs.find((s) => s.threadId === linkedThread);
    if (!spec) return;
    game.current?.reveal(spec.id);
    openedThread.current = linkedThread;
  }, [ready, demo, linkedThread, specs]);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- switches the Phaser scene between real and demo agents
  useEffect(() => {
    if (ready) game.current?.setDemo(demo);
  }, [ready, demo]);

  const live_ =
    !demo && selected?.kind === "agent" ? specs.find((s) => s.id === selected.id) : undefined;

  const openThread = () =>
    live_ &&
    void navigate({
      to: "/$environmentId/$threadId",
      params: { environmentId: live_.environmentId, threadId: live_.threadId },
    });

  const stop = async (spec: AgentSpec) => {
    setStopping(spec.id);
    const result = await interrupt({
      environmentId: spec.environmentId as EnvironmentId,
      input: { threadId: spec.threadId as ThreadId },
    });
    setStopping(null);
    if (result._tag === "Failure") {
      toastManager.add({ type: "error", title: "Could not stop the thread" });
    }
  };

  const send = async (spec: AgentSpec, dictated?: string) => {
    const modes = live.details.get(spec.id);
    const text = (dictated ?? draft).trim();
    if (!modes || !text || sending) return;
    setSending(true);
    const result = await startTurn({
      environmentId: spec.environmentId as EnvironmentId,
      input: {
        threadId: spec.threadId as ThreadId,
        message: { messageId: newMessageId(), role: "user", text, attachments: [] },
        runtimeMode: modes.runtimeMode,
        interactionMode: modes.interactionMode,
        dispatchMode: "auto",
      },
    });
    setSending(false);
    if (result._tag === "Failure")
      toastManager.add({ type: "error", title: "Could not send the message" });
    else setDraft("");
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        ref={host}
        role="img"
        aria-label="Isometric campus view of your agents. Use the thread list for keyboard access."
        className="absolute inset-0"
      />
      <p className="sr-only" aria-live="polite">
        {attention.length > 0 ? `${attention.length} threads need attention` : ""}
      </p>
      <p className="absolute inset-x-3 bottom-16 rounded-md border border-border bg-card p-2 text-xs text-muted-foreground md:hidden">
        Agentverse is built for desktop-sized windows. Panels may overlap here.
      </p>
      <div className="absolute top-3 left-3 flex flex-col items-start gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-border bg-card px-2 py-1 text-xs font-semibold text-foreground shadow-xs">
            {demo
              ? "DEMO: simulated agents, not your threads"
              : liveCount === 0 && offlineCount >= total && total > 0
                ? "Offline: no environment is reachable"
                : liveCount === 0
                  ? "Connecting to your environments"
                  : specs.length === 0
                    ? "No active threads right now"
                    : `${specs.length} live ${specs.length === 1 ? "thread" : "threads"}${overflow > 0 ? `, ${overflow} more not shown` : ""}${liveCount < total ? `, ${liveCount} of ${total} environments connected` : ""}`}
          </span>
          <Button size="compact" variant="outline" onClick={() => setDemo(!demo)}>
            {demo ? "Back to live threads" : "Preview demo"}
          </Button>
          <Button
            size="compact"
            variant="outline"
            title="Low power draws with Canvas at 15 fps. It looks the same and uses less GPU."
            onClick={() => {
              writePrefs({ lowPower: !lowPower });
              setLowPower(!lowPower);
            }}
          >
            {lowPower ? "Full quality" : "Low power"}
          </Button>
          <Button
            size="compact"
            variant="outline"
            onClick={() => {
              writePrefs({ metrics: !showMetrics });
              setShowMetrics(!showMetrics);
            }}
          >
            {showMetrics ? "Hide metrics" : "Metrics"}
          </Button>
        </div>
        {!demo && attention.length > 0 && (
          <div
            role="region"
            aria-label="Needs attention"
            className="flex max-w-lg flex-wrap items-center gap-1.5 rounded-lg border border-border bg-card p-1.5 shadow-xs"
          >
            {attention.slice(0, ATTENTION_SHOWN).map((s) => (
              <Button
                key={s.id}
                size="compact"
                variant="outline"
                onClick={() => game.current?.reveal(s.id)}
              >
                {s.status === "error" ? "Failed" : "Needs you"}: {s.name}
              </Button>
            ))}
            {attention.length > ATTENTION_SHOWN && (
              <span className="px-1 text-xs text-muted-foreground">
                +{attention.length - ATTENTION_SHOWN} more
              </span>
            )}
          </div>
        )}
        {!demo && specs.length > 0 && (
          <Roster
            specs={specs}
            details={live.details}
            selectedId={selected?.kind === "agent" ? selected.id : null}
            onPick={(id) => game.current?.reveal(id)}
          />
        )}
        {showMetrics && (
          <Metrics statsRef={setStats} lowPower={lowPower} counts={demo ? {} : countBy(specs)} />
        )}
      </div>
      {selected && (
        <Inspector
          selected={selected}
          spec={live_}
          details={live_ ? live.details.get(live_.id) : undefined}
          now={now}
          environment={
            total > 1 && live_
              ? serverConfigs.get(live_.environmentId as EnvironmentId)?.environment.label
              : undefined
          }
          onPickAgent={(id) => game.current?.reveal(id)}
          following={following}
          stopping={stopping === live_?.id}
          onOpen={openThread}
          onStop={() => live_ && void stop(live_)}
          onViewResult={() => setResultOpen(true)}
          onFollow={() => {
            if (selected.kind !== "agent") return;
            setFollowing(!following);
            game.current?.follow(following ? null : selected.id);
          }}
        />
      )}
      {live_ && (
        <MessageDock
          environmentId={live_.environmentId}
          threadId={live_.threadId}
          name={selected?.name ?? ""}
          draft={draft}
          sending={sending}
          onDraft={setDraft}
          onSend={(text) => void send(live_, text)}
        />
      )}
      {resultOpen && live_ && (
        <ResultDialog
          environmentId={live_.environmentId}
          threadId={live_.threadId}
          title={selected?.name ?? ""}
          cwd={live.details.get(live_.id)?.cwd ?? null}
          runId={live.details.get(live_.id)?.runId ?? null}
          onClose={() => setResultOpen(false)}
          onOpenThread={openThread}
        />
      )}
      {!demo && live.connected && specs.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="pointer-events-auto max-w-xs rounded-lg border border-border bg-card p-4 text-center text-sm text-foreground shadow-md">
            <h2 className="font-semibold">Nothing is running</h2>
            <p className="mt-1 text-muted-foreground">
              Threads that are working, waiting for you, or just finished show up here as agents.
            </p>
            <div className="mt-3 flex justify-center gap-2">
              <Button size="compact" onClick={() => void navigate({ to: "/" })}>
                Start a thread
              </Button>
              <Button size="compact" variant="outline" onClick={() => setDemo(true)}>
                Preview with demo agents
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="absolute right-3 bottom-3 rounded-lg border border-border bg-card p-1.5 shadow-xs">
        <Minimap
          layout={layout}
          drawRef={drawMinimap}
          onPan={(x, y) => game.current?.panTo(x, y)}
        />
      </div>
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 rounded-lg border border-border bg-card p-1.5 shadow-xs">
        <Button size="compact" variant="outline" onClick={() => game.current?.overview()}>
          Overview
        </Button>
        {layout.buildings.map((b) => {
          const id = b.properties?.find((x) => x.name === "district")?.value as string;
          return (
            <Button
              key={id}
              size="compact"
              variant="outline"
              onClick={() => game.current?.focus(id)}
            >
              {b.name}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
