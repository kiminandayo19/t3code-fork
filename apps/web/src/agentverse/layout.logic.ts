import campusMap from "./campus.map.json";
import type { Tile } from "./grid.logic";

// Tiled-shaped on purpose: the scene reads the hand-made demo campus and generated cities the same way.
export type Building = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties?: { name: string; value: unknown }[];
};

export type Layout = {
  key: string;
  n: number;
  ground: number[];
  buildings: Building[];
  spawn: Tile;
};

export type ProjectRef = { key: string; title: string };

const prop = (b: Building, k: string) => b.properties?.find((p) => p.name === k)?.value as string;

const demoBuildings = campusMap.layers[1]!.objects! as Building[];

export const DEMO_LAYOUT: Layout = {
  key: "demo",
  n: campusMap.width,
  ground: campusMap.layers[0]!.data as number[],
  buildings: demoBuildings,
  spawn: [10, 12],
};

const PITCH = 6; // a road every 6 tiles; each lot is the 5x5 block between roads
const MIN_LOTS = 3; // a new city starts as 3x3 lots, so the first projects do not look lost
const STYLES = ["Engineering Office", "Research Library", "Design Studio", "Testing Lab"].map(
  (name) => demoBuildings.find((b) => b.name === name)!,
);

// Lots fill in square rings, so the city grows to the east and south and no building ever moves.
export function lotCell(i: number): [number, number] {
  const m = Math.floor(Math.sqrt(i));
  const j = i - m * m;
  return j <= m ? [m, j] : [j - m - 1, m];
}

export function buildLayout(projects: readonly ProjectRef[]): Layout {
  const lots = Math.max(MIN_LOTS, Math.ceil(Math.sqrt(projects.length)));
  const n = lots * PITCH + 1;
  const ground = Array.from({ length: n * n }, (_, i) =>
    (i % n) % PITCH === 0 || Math.floor(i / n) % PITCH === 0 ? 2 : 1,
  );
  const buildings = projects.map((p, i): Building => {
    const [c, r] = lotCell(i);
    const style = STYLES[i % STYLES.length]!;
    return {
      name: p.title,
      x: c * PITCH + 2,
      y: r * PITCH + 2,
      width: style.width,
      height: style.height,
      properties: [
        { name: "district", value: p.key },
        { name: "sprites", value: prop(style, "sprites") },
        { name: "roofs", value: prop(style, "roofs") },
      ],
    };
  });
  return {
    key: JSON.stringify([n, projects.map((p) => [p.key, p.title])]),
    n,
    ground,
    buildings,
    spawn: [PITCH, PITCH],
  };
}
