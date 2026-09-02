import type { GraphNode } from "./types";

export const DEPTH_COLORS = [
  "#2dd4bf",
  "#38bdf8",
  "#a78bfa",
  "#fbbf24",
  "#f472b6",
  "#4ade80",
];

export const colorForDepth = (depth: number): string =>
  DEPTH_COLORS[Math.min(Math.max(depth, 0), DEPTH_COLORS.length - 1)];

export interface NodeSize {
  w: number;
  h: number;
  fs: number;
  bold: boolean;
}

const clamp = (min: number, v: number, max: number) => Math.max(min, Math.min(v, max));

export function nodeSize(node: GraphNode): NodeSize {
  if (node.depth === 0) {
    return { w: clamp(140, node.label.length * 10.6 + 44, 300), h: 52, fs: 17, bold: true };
  }
  return { w: clamp(96, node.label.length * 7.9 + 34, 220), h: 38, fs: 13, bold: false };
}
