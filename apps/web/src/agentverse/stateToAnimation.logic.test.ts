import { describe, expect, it } from "vite-plus/test";

import {
  buildAgentSpecs,
  formatDuration,
  mapThread,
  MAX_AGENTS,
  RECENT_MS,
  type ThreadInput,
} from "./stateToAnimation.logic";

const base: ThreadInput = {
  id: "t",
  environmentId: "e",
  threadId: "t",
  projectKey: "e:p",
  title: "Thread",
  status: "idle",
  hasRequest: false,
  error: null,
  hidden: false,
  finishedAt: null,
  updatedAt: 0,
};
const NOW = 1_000_000;

describe("stateToAnimation", () => {
  it("maps run status to animation and district", () => {
    expect(mapThread({ status: "running", hasRequest: false })).toEqual({ status: "work" });
    expect(mapThread({ status: "running", hasRequest: true }).status).toBe("talk");
    expect(mapThread({ status: "waiting", hasRequest: false }).status).toBe("think");
    expect(mapThread({ status: "failed", hasRequest: false }).status).toBe("error");
    expect(mapThread({ status: "cancelled", hasRequest: false }).status).toBe("idle");
  });

  it("shows active, waiting and recently finished threads, hides the rest", () => {
    const { specs } = buildAgentSpecs(
      [
        { ...base, id: "run", status: "running" },
        { ...base, id: "old", status: "completed", finishedAt: NOW - RECENT_MS - 1 },
        { ...base, id: "fresh", status: "failed", finishedAt: NOW - 1000, error: "boom" },
        { ...base, id: "gone", status: "running", hidden: true },
        { ...base, id: "idle" },
      ],
      NOW,
    );
    expect(specs.map((s) => s.id).toSorted()).toEqual(["fresh", "run"]);
    expect(specs.find((s) => s.id === "fresh")?.error).toBe("boom");
  });

  it("gives a failed thread without a message a visible error", () => {
    const [spec] = buildAgentSpecs(
      [{ ...base, status: "failed", finishedAt: NOW, error: null }],
      NOW,
    ).specs;
    expect(spec?.error).toBeTruthy();
  });

  it("keeps blocked threads when the cap drops others", () => {
    const many = Array.from({ length: MAX_AGENTS + 3 }, (_, i) => ({
      ...base,
      id: `r${i}`,
      status: "running",
      updatedAt: 100 + i,
    }));
    const { specs, overflow } = buildAgentSpecs(
      [...many, { ...base, id: "blocked", status: "running", hasRequest: true, updatedAt: 0 }],
      NOW,
    );
    expect(specs).toHaveLength(MAX_AGENTS);
    expect(overflow).toBe(4);
    expect(specs[0]?.id).toBe("blocked");
  });

  it("formats durations", () => {
    expect(formatDuration(20_000)).toBe("under a minute");
    expect(formatDuration(5 * 60_000)).toBe("5 min");
    expect(formatDuration(135 * 60_000)).toBe("2 h 15 min");
  });
});
