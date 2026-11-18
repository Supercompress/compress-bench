/** Shared brand primitives: Bayer matrices, a seeded RNG, the brand colours and the ease. */
export const BLUE = "#0566ff";
export const CTA_BLUE = "#0558fe";
export const INK = "#0f1729";
export const PAPER = "#f7f5f2";
export const MUTED = "#4b5567";
export const EASE = "cubic-bezier(.22,1,.36,1)";

export const B4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((r) => r.map((v) => (v + 0.5) / 16));

const bayer = (n: number): number[][] => {
  if (n === 1) return [[0]];
  const m = bayer(n / 2);
  const h = n / 2;
  return Array.from({ length: n }, (_, y) =>
    Array.from({ length: n }, (_, x) => 4 * m[y % h][x % h] + [[0, 2], [3, 1]][+(y >= h)][+(x >= h)])
  );
};
export const B8 = bayer(8).map((r) => r.map((v) => (v + 0.5) / 64));

export const mulberry = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const reducedMotion = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
export const asset = (p: string) => `${import.meta.env.BASE_URL}${p.replace(/^\//, "")}`;
