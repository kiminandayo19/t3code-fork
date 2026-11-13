const MAX_SPOKEN_CHARS = 1500;

/** Markdown to something worth hearing: no code bodies, URLs or markup symbols, capped at a sentence. */
export function spokenText(markdown: string): string {
  const plain = markdown
    .replace(/```[\s\S]*?(```|$)/g, " code omitted. ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "link")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/^\s{0,3}(?:#{1,6}|>|[-*+]|\d+[.)])\s+/gm, "")
    .replace(/[*_~|]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= MAX_SPOKEN_CHARS) return plain;
  const cut = plain.slice(0, MAX_SPOKEN_CHARS);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
  return `${end > 200 ? cut.slice(0, end + 1) : cut} The rest is in the full result.`;
}
