import { frontTile, type Tile } from "./grid.logic";
import campusMap from "./campus.map.json";

export type PatrolStop = {
  tile: Tile;
  act?: "think" | "work" | "tool" | "talk" | "success" | "error";
};

const front = (name: string) =>
  frontTile(campusMap.layers[1]!.objects!.find((o) => o.name === name)!);

// DEMO routes between districts; tiles are building fronts or plaza tiles. Replaced by real state in task 04.
export const PATROLS: Record<string, PatrolStop[]> = {
  nova: [
    { tile: front("Engineering Office"), act: "work" },
    { tile: front("Central Command"), act: "talk" },
    { tile: front("Testing Lab"), act: "tool" },
  ],
  atlas: [
    { tile: front("Research Library"), act: "think" },
    { tile: [10, 12], act: "talk" },
    { tile: front("Engineering Office"), act: "work" },
  ],
  pixel: [
    { tile: front("Design Studio"), act: "work" },
    { tile: front("Garden Cafe"), act: "success" },
    { tile: front("Central Command"), act: "think" },
  ],
  echo: [
    { tile: front("Testing Lab"), act: "tool" },
    { tile: front("Research Library"), act: "error" },
    { tile: front("Garden Cafe"), act: "talk" },
  ],
};
