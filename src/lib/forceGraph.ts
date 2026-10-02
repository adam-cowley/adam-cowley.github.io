/** Tiny force-directed layout, enough for ~50 nodes. */
export interface GraphNode {
  id: string;
  label: string;
  kind: "topic" | "tag" | "post";
  href: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export type GraphLink = [string, string];

export class ForceGraph {
  alpha = 1;
  byId: Record<string, GraphNode>;

  constructor(
    public nodes: GraphNode[],
    public links: GraphLink[],
    public w: number,
    public h: number
  ) {
    this.byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    nodes.forEach((n, i) => {
      const a = (i / nodes.length) * Math.PI * 2;
      n.x = w / 2 + Math.cos(a) * w * 0.3;
      n.y = h / 2 + Math.sin(a) * h * 0.3;
    });
  }

  settle(iterations = 260) {
    for (let i = 0; i < iterations; i++) {
      this.step();
      this.alpha *= 0.985;
    }
  }

  step() {
    const { nodes, links, w, h, alpha: al } = this;
    for (const a of nodes) {
      for (const b of nodes) {
        if (a === b) continue;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy + 40;
        const f = (2600 * ((w * h) / 320000) * Math.max(1, nodes.length / 12) * 2) / d2;
        const d = Math.sqrt(d2);
        a.vx += (dx / d) * f * al;
        a.vy += (dy / d) * f * al;
      }
      a.vx += (w / 2 - a.x) * 0.004;
      a.vy += (h / 2 - a.y) * 0.004;
    }
    for (const [s, t] of links) {
      const a = this.byId[s];
      const b = this.byId[t];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const f = (d - Math.min(w, h) * 0.16) * 0.012 * al;
      a.vx += (dx / d) * f;
      a.vy += (dy / d) * f;
      b.vx -= (dx / d) * f;
      b.vy -= (dy / d) * f;
    }
    for (const n of nodes) {
      n.vx *= 0.82;
      n.vy *= 0.82;
      n.x = Math.max(64, Math.min(w - 64, n.x + n.vx));
      n.y = Math.max(24, Math.min(h - 24, n.y + n.vy));
    }
  }
}
