import type { EnvironmentId, ScopedThreadRef, ThreadId } from "@t3tools/contracts";
import { useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useEffect, useState } from "react";

import { scopedThreadKey } from "@t3tools/client-runtime/environment";
import { useAssetUrlState } from "~/assets/assetUrls";
import { useRightPanelStore } from "~/rightPanelStore";
import ChatMarkdown from "~/components/ChatMarkdown";
import { getProjectFileQueryAtom } from "~/components/files/projectFilesQueryState";
import { workspaceAssetResource } from "~/components/files/filePreviewMode";
import { Button } from "~/components/ui/button";
import { Dialog, DialogPopup, DialogTitle } from "~/components/ui/dialog";
import { useAssistantMessageText, useThreadVisibleTurnItems } from "~/state/entities";
import { previewKind, runFiles } from "./resultFiles.logic";
import { SpeakButton } from "./SpeakButton";

export type ResultDialogProps = {
  environmentId: string;
  threadId: string;
  title: string;
  cwd: string | null;
  runId: string | null;
  onClose: () => void;
  onOpenThread: () => void;
};

const isAbsolute = (p: string) => p.startsWith("/") || /^[A-Za-z]:[\\/]/.test(p);
const absolutePathOf = (cwd: string, p: string) =>
  isAbsolute(p) ? p : `${cwd.replace(/[\\/]$/, "")}/${p}`;

type PreviewProps = { threadRef: ScopedThreadRef; cwd: string; path: string };

// Signed asset URLs only exist for image, HTML and PDF files; Markdown and text are read as text.
function AssetPreview(p: PreviewProps & { kind: "image" | "frame" }) {
  const asset = useAssetUrlState(
    p.threadRef.environmentId,
    workspaceAssetResource({
      kind: "media-file",
      threadRef: p.threadRef,
      draft: false,
      workspaceRoot: p.cwd,
      absolutePath: absolutePathOf(p.cwd, p.path),
    }),
  );
  if (asset._tag === "Loading") return <p className="p-3 text-muted-foreground">Loading...</p>;
  if (asset._tag !== "Success")
    return <p className="p-3 text-muted-foreground">This file cannot be previewed here.</p>;
  if (p.kind === "image")
    return <img className="max-h-full max-w-full object-contain" src={asset.url} alt={p.path} />;
  // sandbox without allow-scripts: agent-written HTML renders but cannot run code.
  return <iframe className="size-full bg-white" sandbox="" src={asset.url} title={p.path} />;
}

function TextPreview(p: PreviewProps & { markdown: boolean }) {
  const result = useAtomValue(
    getProjectFileQueryAtom(p.threadRef.environmentId, p.cwd, absolutePathOf(p.cwd, p.path)),
  );
  const file = Option.getOrUndefined(AsyncResult.value(result));
  if (!file)
    return (
      <p className="p-3 text-muted-foreground">
        {result._tag === "Failure" ? "This file cannot be previewed here." : "Loading..."}
      </p>
    );
  return p.markdown ? (
    <div className="p-4 text-sm">
      <ChatMarkdown text={file.contents} cwd={p.cwd} threadRef={p.threadRef} />
    </div>
  ) : (
    <pre className="p-4 text-xs break-words whitespace-pre-wrap">{file.contents}</pre>
  );
}

function FilePreview(p: PreviewProps) {
  const kind = previewKind(p.path);
  return kind === "image" || kind === "frame" ? (
    <AssetPreview {...p} kind={kind} />
  ) : (
    <TextPreview {...p} markdown={kind === "markdown"} />
  );
}

/** The final reply of the thread's latest run only, never earlier history. */
function useLastReply(environmentId: string, threadId: string, runId: string | null) {
  const ref = { environmentId: environmentId as EnvironmentId, threadId: threadId as ThreadId };
  const items = useThreadVisibleTurnItems(ref);
  const last = items.findLast(
    (i) => i.item.type === "assistant_message" && (runId === null || i.item.runId === runId),
  )?.item;
  const prompt = items.findLast(
    (i) => i.item.type === "user_message" && (runId === null || i.item.runId === runId),
  )?.item;
  return {
    items,
    text: useAssistantMessageText(ref, last?.id) || null,
    prompt: prompt?.type === "user_message" ? prompt.text : null,
  };
}

export function LastReplyPreview(p: {
  environmentId: string;
  threadId: string;
  runId: string | null;
}) {
  const { text } = useLastReply(p.environmentId, p.threadId, p.runId);
  return text ? (
    <div className="mt-3 rounded-md bg-muted p-2">
      <p className="line-clamp-3 text-xs break-words text-muted-foreground">{text}</p>
      <SpeakButton key={text} environmentId={p.environmentId} text={text} />
    </div>
  ) : null;
}

export function ResultDialog(p: ResultDialogProps) {
  const threadRef = {
    environmentId: p.environmentId as EnvironmentId,
    threadId: p.threadId as ThreadId,
  };
  const { items, text: message, prompt } = useLastReply(p.environmentId, p.threadId, p.runId);
  const [opened, setOpened] = useState<string[]>([]);
  const files = [...new Set([...runFiles(items, p.runId), ...opened])];
  const [picked, setPicked] = useState<string | null>(null);
  const key = scopedThreadKey(threadRef);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- markdown links open files through the thread's right-panel store, which Agentverse does not render; mirror those opens here
  useEffect(() => {
    const surfaces = (s = useRightPanelStore.getState()) => s.byThreadKey[key]?.surfaces ?? [];
    const seen = new Set(
      surfaces().map((f) => `${f.id}:${"revealRequestId" in f ? f.revealRequestId : 0}`),
    );
    return useRightPanelStore.subscribe((state) => {
      for (const f of surfaces(state)) {
        if (f.kind !== "file") continue;
        const id = `${f.id}:${f.revealRequestId}`;
        if (seen.has(id)) continue;
        seen.add(id);
        setOpened((o) => (o.includes(f.relativePath) ? o : [...o, f.relativePath]));
        setPicked(f.relativePath);
      }
    });
  }, [key]);
  return (
    <>
      <Dialog open onOpenChange={(open) => !open && p.onClose()}>
        <DialogPopup className="max-w-4xl">
          <div className="flex h-[70vh] flex-col gap-3 p-4">
            <DialogTitle>{p.title}</DialogTitle>
            {prompt && (
              <p className="max-h-24 shrink-0 overflow-y-auto rounded-md border border-border px-3 py-2 text-xs break-words whitespace-pre-wrap text-muted-foreground">
                {prompt}
              </p>
            )}
            <div className={`min-h-0 overflow-y-auto rounded-md bg-muted p-3 text-sm flex-1`}>
              {message ? (
                <>
                  <SpeakButton key={message} environmentId={p.environmentId} text={message} />
                  <ChatMarkdown text={message} cwd={p.cwd ?? undefined} threadRef={threadRef} />
                </>
              ) : (
                <p className="text-muted-foreground">No message yet.</p>
              )}
            </div>
            {files.length > 0 && p.cwd ? (
              <ul className="max-h-28 shrink-0 space-y-1 overflow-y-auto text-xs">
                {files.map((f) => (
                  <li key={f}>
                    <button
                      type="button"
                      className="w-full truncate rounded-md px-2 py-1 text-left hover:bg-accent"
                      onClick={() => setPicked(f)}
                    >
                      {f}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="shrink-0 text-xs text-muted-foreground">
                No files from the latest run.
              </p>
            )}
            <div className="flex shrink-0 justify-end gap-2">
              <Button size="compact" variant="outline" onClick={p.onOpenThread}>
                Open thread
              </Button>
              <Button size="compact" onClick={p.onClose}>
                Close
              </Button>
            </div>
          </div>
        </DialogPopup>
      </Dialog>
      <Dialog open={picked !== null} onOpenChange={(open) => !open && setPicked(null)}>
        <DialogPopup className="max-w-5xl">
          <div className="flex h-[80vh] flex-col gap-3 p-4">
            <DialogTitle>{picked?.split(/[\\/]/).pop()}</DialogTitle>
            <div className="flex min-h-0 flex-1 scrollbar-gutter-both items-center justify-center overflow-auto rounded-md border border-border">
              {picked && p.cwd && (
                <FilePreview key={picked} threadRef={threadRef} cwd={p.cwd} path={picked} />
              )}
            </div>
            <div className="flex shrink-0 justify-end">
              <Button size="compact" onClick={() => setPicked(null)}>
                Close
              </Button>
            </div>
          </div>
        </DialogPopup>
      </Dialog>
    </>
  );
}
