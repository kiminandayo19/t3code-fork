import { useEffect, useRef } from "react";

import type { MinimapFrame } from "./characters";
import { project, TW } from "./iso";
import type { Layout } from "./layout.logic";

const W = 200;
const H = 110;
const OX = W / 2;
const OY = 4;
const TILE: Record<number, string> = {
  1: "#7fb069",
  2: "#6b6d75",
  3: "#d8c9a3",
  4: "#5f9f4f",
  5: "#8fd0e6",
};

function diamond(
  c: CanvasRenderingContext2D,
  S: number,
  tx: number,
  ty: number,
  w: number,
  h: number,
) {
  const pts = [
    project(tx - 0.5, ty - 0.5),
    project(tx + w - 0.5, ty - 0.5),
    project(tx + w - 0.5, ty + h - 0.5),
    project(tx - 0.5, ty + h - 0.5),
  ];
  c.beginPath();
  pts.forEach((p, i) =>
    i ? c.lineTo(OX + p.x * S, OY + p.y * S) : c.moveTo(OX + p.x * S, OY + p.y * S),
  );
  c.closePath();
}

// The static map is painted once; only the dots and the view box are redrawn (4 times a second).
export function Minimap({
  layout,
  drawRef,
  onPan,
}: {
  layout: Layout;
  drawRef: { current: ((f: MinimapFrame) => void) | null };
  onPan: (x: number, y: number) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const S = W / (layout.n * TW); // world px -> minimap px

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- paints the canvas, an external system
  useEffect(() => {
    const { n, ground, buildings } = layout;
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const bg = document.createElement("canvas");
    bg.width = W;
    bg.height = H;
    const b = bg.getContext("2d")!;
    for (let ty = 0; ty < n; ty++)
      for (let tx = 0; tx < n; tx++) {
        b.fillStyle = TILE[ground[ty * n + tx]!] ?? TILE[1]!;
        diamond(b, S, tx, ty, 1, 1);
        b.fill();
      }
    for (const bl of buildings) {
      b.fillStyle = "#b9a98a";
      diamond(b, S, bl.x, bl.y, bl.width, bl.height);
      b.fill();
    }
    ctx.drawImage(bg, 0, 0);
    drawRef.current = (f) => {
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(bg, 0, 0);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(OX + f.view.x * S, OY + f.view.y * S, f.view.w * S, f.view.h * S);
      for (const a of f.agents) {
        ctx.fillStyle = a.color;
        ctx.strokeStyle = "#fff";
        ctx.beginPath();
        ctx.arc(OX + a.x * S, OY + a.y * S, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    };
    return () => {
      drawRef.current = null;
    };
  }, [drawRef, S, layout]);

  return (
    <canvas
      ref={canvas}
      width={W}
      height={H}
      aria-label="Campus minimap. Click to move the camera."
      className="cursor-pointer rounded-md"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onPan(
          ((e.clientX - r.left) * (W / r.width) - OX) / S,
          ((e.clientY - r.top) * (H / r.height) - OY) / S,
        );
      }}
    />
  );
}
