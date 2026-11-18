import { useEffect, useRef } from "react";
import { BLUE, mulberry, reducedMotion } from "./brand";

/** Spray-paint underline: seeded particles sprayed left to right once, when it scrolls into view. */
export function SprayUnderline({ children, seed = 7, delay = 380 }: { children: React.ReactNode; seed?: number; delay?: number }) {
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = cv.current!;
    const still = reducedMotion();
    const DRAW = 850;
    const gauss = (r: () => number) => {
      let u = 0;
      let v = 0;
      while (!u) u = r();
      while (!v) v = r();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    const pathY = (u: number) => 0.5 + 0.1 * Math.sin(u * Math.PI * 0.95 + 0.2) - 0.07 * u + 0.025 * Math.sin(u * 11);
    type P = { u: number; x: number; y: number; rad: number; a: number };
    let parts: P[] = [];
    let drawn = 0;
    let ctx: CanvasRenderingContext2D;
    const build = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, devicePixelRatio || 1);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      ctx = canvas.getContext("2d")!;
      const rand = mulberry(seed);
      const thick = r.height * 0.2;
      parts = [];
      const n = Math.round(r.width * 22);
      for (let i = 0; i < n; i++) {
        const u = rand();
        const press = Math.min(1, u / 0.05, (1 - u) / 0.12) * (0.85 + 0.15 * Math.sin(u * 7));
        const halo = rand() < 0.22;
        const sd = thick * (halo ? 1.15 : 0.36) * (0.6 + 0.4 * press);
        const y = pathY(u) * r.height + gauss(rand) * sd;
        const x = u * r.width + gauss(rand) * (halo ? 2.2 : 0.9);
        const big = rand() < 0.012;
        parts.push({ u, x: x * dpr, y: y * dpr, rad: (big ? 1.1 + rand() * 0.9 : 0.35 + rand() * 0.65) * dpr, a: halo ? 0.1 + rand() * 0.2 : (0.35 + rand() * 0.55) * (0.55 + 0.45 * press) });
      }
      parts.sort((a, b) => a.u - b.u);
      drawn = 0;
    };
    const sprayTo = (head: number) => {
      ctx.fillStyle = BLUE;
      while (drawn < parts.length && parts[drawn].u <= head) {
        const p = parts[drawn++];
        ctx.globalAlpha = p.a;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.rad, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    const ease = (t: number) => 1 - (1 - t) ** 2.4;
    let played = false;
    const play = () => {
      if (played) return;
      played = true;
      build();
      if (still) return sprayTo(1);
      let t0 = 0;
      const step = (now: number) => {
        if (!t0) t0 = now;
        const p = ease(Math.min(1, Math.max(0, now - t0 - delay) / DRAW));
        sprayTo(p * 1.0001);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (document.fonts?.ready ?? Promise.resolve()).then(play), { threshold: 0.6 });
    io.observe(canvas);
    let rs = 0;
    const onResize = () => {
      clearTimeout(rs);
      rs = window.setTimeout(() => {
        if (!played) return;
        build();
        sprayTo(1);
      }, 120);
    };
    addEventListener("resize", onResize);
    return () => {
      io.disconnect();
      removeEventListener("resize", onResize);
    };
  }, [seed, delay]);
  return (
    <span className="spray">
      {children}
      <canvas ref={cv} aria-hidden="true" />
    </span>
  );
}
