export const TW = 100;
export const TH = 50;

export const project = (tx: number, ty: number) => ({
  x: (tx - ty) * (TW / 2),
  y: (tx + ty) * (TH / 2),
});

export const unproject = (x: number, y: number) => ({
  tx: (y / (TH / 2) + x / (TW / 2)) / 2,
  ty: (y / (TH / 2) - x / (TW / 2)) / 2,
});
