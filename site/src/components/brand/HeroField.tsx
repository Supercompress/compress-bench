import { DitherShader } from "@/lib/dither";
import { reducedMotion } from "./brand";

/**
 * The hero backdrop, drawn with dithercn: rows of log "words" drifting right. Past the middle
 * the compressor runs: most rows drop out and only the few that matter carry on, in blue.
 */
const FIELD = /* glsl */ `
float field(vec2 uv, vec2 res, float t) {
  float rowH = 5.0;
  float fy = uv.y * res.y / rowH;
  float row = floor(fy);
  float inRow = step(fract(fy), 0.55);
  float r = hash21(vec2(row, 1.0));
  float x = uv.x * res.x - t * (6.0 + 10.0 * r);
  float segW = 5.0 + 14.0 * hash21(vec2(row, 4.0));
  float seg = floor(x / segW);
  float word = step(0.3, hash21(vec2(seg, row))) * step(0.12, fract(x / segW));
  float kept = step(0.9, hash21(vec2(row, 7.0)));
  float gate = smoothstep(0.5, 0.62, uv.x + 0.04 * snoise(vec2(row * 0.3, t * 0.2)));
  float keep = mix(1.0, kept, gate);
  float n = fbm(uv * vec2(2.0, 3.0) + vec2(t * 0.03, 0.0));
  float tone = inRow * word * keep * (0.25 + 0.55 * n + 0.35 * kept * gate);
  return tone * (0.35 + 0.65 * smoothstep(0.0, 0.25, uv.x));
}
`;

export function HeroField() {
  return (
    <div className="hero-field" aria-hidden="true">
      <DitherShader field={FIELD} palette={["#f7f5f2", "#0566ff"]} matrix="bayer4" cell={3} speed={1} fps={30} animate={!reducedMotion()} stillTime={8} />
    </div>
  );
}
