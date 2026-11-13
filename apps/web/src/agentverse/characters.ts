import Phaser from "phaser";

import sheetJson from "./assets/characters.json";
import meta from "./assets/characters.meta.json";
import sheetPng from "./assets/characters.png";
import { PATROLS } from "./demoPatrols";
import { findPath, standingSlots, type Tile } from "./grid.logic";
import { unproject } from "./iso";
import { hashId, type AgentSpec } from "./stateToAnimation.logic";

// Art and animation timing come from characters.meta.json + the atlas, so assets are swappable.
const KEY = "characters";
const SCALE = 1.3;

export type AgentStatus = keyof typeof meta.animations;

export type AgentSnapshot = {
  kind: "agent";
  id: string;
  name: string;
  role: string;
  color: string;
  status: AgentStatus;
  task: string;
  location: string;
  demo: boolean;
  error: string | null;
};

export type BuildingSnapshot = {
  kind: "building";
  name: string;
  occupants: { id: string; name: string; color: string; status: AgentStatus }[];
};

export type Selection = AgentSnapshot | BuildingSnapshot;

export type MinimapFrame = {
  agents: { id: string; color: string; x: number; y: number }[];
  view: { x: number; y: number; w: number; h: number };
};

type Project = (tx: number, ty: number) => { x: number; y: number };
type Grid = { cost: readonly number[]; n: number };
// Mutable on purpose: the scene swaps it when the map grows, and agents keep their positions.
export type World = {
  grid: Grid;
  places: Place[];
  fronts: Record<string, Tile>;
  spawn: Tile;
};
type Place = { name: string; x: number; y: number; width: number; height: number };

const TASKS: Record<string, string> = {
  idle: "Waiting for a task",
  walk: "Heading to workspace",
  think: "Planning the next step",
  work: "Working on assigned task",
  talk: "Coordinating with another agent",
  tool: "Running a tool",
  success: "Task complete",
  error: "Task failed",
};

const BADGES: Partial<Record<AgentStatus, string>> = {
  think: "💭",
  work: "⌨️",
  tool: "🔧",
  talk: "💬",
  success: "✅",
  error: "⚠️",
};

const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

const SPEED = 1.4; // tiles per second
const ACT_MS = 4500;

type Info = { id: string; name: string; role: string; color: string };

export function loadCharacters(scene: Phaser.Scene) {
  scene.load.atlas(KEY, sheetPng, sheetJson);
}

export function registerAnimations(scene: Phaser.Scene) {
  for (const c of meta.characters) {
    for (const [name, spec] of Object.entries(meta.animations)) {
      scene.anims.create({
        key: `${c.id}/${name}`,
        frames: Array.from({ length: spec.frames }, (_, i) => ({
          key: KEY,
          frame: `${c.id}/${name}/${i}`,
        })),
        frameRate: spec.fps,
        repeat: spec.loop ? -1 : 0,
      });
    }
  }
  const g = scene.make.graphics({}, false);
  g.lineStyle(4, 0xffffff, 1);
  g.strokeEllipse(40, 16, 72, 28);
  g.generateTexture("agent-ring", 80, 32);
  g.destroy();
}

class Agent {
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly ring: Phaser.GameObjects.Image;
  private readonly label: Phaser.GameObjects.Text;
  private readonly badge: Phaser.GameObjects.Text;
  status: AgentStatus = "idle";
  task = "";
  error: string | null = null;
  tx: number;
  ty: number;
  arrival: AgentStatus = "idle";
  private dest: Tile | null = null;
  private legs: Tile[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly project: Project,
    private readonly world: World,
    readonly info: Info,
    private readonly skin: string,
    start: Tile,
    readonly demo: boolean,
  ) {
    this.tx = start[0];
    this.ty = start[1];
    this.ring = scene.add.image(0, 0, "agent-ring").setVisible(false);
    this.sprite = scene.add
      .sprite(0, 0, KEY)
      .setOrigin(0.5, meta.frame.feetY / meta.frame.h)
      .setScale(SCALE)
      .setInteractive({ useHandCursor: true });
    this.label = scene.add
      .text(0, 0, info.name, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#ffffff",
        backgroundColor: info.color,
        padding: { x: 5, y: 1 },
      })
      .setOrigin(0.5, 1);
    this.badge = scene.add.text(0, 0, "", { fontSize: "20px" }).setOrigin(0.5, 1);
    this.setStatus("idle");
    this.setLabelScale(scene.cameras.main.zoom);
    this.place();
  }

  // Labels keep a readable on-screen size when zoomed out.
  setLabelScale(zoom: number) {
    const s = Phaser.Math.Clamp(1 / zoom, 0.8, 2);
    this.label.setScale(s);
    this.badge.setScale(s);
  }

  get moving() {
    return this.legs.length > 0;
  }

  // What the inspector reports: the real state for live agents, the animation for DEMO.
  get shown(): AgentStatus {
    return this.demo ? this.status : this.arrival;
  }

  setName(name: string) {
    if (name !== this.info.name) {
      this.info.name = name;
      this.label.setText(name);
    }
  }

  setStatus(status: AgentStatus) {
    this.status = status;
    this.sprite.play(`${this.skin}/${status}`, true);
    // A real agent shows its real state while it walks; only the animation is decoration.
    if (status !== "walk") this.badge.setText(BADGES[status] ?? "");
    else if (this.demo) this.badge.setText("");
  }

  select(on: boolean) {
    this.ring.setVisible(on).setTint(Phaser.Display.Color.HexStringToColor(this.info.color).color);
  }

  destroy() {
    for (const o of [this.sprite, this.ring, this.label, this.badge]) o.destroy();
  }

  private place() {
    const p = this.project(this.tx, this.ty);
    const depth = this.tx + this.ty + 0.8;
    this.sprite.setPosition(p.x, p.y).setDepth(depth);
    this.ring.setPosition(p.x, p.y).setDepth(depth - 0.05);
    this.label.setPosition(p.x, p.y - 82 * (SCALE / 0.9) + 12).setDepth(100_001);
    this.badge.setPosition(p.x, p.y - 100 * (SCALE / 0.9) + 14).setDepth(100_002);
  }

  // Walk to `tile`, then play `status`. Repeating the same destination keeps the current walk.
  goTo(tile: Tile, status: AgentStatus) {
    this.arrival = status;
    if (!this.demo) this.badge.setText(BADGES[status] ?? "");
    if (this.dest && this.dest[0] === tile[0] && this.dest[1] === tile[1]) {
      if (!this.moving) this.setStatus(status);
      return;
    }
    this.dest = tile;
    if (reducedMotion()) {
      this.tx = tile[0];
      this.ty = tile[1];
      this.legs = [];
      this.place();
      this.setStatus(status);
      return;
    }
    const from: Tile = [Math.round(this.tx), Math.round(this.ty)];
    this.legs = findPath(this.world.grid.cost, this.world.grid.n, from, tile)?.slice(1) ?? [];
    this.setStatus(this.moving ? "walk" : status);
  }

  update(dt: number) {
    const next = this.legs[0];
    if (!next) return;
    const dx = next[0] - this.tx;
    const dy = next[1] - this.ty;
    const dist = Math.hypot(dx, dy);
    const step = (SPEED * dt) / 1000;
    if (dist <= step) {
      this.tx = next[0];
      this.ty = next[1];
      this.legs.shift();
      if (!this.moving) this.setStatus(this.arrival);
    } else {
      this.tx += (dx / dist) * step;
      this.ty += (dy / dist) * step;
      this.sprite.setFlipX((dx - dy) * 50 < 0);
    }
    this.place();
  }
}

export function createAgents(
  scene: Phaser.Scene,
  project: Project,
  world: World,
  onChange: (selection: Selection | null) => void,
) {
  const agents = new Map<string, Agent>();
  const patrol = new Map<string, { timer: number; stop: number }>();
  let demo = false;
  let specs: AgentSpec[] = [];
  let specsKey = "";
  let lastZoom = 0;
  const highlight = scene.add.graphics().setDepth(90_000).setVisible(false);
  let selectedAgent: Agent | null = null;
  let selectedPlace: Place | null = null;
  let last = "";

  const placeOf = (a: Agent) => {
    let best: Place | null = null;
    let bestD = 4;
    for (const p of world.places) {
      const d = Math.hypot(a.tx - (p.x + p.width / 2 - 0.5), a.ty - (p.y + p.height / 2 - 0.5));
      if (d < bestD) [best, bestD] = [p, d];
    }
    return best;
  };

  const agentSnapshot = (a: Agent): AgentSnapshot => ({
    kind: "agent",
    id: a.info.id,
    name: a.info.name,
    role: a.info.role,
    color: a.info.color,
    status: a.shown,
    task: a.demo ? (TASKS[a.status] ?? "") : a.task,
    location: placeOf(a) ? `Near ${placeOf(a)!.name}` : "Campus roads",
    demo: a.demo,
    error: a.error,
  });

  const buildingSnapshot = (p: Place): BuildingSnapshot => ({
    kind: "building",
    name: p.name,
    occupants: [...agents.values()]
      .filter((a) => placeOf(a) === p)
      .map((a) => ({ id: a.info.id, name: a.info.name, color: a.info.color, status: a.shown })),
  });

  // Only notify React when what the inspector shows actually changes.
  const publish = () => {
    const snap = selectedAgent
      ? agentSnapshot(selectedAgent)
      : selectedPlace
        ? buildingSnapshot(selectedPlace)
        : null;
    const key = JSON.stringify(snap);
    if (key === last) return;
    last = key;
    onChange(snap);
  };

  const setSelection = (agent: Agent | null, place: Place | null) => {
    selectedAgent?.select(false);
    selectedAgent = agent;
    selectedPlace = place;
    agent?.select(true);
    highlight.clear().setVisible(!!place);
    if (place) {
      const pts = [
        project(place.x - 0.5, place.y - 0.5),
        project(place.x + place.width - 0.5, place.y - 0.5),
        project(place.x + place.width - 0.5, place.y + place.height - 0.5),
        project(place.x - 0.5, place.y + place.height - 0.5),
      ];
      highlight.lineStyle(4, 0xffffff, 0.95).strokePoints(pts, true);
    }
    publish();
  };

  const placeAt = (wx: number, wy: number) => {
    // buildings are tall, so a click on the walls lands on tiles behind the footprint: try shifted down first
    for (const off of [40, 0]) {
      const t = unproject(wx, wy + off);
      const x = Math.round(t.tx);
      const y = Math.round(t.ty);
      const hit = world.places.find(
        (p) => x >= p.x && x < p.x + p.width && y >= p.y && y < p.y + p.height,
      );
      if (hit) return hit;
    }
    return null;
  };

  scene.input.on("pointerup", (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
    if (p.getDistance() > 6) return; // a drag pans the camera, it is not a click
    const hit = [...agents.values()].find((a) => over.includes(a.sprite)) ?? null;
    if (hit) setSelection(hit, null);
    else setSelection(null, placeAt(p.worldX, p.worldY));
  });

  const find = (id: string) => agents.get(id);

  const remove = (id: string) => {
    const a = agents.get(id);
    if (!a) return;
    if (a === selectedAgent) setSelection(null, null);
    a.destroy();
    agents.delete(id);
    patrol.delete(id);
  };

  const sync = () => {
    const ids = new Set(specs.map((s) => s.id));
    for (const id of agents.keys()) if (!ids.has(id)) remove(id);
    const perDistrict = new Map<string, string[]>();
    for (const s of specs)
      perDistrict.set(s.district, [...(perDistrict.get(s.district) ?? []), s.id]);
    for (const s of specs) {
      let a = agents.get(s.id);
      if (!a) {
        const c = meta.characters[hashId(s.id) % meta.characters.length]!;
        a = new Agent(
          scene,
          project,
          world,
          { id: s.id, name: s.name, role: "Live thread", color: c.color },
          c.id,
          world.spawn,
          false,
        );
        agents.set(s.id, a);
      }
      a.setName(s.name);
      a.task = s.task;
      a.error = s.error;
      // Stable slot by id order, so agents in one district fan out instead of sharing a tile.
      const front = world.fronts[s.district] ?? world.spawn;
      const slots = standingSlots(world.grid.cost, world.grid.n, front);
      const rank = perDistrict.get(s.district)!.toSorted().indexOf(s.id);
      a.goTo(slots[rank % slots.length] ?? front, s.status);
    }
  };

  return {
    update(dt: number) {
      const zoom = scene.cameras.main.zoom;
      if (zoom !== lastZoom) {
        lastZoom = zoom;
        for (const a of agents.values()) a.setLabelScale(zoom);
      }
      for (const [id, a] of agents) {
        a.update(dt);
        const p = patrol.get(id);
        if (!p || a.moving) continue;
        p.timer -= dt;
        if (p.timer > 0) continue;
        const route = PATROLS[id]!;
        p.stop = (p.stop + 1) % route.length;
        a.goTo(route[p.stop]!.tile, route[p.stop]!.act ?? "idle");
        p.timer = ACT_MS;
      }
      if (selectedAgent || selectedPlace) publish();
    },
    // Returns whether anything changed, so the scene only wakes from idle for real updates.
    setSpecs(next: AgentSpec[]) {
      const key = JSON.stringify(next);
      if (key === specsKey) return false;
      specsKey = key;
      specs = next;
      if (!demo) sync();
      return true;
    },
    busy: () => [...agents.values()].some((a) => a.moving),
    // The map changed: refresh the building highlight and send agents to their (possibly new) fronts.
    relayout() {
      if (selectedPlace) setSelection(selectedAgent, null);
      if (!demo) sync();
    },
    setDemo(on: boolean) {
      if (on === demo) return;
      demo = on;
      for (const id of agents.keys()) remove(id);
      if (!on) return sync();
      meta.characters.forEach((c, i) => {
        const route = PATROLS[c.id]!;
        agents.set(c.id, new Agent(scene, project, world, { ...c }, c.id, route[0]!.tile, true));
        patrol.set(c.id, { timer: 800 + i * 700, stop: 0 });
      });
    },
    select: (id: string) => setSelection(find(id) ?? null, null),
    spriteOf: (id: string) => find(id)?.sprite,
    frame: (): MinimapFrame["agents"] =>
      [...agents.values()].map((a) => {
        const p = project(a.tx, a.ty);
        return { id: a.info.id, color: a.info.color, x: p.x, y: p.y };
      }),
  };
}
