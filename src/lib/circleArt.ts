/**
 * Pure geometry for the animated hero artwork. Used at build time for the first
 * frame and in the browser for every frame after, so both stay in lock-step.
 */
export type ArtVariant = "overlap" | "lines" | "orbit";

type Paint = "ink" | "ac" | "paper" | "none";

export interface Shape {
  tag: "circle" | "line";
  attrs: Record<string, number>;
  fill?: Paint;
  stroke?: Paint;
  /** class only: opacity and stroke width are plain attributes below */
  fillOpacity?: number;
  strokeWidth?: number;
}

const S = Math.sin;
const C = Math.cos;

export function circleArt(variant: ArtVariant, t: number): Shape[] {
  if (variant === "overlap") {
    const z = 1 + 0.06 * S(t * 0.7);
    const orb = (cx: number, cy: number, rad: number, sp: number, ph: number) => [
      cx + C(t * sp + ph) * rad,
      cy + S(t * sp + ph) * rad,
    ];
    const [ax, ay] = orb(150, 165, 16, 0.5, 0);
    const [bx, by] = orb(250, 165, 16, 0.45, 2);
    const [cx, cy] = orb(200, 262, 16, 0.4, 4);
    return [
      { tag: "circle", attrs: { cx: ax, cy: ay, r: 118 * z }, fill: "ac", stroke: "none", fillOpacity: 0.9 },
      { tag: "circle", attrs: { cx: bx, cy: by, r: 118 * (2 - z) }, fill: "ink", stroke: "none", fillOpacity: 0.92 },
      { tag: "circle", attrs: { cx, cy, r: 118 * z }, fill: "paper", stroke: "ink", fillOpacity: 0.35, strokeWidth: 2.5 },
      { tag: "circle", attrs: { cx: 200, cy: 190, r: 52 + 10 * S(t * 0.9) }, fill: "paper", stroke: "none", fillOpacity: 1 },
    ];
  }

  if (variant === "lines") {
    const rings: Shape[] = [];
    for (let i = 0; i < 9; i++) {
      rings.push({
        tag: "circle",
        attrs: {
          cx: 200 + 5 * S(t * 0.3 + i * 0.4),
          cy: 200 + 5 * C(t * 0.3 + i * 0.4),
          r: (44 + i * 18) * (1 + 0.05 * S(t * 0.8 - i * 0.5)),
        },
        fill: "none",
        stroke: i === 4 ? "ac" : "ink",
        strokeWidth: i === 4 ? 6 : 1.5,
      });
    }
    rings.push({ tag: "line", attrs: { x1: 20, y1: 200, x2: 380, y2: 200 }, stroke: "ink", strokeWidth: 1 });
    rings.push({ tag: "circle", attrs: { cx: 200, cy: 200, r: 26 + 6 * S(t * 1.1) }, fill: "ac", stroke: "none", fillOpacity: 1 });
    return rings;
  }

  // orbit: a small graph
  const base = [[200, 200], [90, 110], [310, 100], [330, 250], [210, 340], [70, 270], [200, 45], [360, 160], [120, 370]];
  const pts = base.map((q, i) =>
    i === 0 ? q : [q[0] + 14 * S(t * 0.6 + i * 1.7), q[1] + 14 * C(t * 0.5 + i * 2.3)]
  );
  const edges = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 6], [2, 6], [2, 7], [3, 7], [3, 4], [4, 8], [5, 8], [1, 5]];
  const out: Shape[] = edges.map(([a, b]) => ({
    tag: "line",
    attrs: { x1: pts[a][0], y1: pts[a][1], x2: pts[b][0], y2: pts[b][1] },
    stroke: "ink",
    strokeWidth: 1.5,
  }));
  pts.forEach((q, i) =>
    out.push({
      tag: "circle",
      attrs: { cx: q[0], cy: q[1], r: i === 0 ? 40 : i % 3 === 1 ? 14 : 8 },
      fill: i === 0 ? "ac" : i % 2 ? "paper" : "ink",
      stroke: "ink",
      strokeWidth: 1.5,
      fillOpacity: 1,
    })
  );
  return out;
}
