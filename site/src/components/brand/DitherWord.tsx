import { useEffect, useRef } from "react";
import { B4, BLUE, reducedMotion } from "./brand";

/**
 * The brand accent word: the glyphs drawn as ordered (Bayer 4×4) dither on a canvas over
 * transparent text, with a slow wave moving through the density. The real text stays in
 * the DOM for selection and screen readers.
 */
export function DitherWord({ children, color = BLUE }: { children: string; color?: string }) {
  const wrap = useRef<HTMLSpanElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = wrap.current!;
    const canvas = cv.current!;
    let mask: { on: Uint8Array; cols: number; rows: number; cell: number; W: number; H: number } | null = null;
    let raf = 0;
    let visible = true;
    const still = reducedMotion();

    const build = () => {
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      const cs = getComputedStyle(el);
      const dpr = Math.min(2, devicePixelRatio || 1);
      const cell = Math.max(2, Math.round(1.5 * dpr));
      const pad = Math.round(parseFloat(cs.fontSize) * 0.12);
      const W = Math.round((r.width + pad * 2) * dpr);
      const H = Math.round(r.height * dpr);
      canvas.width = W;
      canvas.height = H;
      canvas.style.width = `${r.width + pad * 2}px`;
      canvas.style.height = `${r.height}px`;
      canvas.style.left = `${-pad}px`;
      const off = document.createElement("canvas");
      off.width = W;
      off.height = H;
      const o = off.getContext("2d")!;
      o.font = `${cs.fontWeight} ${parseFloat(cs.fontSize) * dpr}px ${cs.fontFamily}`;
      (o as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = cs.letterSpacing === "normal" ? "0px" : `${parseFloat(cs.letterSpacing) * dpr}px`;
      o.textBaseline = "alphabetic";
      const m = o.measureText(children);
      const asc = m.fontBoundingBoxAscent;
      const desc = m.fontBoundingBoxDescent;
      o.fillText(children, pad * dpr, (H - (asc + desc)) / 2 + asc);
      const a = o.getImageData(0, 0, W, H).data;
      const cols = Math.ceil(W / cell);
      const rows = Math.ceil(H / cell);
      const on = new Uint8Array(cols * rows);
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          const px = Math.min(W - 1, x * cell + (cell >> 1));
          const py = Math.min(H - 1, y * cell + (cell >> 1));
          on[y * cols + x] = a[(py * W + px) * 4 + 3] > 110 ? 1 : 0;
        }
      mask = { on, cols, rows, cell, W, H };
      el.dataset.dithered = "1";
    };

    const paint = (t: number) => {
      if (!mask) return;
      const { on, cols, rows, cell, W, H } = mask;
      const c = canvas.getContext("2d")!;
      c.clearRect(0, 0, W, H);
      c.fillStyle = color;
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          if (!on[y * cols + x]) continue;
          const u = x / cols;
          const v = 0.86 - u * 0.18 + 0.17 * Math.sin(u * 7 - t * 1.6) + 0.06 * Math.sin((y / rows) * 6 + t * 1.1);
          if (v > B4[y & 3][x & 3]) c.fillRect(x * cell, y * cell, cell, cell);
        }
    };

    let last = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!visible || now - last < 33) return;
      last = now;
      paint(now / 1000);
    };
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);
    const ro = new ResizeObserver(() => {
      build();
      paint(performance.now() / 1000);
    });
    (document.fonts?.ready ?? Promise.resolve()).then(() => {
      build();
      paint(2);
      if (!still) raf = requestAnimationFrame(tick);
      ro.observe(el);
    });
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, [children, color]);

  return (
    <span ref={wrap} className="dither-word" style={{ color }}>
      {children}
      <canvas ref={cv} aria-hidden="true" />
    </span>
  );
}
