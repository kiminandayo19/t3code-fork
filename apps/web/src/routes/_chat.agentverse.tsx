import { createFileRoute } from "@tanstack/react-router";

import { AgentversePage } from "../agentverse/AgentversePage";

export const Route = createFileRoute("/_chat/agentverse")({
  // ?thread=<thread id> opens the campus focused on that thread's agent.
  validateSearch: (raw: Record<string, unknown>): { thread?: string } =>
    typeof raw.thread === "string" && raw.thread.trim() ? { thread: raw.thread } : {},
  component: AgentversePage,
});
