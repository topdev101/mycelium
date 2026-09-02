import { colorForDepth, nodeSize } from "./visual";
import type { GraphEdge, GraphNode } from "./types";

function cssVar(name: string): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  const parts = raw.split(/\s+/).map(Number);
  if (parts.length === 3 && parts.every((p) => !Number.isNaN(p))) {
    return `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`;
  }
  return raw || "#000";
}

export function exportGraphPng(
  nodes: GraphNode[],
  edges: GraphEdge[],
  rootConcept: string,
): void {
  if (nodes.length === 0) return;

  const pad = 90;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  const sizes = new Map(nodes.map((n) => [n.id, nodeSize(n)]));
  for (const n of nodes) {
    const s = sizes.get(n.id)!;
    minX = Math.min(minX, n.x - s.w / 2);
    minY = Math.min(minY, n.y - s.h / 2);
    maxX = Math.max(maxX, n.x + s.w / 2);
    maxY = Math.max(maxY, n.y + s.h / 2);
  }
  const worldW = maxX - minX + pad * 2;
  const worldH = maxY - minY + pad * 2;

  const scale = Math.min(2, Math.max(1, 3200 / Math.max(worldW, worldH)));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(worldW * scale);
  canvas.height = Math.round(worldH * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.scale(scale, scale);
  ctx.translate(-minX + pad, -minY + pad);

  const bg = cssVar("--bg");
  const surface = cssVar("--surface");
  const text = cssVar("--text");

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const e of edges) {
    const s = byId.get(e.source);
    const t = byId.get(e.target);
    if (!s || !t) continue;
    const mx = (s.x + t.x) / 2;
    const my = (s.y + t.y) / 2;
    const dx = t.x - s.x;
    const dy = t.y - s.y;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.quadraticCurveTo(mx - dy * 0.08, my + dx * 0.08, t.x, t.y);
    ctx.strokeStyle = colorForDepth(t.depth);
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = t.depth <= 1 ? 2 : 1.4;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  for (const n of nodes) {
    const s = sizes.get(n.id)!;
    const color = colorForDepth(n.depth);
    const x = n.x - s.w / 2;
    const y = n.y - s.h / 2;
    const r = s.h / 2;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, s.w, s.h, r);
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = surface;
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.roundRect(x, y, s.w, s.h, r);
    ctx.strokeStyle = color;
    ctx.lineWidth = n.depth === 0 ? 2 : 1.5;
    ctx.stroke();

    ctx.fillStyle = text;
    ctx.font = `${s.bold ? 650 : 550} ${s.fs}px ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let label = n.label;
    const maxTextW = s.w - 26;
    if (ctx.measureText(label).width > maxTextW) {
      while (label.length > 1 && ctx.measureText(label + "…").width > maxTextW) {
        label = label.slice(0, -1);
      }
      label += "…";
    }
    ctx.fillText(label, n.x, n.y + 1);
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = text;
  ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText("✦ mycelium", canvas.width - 16, canvas.height - 14);
  ctx.globalAlpha = 1;

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safe = rootConcept.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 40) || "map";
    a.href = url;
    a.download = `mycelium-${safe}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png");
}
