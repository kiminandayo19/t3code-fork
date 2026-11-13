// Pure grid + pathfinding for the campus. Costs make agents prefer roads over grass.
export type Tile = readonly [number, number];
type Block = { x: number; y: number; width: number; height: number };

const ROAD = 2;
const PLAZA = 3;
const WATER = 5;

const COST: Record<number, number> = { [ROAD]: 1, [PLAZA]: 1.2 };

export function buildCostGrid(ground: readonly number[], blocks: readonly Block[], n: number) {
  const cost = ground.map((id) => (id === WATER ? Infinity : (COST[id] ?? 2.5)));
  for (const b of blocks)
    for (let y = b.y; y < b.y + b.height; y++)
      for (let x = b.x; x < b.x + b.width; x++) cost[y * n + x] = Infinity;
  return cost;
}

const STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

// Dijkstra over 4-neighbours; the grid is ~400 tiles so a linear-scan queue is plenty.
export function findPath(cost: readonly number[], n: number, from: Tile, to: Tile): Tile[] | null {
  const idx = (t: Tile) => t[1] * n + t[0];
  if (!Number.isFinite(cost[idx(from)] ?? Infinity) || !Number.isFinite(cost[idx(to)] ?? Infinity))
    return null;
  const dist = new Map<number, number>([[idx(from), 0]]);
  const prev = new Map<number, number>();
  const open = new Set<number>([idx(from)]);
  while (open.size) {
    let cur = -1;
    for (const i of open) if (cur < 0 || dist.get(i)! < dist.get(cur)!) cur = i;
    open.delete(cur);
    if (cur === idx(to)) break;
    const cx = cur % n;
    const cy = Math.floor(cur / n);
    for (const [dx, dy] of STEPS) {
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || y < 0 || x >= n || y >= n) continue;
      const c = cost[y * n + x]!;
      if (!Number.isFinite(c)) continue;
      const d = dist.get(cur)! + c;
      if (d < (dist.get(y * n + x) ?? Infinity)) {
        dist.set(y * n + x, d);
        prev.set(y * n + x, cur);
        open.add(y * n + x);
      }
    }
  }
  if (!dist.has(idx(to))) return null;
  const path: Tile[] = [];
  for (let i: number | undefined = idx(to); i !== undefined; i = prev.get(i)) {
    path.push([i % n, Math.floor(i / n)]);
  }
  return path.reverse();
}

// The tile just outside a building's front (south) corner, where an agent stands to "enter".
export const frontTile = (b: Block): Tile => [b.x + b.width, b.y + b.height];

// Walkable tiles around `tile`, nearest first, so agents sent to one building do not stack on one tile.
export function standingSlots(cost: readonly number[], n: number, tile: Tile, radius = 3): Tile[] {
  const out: { t: Tile; d: number }[] = [];
  for (let y = tile[1] - radius; y <= tile[1] + radius; y++) {
    for (let x = tile[0] - radius; x <= tile[0] + radius; x++) {
      if (x < 0 || y < 0 || x >= n || y >= n) continue;
      if (!Number.isFinite(cost[y * n + x]!)) continue;
      out.push({ t: [x, y], d: Math.abs(x - tile[0]) + Math.abs(y - tile[1]) });
    }
  }
  return out.toSorted((a, b) => a.d - b.d || a.t[1] - b.t[1] || a.t[0] - b.t[0]).map((o) => o.t);
}
