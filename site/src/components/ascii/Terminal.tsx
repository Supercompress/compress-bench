import { useMemo } from "react";
import { AsciiGrid } from "@/lib/ascii";
import type { AsciiGridDrawContext } from "@/lib/ascii";
import { reducedMotion } from "@/components/brand/brand";

type Rgb = readonly [number, number, number];
export const C = {
  ink: [201, 212, 234] as Rgb,
  dim: [107, 122, 153] as Rgb,
  faint: [58, 72, 102] as Rgb,
  blue: [93, 155, 255] as Rgb,
  green: [74, 222, 160] as Rgb,
  red: [255, 122, 110] as Rgb,
  amber: [255, 196, 92] as Rgb,
  white: [240, 244, 252] as Rgb,
};

/** One terminal line. `type` lines are typed out; `bar` lines fill a progress bar over `dur`. */
export type Line = {
  at: number;
  segs: { text: string; color?: Rgb }[];
  type?: boolean;
  bar?: { width: number; to: number; dur: number; color?: Rgb; suffix?: string };
};

const plain = (l: Line) => l.segs.map((s) => s.text).join("");

/**
 * An asciicn terminal: a scripted session drawn glyph by glyph on a canvas. Loops every `loop`
 * seconds. With reduced motion it shows the finished transcript.
 */
export function Terminal({ lines, loop = 16, cell = 13, title = "zsh", height = 430, light = false }: { lines: Line[]; loop?: number; cell?: number; title?: string; height?: number; light?: boolean }) {
  const still = useMemo(() => reducedMotion(), []);
  const end = Math.max(...lines.map((l) => l.at + (l.type ? plain(l).length / 38 : 0) + (l.bar?.dur ?? 0)));
  const draw = ({ frame, columns, rows, time }: AsciiGridDrawContext) => {
    const t = still ? end + 1 : time % loop;
    const shown = lines.filter((l) => l.at <= t);
    const start = Math.max(0, shown.length - (rows - 2));
    let y = 1;
    let cursor: [number, number] | null = null;
    for (const l of shown.slice(start)) {
      let x = 2;
      let budget = l.type ? Math.floor((t - l.at) * 38) : Infinity;
      for (const s of l.segs) {
        const txt = s.text.slice(0, Math.max(0, budget));
        budget -= s.text.length;
        frame.write(x, y, txt.slice(0, Math.max(0, columns - x - 1)), s.color ?? C.ink);
        x += txt.length;
      }
      if (l.type && budget < 0) cursor = [x, y];
      if (l.bar) {
        const p = Math.min(1, Math.max(0, (t - l.at) / l.bar.dur));
        const w = Math.min(l.bar.width, columns - x - 12);
        const fill = p * l.bar.to * w;
        for (let i = 0; i < w; i++) {
          const g = i < Math.floor(fill) ? "█" : i < fill ? "▌" : "·";
          frame.put(x + i, y, g, i < fill ? (l.bar.color ?? C.blue) : C.faint);
        }
        if (p >= 1 && l.bar.suffix) frame.write(x + w + 2, y, l.bar.suffix, C.ink);
        else if (p < 1) frame.write(x + w + 2, y, `${Math.round(p * 100)}%`, C.dim);
      }
      y++;
    }
    if (!cursor) cursor = [2, y];
    if (Math.floor(t * 2) % 2 === 0 || still) frame.put(cursor[0], cursor[1], "▋", C.blue);
  };
  return (
    <div className={`term${light ? " term-light" : ""}`}>
      <div className="term-bar">
        <i />
        <i />
        <i />
        <span>{title}</span>
      </div>
      <div className="term-body" style={{ height }}>
        <AsciiGrid className="absolute inset-0" draw={draw} cell={cell} colored paper="transparent" fps={30} animate={!still} stillTime={end + 1} />
      </div>
    </div>
  );
}
