# 07 Message dock and voice input

**Status:** Done. Not seen in a browser by the agent that wrote it.
**Scope:** message the selected agent from a roomy bottom-center box, by typing Markdown or by voice.
**Done when:** selecting a live agent shows the dock; typing, dictating and sending work and reach the thread as one turn.
**Verify:** web typecheck and lint.

## How it works

- `MessageDock.tsx` reuses the chat composer's editor, `ComposerPromptEditorTiptap` with `richTextEnabled`. The draft is Markdown in and out, so `#`, `-`, `>` and `**bold**` format as you type.
- A new opt-in prop, `convertFenceOnType`, turns a lone ` ``` ` line into a code block when typed. The chat composer only converts on Enter and is unchanged. A single-line ` ```text``` ` stays plain text, and a language cannot be typed after the fence.
- Enter sends, Shift+Enter adds a line, Enter inside a list continues it, Ctrl/Cmd+Enter always sends.
- The box starts about one line tall, grows, and scrolls at 40% of the window height.
- Voice uses the existing `useEnvironmentSpeechInput` and `TextFieldSpeechControls` (mic, recording pill, live preview, first-run setup). **Send** while recording stops it, waits for the transcript, then sends (`submitAfterDictation`).
- The dictation shortcut is the existing `composer.dictation` binding, registered without a target element (`global` in `useTextFieldSpeech`; the dock calls `useDictationShortcut` directly), so it works anywhere on the page while an agent is selected.
- `offerSetup: true`: without it the mic hides until voice is configured in Settings.

## Traps

- The draft string is shared across agents (one `draft` state in `AgentversePage`); switching agents keeps unsent text.
- The dock's width is tuned to sit between the district bar and the minimap and can overlap them on very narrow windows.

## Skipped

Hands-free commands ("stop", "open thread"), an Agentverse-only keybinding, attachments, mentions and skills.
