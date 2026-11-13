import { describe, expect, it } from "vite-plus/test";

import { PIPER_VOICE_FILES, piperBinaryFor } from "./piperAssets.ts";

describe("piperBinaryFor", () => {
  it("covers each supported platform with a pinned hash and rejects others", () => {
    for (const key of ["linux-x64", "linux-arm64", "darwin-arm64", "darwin-x64", "win32-x64"]) {
      const [platform, arch] = key.split("-") as [string, string];
      expect(piperBinaryFor(platform, arch)?.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(piperBinaryFor("win32", "arm64")).toBeUndefined();
    expect(PIPER_VOICE_FILES.every((f) => /^[0-9a-f]{64}$/.test(f.sha256))).toBe(true);
  });
});
