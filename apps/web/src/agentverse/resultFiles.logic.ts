import type { OrchestrationV2ProjectedTurnItem } from "@t3tools/contracts";

const deleted = (kind: string) => /delet|remov/i.test(kind);

/** Files the given run wrote, in first-seen order, without ones it removed. */
export function runFiles(
  items: ReadonlyArray<OrchestrationV2ProjectedTurnItem>,
  runId: string | null,
): string[] {
  const files = new Set<string>();
  for (const { item } of items) {
    if (runId !== null && item.runId !== runId) continue;
    if (item.type === "file_change") {
      if (item.changes === undefined) files.add(item.fileName);
      else for (const c of item.changes) if (!deleted(c.operation)) files.add(c.path);
    } else if (item.type === "checkpoint") {
      for (const f of item.files) if (!deleted(f.kind)) files.add(f.path);
    }
  }
  return [...files];
}

export type PreviewKind = "image" | "frame" | "markdown" | "text";

export function previewKind(path: string): PreviewKind {
  if (/\.(?:png|jpe?g|gif|webp|svg|avif)$/i.test(path)) return "image";
  if (/\.(?:html?|pdf)$/i.test(path)) return "frame";
  if (/\.(?:md|mdx|markdown)$/i.test(path)) return "markdown";
  return "text";
}
