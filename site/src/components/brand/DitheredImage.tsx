import { useEffect, useRef, useState } from "react";
import { applyContrast, atkinsonDither, bayerDither, floydSteinbergDither } from "@/vendor/ditherkit-core";
import type { Color } from "@/vendor/ditherkit-core";
import { asset, reducedMotion } from "./brand";

const hex = (h: string): Color => ({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) });
const ALGOS = { atkinson: atkinsonDither, floyd: floydSteinbergDither, bayer: bayerDither } as const;

/**
 * A brand pencil-hatch illustration, re-dithered in the browser with ditherkit onto the
 * paper / ink / blue palette. On hover it resolves from coarse to fine pixels.
 */
export function DitheredImage({
  src,
  alt,
  width = 220,
  algo = "atkinson",
  palette = ["#f1eee9", "#0f1729", "#0566ff"],
}: {
  src: string;
  alt: string;
  width?: number;
  algo?: keyof typeof ALGOS;
  palette?: string[];
}) {
  const cv = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const img = new Image();
    img.src = asset(src);
    let alive = true;
    img.onload = () => {
      if (!alive) return;
      const w = Math.round(width / scale);
      const h = Math.round((w * img.naturalHeight) / img.naturalWidth);
      const c = cv.current!;
      c.width = w;
      c.height = h;
      const x = c.getContext("2d", { willReadFrequently: true })!;
      x.drawImage(img, 0, 0, w, h);
      const data = x.getImageData(0, 0, w, h);
      applyContrast(data.data, 18);
      ALGOS[algo](data.data, w, h, palette.map(hex));
      x.putImageData(data, 0, 0);
    };
    return () => {
      alive = false;
    };
  }, [src, width, algo, palette, scale]);
  const hover = (on: boolean) => {
    if (reducedMotion()) return;
    if (!on) return setScale(1);
    let s = 3;
    setScale(s);
    const step = () => {
      s -= 1;
      if (s >= 1) {
        setScale(s);
        setTimeout(step, 90);
      }
    };
    setTimeout(step, 90);
  };
  return (
    <div className="illus" onMouseEnter={() => hover(true)} onMouseLeave={() => hover(false)}>
      <canvas ref={cv} role="img" aria-label={alt} />
    </div>
  );
}
