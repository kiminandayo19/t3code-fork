import { useEffect, useState, type RefObject } from "react";

export type SceneStats = {
  fps: number;
  idle: boolean;
  renderer: string;
  drawn: number;
  objects: number;
  zoom: number;
};

// Fed from the scene's 4 Hz frame callback, so only this panel re-renders.
export function Metrics(props: {
  statsRef: RefObject<((s: SceneStats) => void) | null>;
  counts: Record<string, number>;
  lowPower: boolean;
}) {
  const [s, setS] = useState<SceneStats | null>(null);
  const { statsRef } = props;
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- registers the scene callback, an external system
  useEffect(() => {
    statsRef.current = setS;
    return () => {
      statsRef.current = null;
    };
  }, [statsRef]);

  const rows: [string, string][] = [
    ["FPS", s ? (s.idle ? "0 (idle, loop asleep)" : s.fps.toFixed(0)) : "-"],
    ["Renderer", s ? `${s.renderer}${props.lowPower ? " (low power)" : ""}` : "-"],
    ["Objects drawn", s ? `${s.drawn} of ${s.objects}` : "-"],
    ["Zoom", s ? `${s.zoom.toFixed(2)}x` : "-"],
    ["Agents", String(Object.values(props.counts).reduce((a, b) => a + b, 0))],
    ...Object.entries(props.counts).map(([k, v]): [string, string] => [`  ${k}`, String(v)]),
  ];
  return (
    <section
      aria-label="Metrics"
      className="rounded-lg border border-border bg-card p-3 text-sm text-foreground shadow-md"
    >
      <h2 className="mb-2 font-semibold">Metrics</h2>
      <dl className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1 tabular-nums">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="whitespace-pre text-muted-foreground">{k}</dt>
            <dd className="text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
