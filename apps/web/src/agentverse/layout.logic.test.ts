import { describe, expect, it } from "vite-plus/test";

import { buildCostGrid, findPath, frontTile } from "./grid.logic";
import { buildLayout, lotCell } from "./layout.logic";

const refs = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ key: `p${i}`, title: `Project ${i}` }));

describe("generated city", () => {
  it("fills lots in square rings without repeating a cell", () => {
    const cells = Array.from({ length: 16 }, (_, i) => lotCell(i));
    expect(new Set(cells.map(([c, r]) => `${c},${r}`)).size).toBe(16);
    expect(cells.slice(0, 4).every(([c, r]) => c < 2 && r < 2)).toBe(true);
  });

  it("expands only when full and never moves an existing building", () => {
    const small = buildLayout(refs(9));
    const grown = buildLayout(refs(10));
    expect(grown.n).toBeGreaterThan(small.n);
    expect(grown.buildings.slice(0, 9).map((b) => [b.x, b.y])).toEqual(
      small.buildings.map((b) => [b.x, b.y]),
    );
  });

  it("names each building after its project and lets agents reach every front", () => {
    const layout = buildLayout(refs(11));
    expect(layout.buildings.map((b) => b.name)).toEqual(refs(11).map((r) => r.title));
    const cost = buildCostGrid(layout.ground, layout.buildings, layout.n);
    for (const b of layout.buildings) {
      expect(findPath(cost, layout.n, layout.spawn, frontTile(b))).not.toBeNull();
    }
  });
});
