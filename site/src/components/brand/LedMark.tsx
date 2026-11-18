import { useEffect, useRef } from "react";
import { B8, asset, reducedMotion } from "./brand";

/**
 * The CTA LED mark: the SuperCompress chevron drawn as a grid of LED dots on the blue block.
 * Each dot is lit when (mark tone × a V-shaped wave) clears its Bayer 8×8 threshold, so a slow
 * chevron of light rolls through the mark. Unlit cells keep a faint dot, like an LED panel.
 */
export function LedMark({ className = "cta-mark" }: { className?: string }) {
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = cv.current!;
    const CELL = 6;
    const DOT = 4;
    const WAVE = 3400;
    const still = reducedMotion();
    let tone = new Float32Array(0);
    let cols = 0;
    let rows = 0;
    let box = { x0: 0, y0: 0, w: 1, h: 1, cx: 0 };
    let raf = 0;
    let visible = false;
    let dpr = 1;
    const img = new Image();
    img.src = asset("sc-mark.svg");

    const build = () => {
      const r = canvas.getBoundingClientRect();
      if (!r.width) return;
      dpr = Math.min(2, devicePixelRatio || 1);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      cols = Math.ceil(r.width / CELL);
      rows = Math.ceil(r.height / CELL);
      const off = document.createElement("canvas");
      off.width = cols;
      off.height = rows;
      const o = off.getContext("2d", { willReadFrequently: true })!;
      const h = Math.round(rows * 0.78);
      const w = img.naturalWidth ? Math.round((h * img.naturalWidth) / img.naturalHeight) : h;
      const x0 = Math.round(cols * 0.97 - w);
      const y0 = Math.round((rows - h) / 2);
      if (img.complete && img.naturalWidth) o.drawImage(img, x0, y0, w, h);
      const d = o.getImageData(0, 0, cols, rows).data;
      tone = new Float32Array(cols * rows);
      for (let i = 0; i < cols * rows; i++) tone[i] = d[i * 4 + 3] / 255;
      box = { x0, y0, w, h, cx: x0 + w / 2 };
    };

    const paint = (now: number) => {
      const c = canvas.getContext("2d")!;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, canvas.width, canvas.height);
      const phase = (now % WAVE) / WAVE;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const base = tone[y * cols + x];
          const px = x * CELL + (CELL - DOT) / 2;
          const py = y * CELL + (CELL - DOT) / 2;
          if (base > 0.05) {
            const vco = (y - box.y0 - Math.abs(x - box.cx) * 0.55) / box.h;
            const wave = 0.5 + 0.5 * Math.cos(2 * Math.PI * (vco - phase * 1.6 + 0.3));
            const lit = base * (0.42 + 0.58 * wave);
            if (lit > B8[y & 7][x & 7]) {
              c.fillStyle = `rgba(255,255,255,${0.55 + 0.45 * wave})`;
              c.fillRect(px, py, DOT, DOT);
              continue;
            }
          }
          const dx = (x - box.cx) / (box.w * 1.6);
          const dy = (y - (box.y0 + box.h / 2)) / (box.h * 1.1);
          const rr = Math.sqrt(dx * dx + dy * dy);
          c.fillStyle = `rgba(255,255,255,${0.035 + 0.12 * Math.max(0, 1 - rr) ** 1.6})`;
          c.fillRect(px, py, DOT, DOT);
        }
      }
    };

    let last = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!visible || now - last < 40) return;
      last = now;
      paint(now);
    };
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    const ro = new ResizeObserver(() => {
      build();
      paint(performance.now());
    });
    const start = () => {
      build();
      paint(1200);
      ro.observe(canvas);
      if (!still) raf = requestAnimationFrame(tick);
    };
    if (img.complete) start();
    else img.onload = img.onerror = start;
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, []);
  return <canvas ref={cv} className={className} aria-hidden="true" />;
}
