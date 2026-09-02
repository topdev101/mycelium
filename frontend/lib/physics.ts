import type { GraphNode, GraphEdge } from "./types";

export interface SimConfig {
  repulsion: number;
  linkDistance: number;
  linkStrength: number;
  center: number;
  damping: number;
  collidePadding: number;
  collideStrength: number;
  maxVelocity: number;
}

export const DEFAULT_CONFIG: SimConfig = {
  repulsion: 24000,
  linkDistance: 168,
  linkStrength: 0.05,
  center: 0.012,
  damping: 0.82,
  collidePadding: 18,
  collideStrength: 0.9,
  maxVelocity: 30,
};

export function radiusForDepth(depth: number): number {
  if (depth === 0) return 96;
  if (depth === 1) return 82;
  if (depth === 2) return 72;
  return 64;
}

export function tick(
  nodes: GraphNode[],
  edges: GraphEdge[],
  cfg: SimConfig,
  alpha: number,
): void {
  const n = nodes.length;
  if (n === 0) return;

  const radius = nodes.map((nd) => radiusForDepth(nd.depth));

  for (let i = 0; i < n; i++) {
    const a = nodes[i];
    for (let j = i + 1; j < n; j++) {
      const b = nodes[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let dist2 = dx * dx + dy * dy;
      if (dist2 < 0.01) {

        dx = (i - j) * 0.5 + 0.1;
        dy = (j - i) * 0.5 + 0.1;
        dist2 = dx * dx + dy * dy;
      }
      const dist = Math.sqrt(dist2);
      let force = (cfg.repulsion / dist2) * alpha;

      const minDist = radius[i] + radius[j] + cfg.collidePadding;
      if (dist < minDist) {
        force += ((minDist - dist) / dist) * cfg.collideStrength;
      }

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx -= fx;
      a.vy -= fy;
      b.vx += fx;
      b.vy += fy;
    }
  }

  const index = new Map<string, GraphNode>();
  for (const nd of nodes) index.set(nd.id, nd);
  for (const e of edges) {
    const s = index.get(e.source);
    const t = index.get(e.target);
    if (!s || !t) continue;
    const dx = t.x - s.x;
    const dy = t.y - s.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
    const desired = cfg.linkDistance + radiusForDepth(t.depth) * 0.4;
    const diff = ((dist - desired) / dist) * cfg.linkStrength * alpha;
    const fx = dx * diff;
    const fy = dy * diff;
    s.vx += fx;
    s.vy += fy;
    t.vx -= fx;
    t.vy -= fy;
  }

  for (const nd of nodes) {
    if (nd.pinned) {
      nd.vx = 0;
      nd.vy = 0;
      continue;
    }
    nd.vx += -nd.x * cfg.center * alpha;
    nd.vy += -nd.y * cfg.center * alpha;

    nd.vx *= cfg.damping;
    nd.vy *= cfg.damping;

    const speed = Math.hypot(nd.vx, nd.vy);
    if (speed > cfg.maxVelocity) {
      nd.vx = (nd.vx / speed) * cfg.maxVelocity;
      nd.vy = (nd.vy / speed) * cfg.maxVelocity;
    }

    nd.x += nd.vx;
    nd.y += nd.vy;
  }
}

export function seedChildPosition(
  parent: GraphNode,
  index: number,
  total: number,
): { x: number; y: number } {
  const golden = 2.399963;
  const angle = index * golden + (total > 0 ? (Math.PI * 2 * index) / total : 0);
  const dist = 120 + Math.random() * 40;
  return {
    x: parent.x + Math.cos(angle) * dist + (Math.random() - 0.5) * 24,
    y: parent.y + Math.sin(angle) * dist + (Math.random() - 0.5) * 24,
  };
}
