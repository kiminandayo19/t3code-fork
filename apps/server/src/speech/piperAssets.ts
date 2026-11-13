const RELEASE = "https://github.com/rhasspy/piper/releases/download/2023.11.14-2";
const VOICE = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium";

export type PiperFile = {
  readonly url: string;
  readonly filename: string;
  readonly size: number;
  readonly sha256: string;
};

// Pinned: the server downloads and runs this binary, so every file is size- and hash-checked.
const BINARIES: Record<string, PiperFile & { readonly executable: string }> = {
  "linux-x64": {
    url: `${RELEASE}/piper_linux_x86_64.tar.gz`,
    filename: "piper_linux_x86_64.tar.gz",
    size: 26460462,
    sha256: "a50cb45f355b7af1f6d758c1b360717877ba0a398cc8cbe6d2a7a3a26e225992",
    executable: "piper/piper",
  },
  "linux-arm64": {
    url: `${RELEASE}/piper_linux_aarch64.tar.gz`,
    filename: "piper_linux_aarch64.tar.gz",
    size: 26004717,
    sha256: "fea0fd2d87c54dbc7078d0f878289f404bd4d6eea6e7444a77835d1537ab88eb",
    executable: "piper/piper",
  },
  "darwin-arm64": {
    url: `${RELEASE}/piper_macos_aarch64.tar.gz`,
    filename: "piper_macos_aarch64.tar.gz",
    size: 19146957,
    sha256: "6b1eb03b3735946cb35216e063e7eebcc33a6bbf5dd96ec0217959bf1cdcb0cc",
    executable: "piper/piper",
  },
  "darwin-x64": {
    url: `${RELEASE}/piper_macos_x64.tar.gz`,
    filename: "piper_macos_x64.tar.gz",
    size: 19146927,
    sha256: "ced85c0a3df13945b1e623b878a48fdc2854d5c485b4b67f62857cf551deaf8b",
    executable: "piper/piper",
  },
  "win32-x64": {
    url: `${RELEASE}/piper_windows_amd64.zip`,
    filename: "piper_windows_amd64.zip",
    size: 22477236,
    sha256: "f3c58906402b24f3a96d92145f58acba6d86c9b5db896d207f78dc80811efcea",
    executable: "piper/piper.exe",
  },
};

export const PIPER_VOICE_FILES: readonly PiperFile[] = [
  {
    url: `${VOICE}/en_US-lessac-medium.onnx`,
    filename: "voice.onnx",
    size: 63201294,
    sha256: "5efe09e69902187827af646e1a6e9d269dee769f9877d17b16b1b46eeaaf019f",
  },
  {
    // Piper reads this next to the model as `<model>.json`.
    url: `${VOICE}/en_US-lessac-medium.onnx.json`,
    filename: "voice.onnx.json",
    size: 4885,
    sha256: "efe19c417bed055f2d69908248c6ba650fa135bc868b0e6abb3da181dab690a0",
  },
];

export const piperBinaryFor = (platform: string, arch: string) => BINARIES[`${platform}-${arch}`];
