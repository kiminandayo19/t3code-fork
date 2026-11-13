import Phaser from "phaser";

import atlasJson from "./assets/atlas.json";
import atlasPng from "./assets/atlas.png";
import {
  createAgents,
  loadCharacters,
  registerAnimations,
  type MinimapFrame,
  type Selection,
  type World,
} from "./characters";
import { buildCostGrid, frontTile, type Tile } from "./grid.logic";
import { project, TH, TW } from "./iso";
import type { SceneStats } from "./Metrics";
import type { View } from "./prefs";
import { buildLayout, DEMO_LAYOUT, type Building, type Layout } from "./layout.logic";
import type { AgentSpec } from "./stateToAnimation.logic";

// Tiled-format map; object x/y/width/height are in tile units, not pixels.
// Sprites are Kenney (CC0). Landscape tiles are 100px wide; city/building tiles are
// 133px wide and are scaled by SC to share the same grid.
const SC = TW / 133;
const ATLAS = "kenney";
const IDLE_SLEEP_MS = 2000;
const CULL_PAD = 200;

// Under reduced motion the camera jumps instead of gliding.
const ms = (n: number) => (matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : n);

// The map in view. Module state because the helpers below read it; there is one scene at a time.
let ground: number[] = [];
let buildings: Building[] = [];
let N = 0;

const ROAD = 2;
const PLAZA = 3;
const GARDEN = 4;
const WATER = 5;

const hash = (a: number, b: number, salt = 0) =>
  ((Math.imul(a + 1, 73856093) ^ Math.imul(b + 1, 19349663) ^ Math.imul(salt + 1, 83492791)) >>>
    0) %
  1000;

const prop = (o: { properties?: { name: string; value: unknown }[] }, k: string) =>
  o.properties?.find((p) => p.name === k)?.value;

const roadAt = (tx: number, ty: number) => {
  const id = ground[ty * N + tx];
  return id === ROAD || id === PLAZA;
};

// Kenney road names: NS runs along the tx axis, EW along ty.
function roadFrame(tx: number, ty: number) {
  const n = roadAt(tx - 1, ty);
  const s = roadAt(tx + 1, ty);
  const e = roadAt(tx, ty - 1);
  const w = roadAt(tx, ty + 1);
  const dirs = [n && "N", e && "E", s && "S", w && "W"].filter(Boolean).join("");
  if (dirs.length === 4) return "crossroad";
  if (dirs.length === 3) return `crossroad${dirs}`;
  if (dirs.length === 2) return `road${dirs}`;
  if (dirs.length === 1) return `end${dirs}`;
  return "road";
}

export type Handlers = {
  onSelect: (selection: Selection | null) => void;
  onFollow: (following: boolean) => void;
  onFrame: (frame: MinimapFrame, stats: SceneStats) => void;
};

class CampusScene extends Phaser.Scene {
  private agents?: ReturnType<typeof createAgents>;
  // The page can push state before the scene has been created; it is applied in create().
  private specs: AgentSpec[] = [];
  private demo = false;
  private idleMs = 0;
  private cam: { x: number; y: number; z: number; w: number; h: number } | null = null;
  private statics: { o: Phaser.GameObjects.Image; b: Phaser.Geom.Rectangle }[] = [];
  private drawn = 0;
  private lastZoom = 0;
  private buildingLabels: Phaser.GameObjects.Text[] = [];
  private mapObjs: Phaser.GameObjects.GameObject[] = [];
  private realLayout: Layout = buildLayout([]);
  private world: World = { grid: { cost: [], n: 0 }, places: [], fronts: {}, spawn: [0, 0] };

  private frameTimer = 0;

  constructor(
    private readonly handlers: Handlers,
    private readonly initialView: View | undefined,
  ) {
    super("campus");
  }

  preload() {
    this.load.atlas(ATLAS, atlasPng, atlasJson);
    loadCharacters(this);
  }

  create() {
    this.makeShadow();
    registerAnimations(this);
    this.buildMap(this.demo ? DEMO_LAYOUT : this.realLayout);
    this.agents = createAgents(this, project, this.world, this.handlers.onSelect);
    this.agents.setSpecs(this.specs);
    this.agents.setDemo(this.demo);
    const awake = () => this.wake();
    const canvas = this.game.canvas;
    canvas.addEventListener("pointerdown", awake);
    canvas.addEventListener("wheel", awake, { passive: true });
    canvas.addEventListener("pointermove", (e) => e.buttons && this.wake());
    this.scale.on(Phaser.Scale.Events.RESIZE, awake);
    this.setupCamera();
  }

  // Replaces all map art. Existing agents are kept (they live in `world`) and re-sent to their buildings.
  private buildMap(layout: Layout) {
    for (const o of this.mapObjs) o.destroy();
    ground = layout.ground;
    buildings = layout.buildings;
    N = layout.n;
    this.buildingLabels = [];
    const before = new Set(this.children.list);
    const lot = new Set<number>();
    for (const b of buildings)
      for (let y = b.y - 1; y < b.y + b.height + 1; y++)
        for (let x = b.x - 1; x < b.x + b.width + 1; x++) lot.add(y * N + x);
    // paved lot under each building so buildings read as a campus, not boxes on grass
    for (let ty = 0; ty < N; ty++) {
      for (let tx = 0; tx < N; tx++) {
        const id = ground[ty * N + tx]!;
        const p = project(tx, ty);
        const depth = -10_000 + tx + ty;
        if (id === ROAD) this.tile(roadFrame(tx, ty), p.x, p.y, depth);
        else if (id === PLAZA) this.plazaTile(tx, ty, p, depth);
        else if (id === WATER) this.waterTile(tx, ty, p, depth);
        else {
          this.tile(hash(tx, ty, 5) % 3 ? "grass" : "grassWhole", p.x, p.y, depth);
          if (lot.has(ty * N + tx)) this.city("c072", p, depth + 0.5);
          else this.decorate(tx, ty, p, id === GARDEN);
        }
      }
    }
    for (const b of buildings) this.addBuilding(b);
    this.mapObjs = this.children.list.filter((o) => !before.has(o));
    this.statics = this.mapObjs
      .filter((o): o is Phaser.GameObjects.Image => o instanceof Phaser.GameObjects.Image)
      .map((o) => ({ o, b: o.getBounds() }));
    this.cam = null;
    this.lastZoom = 0;
    Object.assign(this.world, {
      grid: { cost: buildCostGrid(ground, buildings, N), n: N },
      places: buildings,
      fronts: Object.fromEntries(
        buildings.map((b) => [prop(b, "district") as string, frontTile(b)] as [string, Tile]),
      ),
      spawn: layout.spawn,
    });
    this.applyBounds();
  }

  private applyBounds() {
    const pad = 250;
    this.cameras.main.setBounds(
      -(N * TW) / 2 - pad,
      -pad,
      N * TW + pad * 2,
      N * TH + pad * 2 + 150,
    );
  }

  // The generated city for the live projects; grows (never shifts) as projects are added.
  setLayout(layout: Layout) {
    if (layout.key === this.realLayout.key) return;
    this.realLayout = layout;
    if (this.demo || !this.agents) return;
    this.buildMap(layout);
    this.agents.relayout();
    this.wake();
  }

  // The loop sleeps when nothing moves; anything that can change the picture must call this.
  wake() {
    this.idleMs = 0;
    this.game.loop.wake();
  }

  setSpecs(specs: AgentSpec[]) {
    this.specs = specs;
    if (this.agents?.setSpecs(specs)) this.wake();
  }

  reveal(id: string) {
    const sprite = this.agents?.spriteOf(id);
    if (!sprite) return;
    this.wake();
    this.agents?.select(id);
    this.unfollow();
    const cam = this.cameras.main;
    cam.zoomTo(1.2, ms(400));
    cam.pan(sprite.x, sprite.y - 40, ms(400), "Sine.easeInOut");
  }

  setDemo(on: boolean) {
    if (on === this.demo) return;
    this.demo = on;
    if (this.agents) {
      this.buildMap(on ? DEMO_LAYOUT : this.realLayout);
      this.agents.setDemo(on);
      this.overview(false);
    }
    this.wake();
  }

  private tile(frame: string, x: number, y: number, depth: number) {
    this.add
      .image(x, y, ATLAS, frame)
      .setOrigin(0.5, 25 / 65)
      .setDepth(depth);
  }

  // City tiles share the grid at scale SC; the top surface centre sits at the tile centre.
  private city(frame: string, p: { x: number; y: number }, depth: number) {
    this.add
      .image(p.x, p.y, ATLAS, frame)
      .setOrigin(0.5, 33 / 101)
      .setScale(SC * 1.03)
      .setDepth(depth);
  }

  // Kenney shoreline names list the sides that touch land (N=tx-1, E=ty-1, S=tx+1, W=ty+1).
  private waterTile(tx: number, ty: number, p: { x: number; y: number }, depth: number) {
    const wet = (x: number, y: number) => ground[y * N + x] === WATER;
    const sides = [
      !wet(tx - 1, ty) && "N",
      !wet(tx, ty - 1) && "E",
      !wet(tx + 1, ty) && "S",
      !wet(tx, ty + 1) && "W",
    ]
      .filter(Boolean)
      .join("");
    const frame = ["NE", "ES", "NW", "SW"].includes(sides) ? `water${sides}` : "water";
    this.add
      .image(p.x, p.y, ATLAS, frame)
      .setOrigin(0.5, 25 / 65)
      .setDepth(depth);
  }

  private plazaTile(tx: number, ty: number, p: { x: number; y: number }, depth: number) {
    const frame = tx === 11 && ty === 12 ? "c043" : hash(tx, ty) % 3 === 0 ? "c074" : "c072";
    this.city(frame, p, depth);
    if ((tx === 8 || tx === 12) && (ty === 8 || ty === 12)) this.city("c067", p, tx + ty + 0.4);
  }

  private decorate(tx: number, ty: number, p: { x: number; y: number }, garden: boolean) {
    const h = hash(tx, ty);
    if (garden && h % 17 === 0) {
      this.city("c067", p, tx + ty + 0.3);
      return;
    }
    if (h % (garden ? 4 : 6) !== 0) return;
    const conifer = hash(tx, ty, 1) % 3 === 0;
    const frame = conifer ? (h % 2 ? "coniferTall" : "coniferShort") : "d010";
    const x = p.x + (hash(tx, ty, 2) % 30) - 15;
    const y = p.y + (hash(tx, ty, 3) % 14) + 1;
    this.add
      .image(x, y, "shadow")
      .setAlpha(0.35)
      .setDepth(tx + ty + 0.1);
    this.add
      .image(x, y, ATLAS, frame)
      .setOrigin(0.5, 0.95)
      .setScale(conifer ? 1.3 : 1)
      .setDepth(tx + ty + 0.5);
  }

  private makeShadow() {
    const g = this.make.graphics({}, false);
    g.fillStyle(0x1b3a1b, 1);
    g.fillEllipse(24, 10, 40, 14);
    g.generateTexture("shadow", 48, 20);
    g.destroy();
  }

  // Each footprint cell gets one Kenney building at full size (133px, wider than a cell) so neighbours overlap into one complex.
  private addBuilding(b: (typeof buildings)[number]) {
    const frames = (prop(b, "sprites") as string).split(",");
    const roofs = (prop(b, "roofs") as string | undefined)?.split(",");
    for (let dy = 0; dy < b.height; dy++) {
      for (let dx = 0; dx < b.width; dx++) {
        const tx = b.x + dx;
        const ty = b.y + dy;
        const p = project(tx, ty);
        this.add
          .image(p.x, p.y + 3, ATLAS, frames[hash(tx, ty, 7) % frames.length]!)
          .setOrigin(0.5, (127 - 33) / 127)
          .setDepth(tx + ty + 0.6);
        if (roofs) {
          const roof = this.textures.getFrame(ATLAS, roofs[0]!);
          this.add
            .image(p.x, p.y + 3 - 58, ATLAS, roof.name)
            .setOrigin(0.5, (roof.height - 33) / roof.height)
            .setDepth(tx + ty + 0.7);
        }
      }
    }
    const c = project(b.x + b.width / 2 - 0.5, b.y + b.height / 2 - 0.5);
    const label = this.add
      .text(c.x, c.y - 150, b.name, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "20px",
        color: "#ffffff",
        backgroundColor: "#1f2937cc",
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(100_000);
    this.buildingLabels.push(label);
  }

  private publishFrame(idle: boolean) {
    const v = this.cameras.main.worldView;
    this.handlers.onFrame(
      {
        agents: this.agents?.frame() ?? [],
        view: { x: v.x, y: v.y, w: v.width, h: v.height },
      },
      {
        fps: idle ? 0 : this.game.loop.actualFps,
        idle,
        renderer: this.game.renderer.type === Phaser.WEBGL ? "WebGL" : "Canvas",
        drawn: this.drawn,
        objects: this.statics.length,
        zoom: this.cameras.main.zoom,
      },
    );
  }

  // Static ground and decor outside the camera are hidden; the camera only changes on pan, zoom or resize.
  private cull() {
    // worldView is only refreshed at render time, so it is a frame stale here; derive the view from the camera.
    const c = this.cameras.main;
    const w = c.width / c.zoom;
    const h = c.height / c.zoom;
    const v = new Phaser.Geom.Rectangle(
      c.scrollX + (c.width - w) / 2,
      c.scrollY + (c.height - h) / 2,
      w,
      h,
    );
    let drawn = 0;
    for (const { o, b } of this.statics) {
      const on =
        b.right > v.x - CULL_PAD &&
        b.x < v.right + CULL_PAD &&
        b.bottom > v.y - CULL_PAD &&
        b.y < v.bottom + CULL_PAD;
      o.setVisible(on);
      if (on) drawn++;
    }
    this.drawn = drawn;
  }

  override update(_time: number, delta: number) {
    this.agents?.update(delta);
    const cam = this.cameras.main;
    const moved =
      !this.cam ||
      cam.scrollX !== this.cam.x ||
      cam.scrollY !== this.cam.y ||
      cam.zoom !== this.cam.z ||
      cam.width !== this.cam.w ||
      cam.height !== this.cam.h;
    if (moved) {
      if (cam.zoom !== this.lastZoom) {
        this.lastZoom = cam.zoom;
        const scale = Phaser.Math.Clamp(1 / cam.zoom, 0.8, 2);
        for (const l of this.buildingLabels) l.setScale(scale);
      }
      this.cam = { x: cam.scrollX, y: cam.scrollY, z: cam.zoom, w: cam.width, h: cam.height };
      this.cull();
    }
    this.idleMs = moved || this.demo || this.agents?.busy() ? 0 : this.idleMs + delta;
    this.frameTimer += delta;
    if (this.idleMs > IDLE_SLEEP_MS) {
      this.publishFrame(true);
      this.game.loop.sleep();
    } else if (this.agents && this.frameTimer >= 250) {
      this.frameTimer = 0;
      this.publishFrame(false);
    }
  }

  private setupCamera() {
    const cam = this.cameras.main;
    cam.setBackgroundColor(0xcfe6c4);
    this.overview(false);
    const v = this.initialView;
    if (v) {
      cam.setZoom(v.z);
      cam.setScroll(v.x, v.y);
    }

    let dragging = false;
    this.input.on("pointerdown", () => (dragging = true));
    this.input.on("pointerup", () => (dragging = false));
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!dragging || !p.isDown) return;
      if (p.getDistance() > 6) this.unfollow();
      cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom;
      cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom;
    });
    this.input.on("wheel", (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      cam.zoomTo(Phaser.Math.Clamp(cam.zoom * (dy > 0 ? 0.9 : 1.1), 0.3, 2.5), ms(120));
    });
    this.events.on("agentverse:overview", () => {
      this.unfollow();
      this.overview(true);
    });
    this.events.on("agentverse:follow", (id: string | null) => {
      const sprite = id ? this.agents?.spriteOf(id) : undefined;
      if (!sprite) return this.unfollow();
      cam.startFollow(sprite, true, 0.08, 0.08);
      cam.zoomTo(1.3, ms(400));
    });
    this.events.on("agentverse:panTo", (x: number, y: number) => {
      this.unfollow();
      cam.pan(x, y, ms(300), "Sine.easeInOut");
    });
    this.events.on("agentverse:focus", (district: string) => this.focusDistrict(district));
  }

  private unfollow() {
    this.cameras.main.stopFollow();
    this.handlers.onFollow(false);
  }

  private overview(animate: boolean) {
    const cam = this.cameras.main;
    const c = project(N / 2, N / 2);
    const zoom = Math.min(cam.width / (N * TW * 0.9), cam.height / (N * TH * 1.5));
    cam.zoomTo(zoom, animate ? ms(400) : 0);
    if (animate) cam.pan(c.x, c.y, ms(400), "Sine.easeInOut");
    else cam.centerOn(c.x, c.y);
  }

  private focusDistrict(district: string) {
    const b = buildings.find((o) => prop(o, "district") === district);
    if (!b) return;
    this.unfollow();
    const c = project(b.x + b.width / 2, b.y + b.height / 2);
    const cam = this.cameras.main;
    cam.zoomTo(1.2, ms(400));
    cam.pan(c.x, c.y - 40, ms(400), "Sine.easeInOut");
  }
}

export function createCampusGame(
  parent: HTMLElement,
  lowPower: boolean,
  handlers: Handlers,
  initialView?: View,
) {
  const scene = new CampusScene(handlers, initialView);
  const game = new Phaser.Game({
    type: lowPower ? Phaser.CANVAS : Phaser.AUTO,
    parent,
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth, height: parent.clientHeight },
    fps: { target: lowPower ? 15 : 30 },
    scene,
    banner: false,
    audio: { noAudio: true },
  });
  const emit = (event: string, ...args: unknown[]) => {
    scene.wake();
    scene.events.emit(event, ...args);
  };
  return {
    overview: () => emit("agentverse:overview"),
    focus: (district: string) => emit("agentverse:focus", district),
    follow: (id: string | null) => emit("agentverse:follow", id),
    panTo: (x: number, y: number) => emit("agentverse:panTo", x, y),
    setSpecs: (specs: AgentSpec[]) => scene.setSpecs(specs),
    setDemo: (on: boolean) => scene.setDemo(on),
    reveal: (id: string) => scene.reveal(id),
    getView: (): View => {
      const c = scene.cameras.main;
      return { x: c.scrollX, y: c.scrollY, z: c.zoom };
    },
    setLayout: (layout: Layout) => scene.setLayout(layout),
    destroy: () => game.destroy(true),
  };
}
