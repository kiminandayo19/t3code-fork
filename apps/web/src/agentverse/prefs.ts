// Per-viewer conveniences only; the page works with storage blocked.
export type View = { x: number; y: number; z: number };
type Prefs = { lowPower?: boolean; metrics?: boolean; view?: View };

const KEY = "agentverse:prefs";

export function readPrefs(): Prefs {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Prefs;
  } catch {
    return {};
  }
}

export function writePrefs(patch: Prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readPrefs(), ...patch }));
  } catch {
    // storage unavailable: the choice just will not be remembered
  }
}
