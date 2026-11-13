import type { OrchestrationV2ProjectedTurnItem } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import { previewKind, runFiles } from "./resultFiles.logic";

const row = (item: object) => ({ item }) as unknown as OrchestrationV2ProjectedTurnItem;

describe("runFiles", () => {
  it("collects the latest run's written files once, skipping removals", () => {
    const items = [
      row({ type: "file_change", runId: "old", fileName: "old.md" }),
      row({
        type: "file_change",
        runId: "r1",
        fileName: "a.html",
        changes: [
          { operation: "create", path: "a.html" },
          { operation: "delete", path: "gone.txt" },
        ],
      }),
      row({ type: "file_change", runId: "r1", fileName: "b.png" }),
      row({
        type: "checkpoint",
        runId: "r1",
        files: [
          { path: "a.html", kind: "added" },
          { path: "c.md", kind: "modified" },
          { path: "d.md", kind: "deleted" },
        ],
      }),
    ];
    expect(runFiles(items, "r1")).toEqual(["a.html", "b.png", "c.md"]);
  });

  it("classifies previews by extension", () => {
    expect(["a.PNG", "a.pdf", "a.md", "a.ts"].map(previewKind)).toEqual([
      "image",
      "frame",
      "markdown",
      "text",
    ]);
  });
});
