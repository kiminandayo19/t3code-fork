import { useAtomValue } from "@effect/atom-react";
import type { EnvironmentId } from "@t3tools/contracts";
import { useEffect, useRef, useState } from "react";

import {
  ComposerPromptEditorTiptap as ComposerPromptEditor,
  type ComposerPromptEditorHandle,
} from "~/components/ComposerPromptEditorTiptap";
import { EMPTY_COMPOSER_CONTEXT_RECORDS } from "~/components/composerContextPresentation";
import { Button } from "~/components/ui/button";
import { useDictationShortcut } from "~/speech/useDictationShortcut";
import { useEnvironmentSpeechInput } from "~/speech/useEnvironmentSpeechInput";
import { TextFieldSpeechControls } from "~/speech/useTextFieldSpeech";
import { primaryServerKeybindingsAtom } from "~/state/server";

const noop = () => {};

/**
 * Bottom-center message box for the selected agent. It reuses the chat composer's editor, so
 * markdown shortcuts (```, #, -, >, **bold**) format as you type and the draft stays markdown.
 */
export function MessageDock(p: {
  environmentId: string;
  threadId: string;
  name: string;
  draft: string;
  sending: boolean;
  onDraft: (v: string) => void;
  onSend: (text?: string) => void;
}) {
  const editorRef = useRef<ComposerPromptEditorHandle>(null);
  const [cursor, setCursor] = useState(p.draft.length);
  const keybindings = useAtomValue(primaryServerKeybindingsAtom);
  const speech = useEnvironmentSpeechInput({
    environmentId: p.environmentId as EnvironmentId,
    ownerKey: JSON.stringify(["agentverse-message", p.environmentId, p.threadId]),
    disabled: p.sending,
    offerSetup: true,
    readDraft: () => {
      const snapshot = editorRef.current?.readSnapshot();
      const range = editorRef.current?.readSelectionRange();
      const text = snapshot?.value ?? p.draft;
      const at = snapshot?.cursor ?? text.length;
      return { text, selection: { start: range?.start ?? at, end: range?.end ?? at } };
    },
    commitDraft: (text, selection) => {
      p.onDraft(text);
      setCursor(selection.start);
      window.requestAnimationFrame(() => editorRef.current?.focusAt(selection.start));
    },
  });
  const shortcutLabel = useDictationShortcut({
    keybindings,
    speech,
    disabled: p.sending,
    terminalOpen: false,
    modelPickerOpen: false,
  });
  const recording = speech.state.phase === "recording";
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- silences a spoken reply so the mic does not record it
  useEffect(() => {
    if (recording && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, [recording]);

  const send = () => speech.submitAfterDictation((text) => p.onSend(text));
  const canSend =
    !p.sending && !speech.preparing && (p.draft.trim() !== "" || speech.blocksSubmission);

  return (
    <section
      aria-label={`Message ${p.name}`}
      className="absolute bottom-3 left-1/2 flex w-[clamp(20rem,calc(100%-40rem),46rem)] -translate-x-1/2 flex-col gap-2 rounded-lg border border-border bg-card p-3 text-sm text-foreground shadow-md"
    >
      <p className="truncate text-xs text-muted-foreground">Message {p.name}</p>
      <div className="max-h-[40vh] min-h-14 overflow-y-auto rounded-md border border-border bg-background px-3 py-2">
        <ComposerPromptEditor
          draftKey={p.threadId}
          ariaLabel="Message to this thread"
          editorRef={editorRef}
          value={p.draft}
          cursor={cursor}
          richTextEnabled
          convertFenceOnType
          contextRecords={EMPTY_COMPOSER_CONTEXT_RECORDS}
          skills={[]}
          disabled={p.sending || speech.freezesEditor}
          placeholder="Message the agent. Type ``` for code, # for a heading. Shift+Enter adds a line."
          className="min-h-10"
          onChange={(value, nextCursor) => {
            p.onDraft(value);
            setCursor(nextCursor);
          }}
          onCommandKeyDown={(key, event, inList) => {
            if (key !== "Enter" || event.shiftKey || event.isComposing) return false;
            // Enter inside a list continues the list; Ctrl/Cmd+Enter always sends.
            if (inList && !(event.metaKey || event.ctrlKey)) return false;
            if (canSend) send();
            return true;
          }}
          onPaste={noop}
        />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <TextFieldSpeechControls speech={{ ...speech, shortcutLabel }} disabled={p.sending} />
        <Button size="compact" disabled={!canSend} onClick={send}>
          Send
        </Button>
      </div>
    </section>
  );
}
