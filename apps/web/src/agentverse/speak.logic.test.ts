import { describe, expect, it } from "vite-plus/test";

import { spokenText } from "./speak.logic";

describe("spokenText", () => {
  it("drops code, urls and markup", () => {
    const md =
      "## Done\n- **Fixed** the [docs](http://x.y/z) bug\n```ts\nconst a = 1;\n```\nSee https://a.b `foo`.";
    expect(spokenText(md)).toBe("Done Fixed the docs bug code omitted. See link foo.");
  });

  it("caps long text at a sentence", () => {
    const out = spokenText("Word word word. ".repeat(300));
    expect(out.length).toBeLessThan(1600);
    expect(out.endsWith("The rest is in the full result.")).toBe(true);
  });
});
