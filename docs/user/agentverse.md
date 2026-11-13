# Agentverse

Agentverse shows your threads as characters in a small city. Open it from the sidebar, the
command palette, or `mod+alt+g` on web and desktop when the terminal is not focused. Customize
`agentverse.open` in **Settings → Keybindings**. It is built for desktop-sized windows.

## Read the city

Each project gets its own building, named after the project. New projects take the next free lot,
and the city grows when it fills up. A thread that is running, waiting for you, or finished in the
last 10 minutes appears as a character at its project's building. The badge above the character
shows its state, and failed or waiting threads are listed under **Needs you** at the top left.

Pick a thread from the list, or click a character, to see its project, model, branch, run time,
last message, and any error. **Open thread** goes to the chat; for a thread waiting on a
question or approval the button reads **Answer**. **Stop** interrupts the run. **Follow with camera** keeps the view on a character.

**View result** opens the agent's latest message in full and previews the files its last run created or changed (images, HTML, PDF, Markdown, text), so you do not need to open the thread.

Selecting an agent opens a message box at the bottom center. It grows and scrolls for long messages, and formats Markdown as you type (` ``` ` makes a code block, `#` a heading, `-` a list, `>` a quote). Enter sends and Shift+Enter adds a line. Use the mic beside it to dictate a message to the selected agent. Press **Send** (or Enter) while recording to finish the recording and send it in one step. The dictation shortcut (set under **Settings → Keybindings**, the same one as the composer) starts and stops recording from anywhere on the page while an agent is selected. Voice input uses the same setup and speech model as the chat composer; the first use offers the setup.

**Speak** reads an agent's latest reply aloud. It first asks the environment's server for a Piper voice (a local, free text-to-speech engine). The first use downloads about 90 MB into the server's data folder, so the button shows **Preparing voice...** for a while. If Piper cannot run, your browser's built-in voice reads it instead. Code and links are skipped and long replies are shortened, so open the full result to read them. Starting a recording stops playback.

To use your own Piper install, set `T3CODE_PIPER_BIN` and `T3CODE_PIPER_MODEL` (the `.onnx` voice file, with its `.onnx.json` beside it) on the server.

## Tips

- Use Tab and Enter in the thread list for keyboard access. The canvas itself is not keyboard
  navigable.
- `/agentverse?thread=<thread id>` opens the city focused on that thread.
- **Low power** draws with a lighter renderer at a lower frame rate. It starts on when your system
  asks for reduced motion, which also makes characters jump instead of walking.
- **Metrics** shows frame rate and drawing statistics. Your choices and the camera position are
  remembered in this browser.
- With several environments, the inspector names the environment. The top bar tells you when an
  environment is still connecting or offline.
- **Preview demo** shows made-up agents so you can see the city without any running threads.
