import { describe, expect, it } from "vite-plus/test";

import campusMap from "./campus.map.json";
import { PATROLS } from "./demoPatrols";
import { buildCostGrid, findPath, frontTile, standingSlots } from "./grid.logic";

const N = campusMap.width;
const ground = campusMap.layers[0]!.data as number[];
const buildings = campusMap.layers[1]!.objects!;
const cost = buildCostGrid(ground, buildings, N);
const inside = ([x, y]: readonly [number, number]) =>
  buildings.some((b) => x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height);

describe("campus pathfinding", () => {
  it("refuses blocked tiles", () => {
    const b = buildings[0]!;
    expect(findPath(cost, N, [b.x, b.y], [1, 1])).toBeNull();
    expect(findPath(cost, N, [1, 1], [b.x, b.y])).toBeNull();
  });

  it("prefers roads over cutting across grass", () => {
    const path = findPath(cost, N, [1, 6], [18, 6])!;
    expect(path).toHaveLength(18);
    expect(path.every(([, y]) => y === 6)).toBe(true);
  });

  it("links every demo stop to the next one without crossing a building", () => {
    for (const stops of Object.values(PATROLS)) {
      for (let i = 0; i < stops.length; i++) {
        const path = findPath(cost, N, stops[i]!.tile, stops[(i + 1) % stops.length]!.tile);
        expect(path).not.toBeNull();
        expect(path!.some(inside)).toBe(false);
      }
    }
  });

  it("offers distinct walkable standing slots, front tile first", () => {
    const front = frontTile(buildings[0]!);
    const slots = standingSlots(cost, N, front);
    expect(slots[0]).toEqual(front);
    expect(new Set(slots.map(([x, y]) => `${x},${y}`)).size).toBe(slots.length);
    expect(slots.length).toBeGreaterThan(8);
    expect(slots.every(([x, y]) => Number.isFinite(cost[y * N + x]!))).toBe(true);
  });
});
