# 06 Result and file preview

**Status:** Done. Not seen in a browser by the agent that wrote it.
**Scope:** read what an agent produced, and preview the files it created, without opening the thread. Only the latest run, never history.
**Done when:** a live agent's inspector shows its last reply and has **View result**, which opens a dialog with the last prompt, the full reply, and the files that run wrote.
**Verify:** `resultFiles.logic.test.ts`, web typecheck and lint.

## How it works

- `useLastReply` (in `ResultDialog.tsx`) reads the thread's visible turn items and takes the last `assistant_message` and `user_message` of the latest run. The shell's `latestVisibleMessage` is **not** used: the server leaves it `null`, so the inspector's old preview was always empty.
- Items are loaded only for the selected thread (inspector preview) or while the dialog is open, never for every thread in the city.
- `resultFiles.logic.ts` collects `file_change` and `checkpoint` paths for the latest run, de-duplicated, without removed files.
- Clicking a file, or a file link inside the reply, opens a second closable popup.
  - Markdown and text are read with the project file read (`getProjectFileQueryAtom`), which accepts absolute host paths. Markdown renders with `ChatMarkdown`.
  - Images, HTML and PDF use a signed `media-file` asset URL. HTML runs in a sandboxed iframe with no scripts.
  - The server only signs asset URLs for image, HTML and PDF types, so `.md` and text cannot use them.
- File links in markdown call the thread's right-panel store, which Agentverse does not render. The dialog subscribes to that store for its own thread and mirrors opens into the popup. The file also stays queued in the thread's right panel.

## Traps

- `FilePreviewPanel` is not reused: it is an editor wired to the composer, drafts and keybindings.
- `AgentDetails` carries `cwd` (`worktreePath ?? project.workspaceRoot`) and `runId` for this.

## Skipped

Auto-popup on completion, per-turn history, editing, download, diffs.
