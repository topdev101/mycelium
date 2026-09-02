"use client";

import { useCallbackRef } from "@/lib/useCallbackRef";
import { DEFAULT_CONFIG, radiusForDepth, tick } from "@/lib/physics";
import { useStore } from "@/lib/store";
import type { GraphEdge, GraphNode } from "@/lib/types";
import { colorForDepth, nodeSize } from "@/lib/visual";
import { useEffect, useMemo, useRef } from "react";

interface VP {
  x: number;
  y: number;
  k: number;
}

export function GraphCanvas() {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const selectedId = useStore((s) => s.selectedId);
  const reheatToken = useStore((s) => s.reheatToken);
  const fitToken = useStore((s) => s.fitToken);
  const selectNode = useStore((s) => s.selectNode);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const viewportGRef = useRef<SVGGElement | null>(null);
  const nodeEls = useRef<Map<string, SVGGElement | null>>(new Map());
  const edgeEls = useRef<Map<string, SVGPathElement | null>>(new Map());

  const nodesRef = useRef<GraphNode[]>(nodes);
  const edgesRef = useRef<GraphEdge[]>(edges);
  const alphaRef = useRef(0);
  const vpRef = useRef<VP>({ x: 0, y: 0, k: 1 });
  const vpTargetRef = useRef<VP>({ x: 0, y: 0, k: 1 });
  const sizeRef = useRef({ w: 0, h: 0 });
  const draggingRef = useRef<{ id: string; lastX: number; lastY: number; moved: boolean } | null>(
    null,
  );
  const panRef = useRef<{ lastX: number; lastY: number } | null>(null);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  useEffect(() => {
    alphaRef.current = 1;
  }, [reheatToken]);

  const centerView = useCallbackRef(() => {
    const { w, h } = sizeRef.current;
    vpRef.current = { x: w / 2, y: h / 2, k: 1 };
    vpTargetRef.current = { ...vpRef.current };
  });

  const fitView = useCallbackRef(() => {
    const ns = nodesRef.current;
    const { w, h } = sizeRef.current;
    if (ns.length === 0 || w === 0) return;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const n of ns) {
      const r = radiusForDepth(n.depth);
      minX = Math.min(minX, n.x - r);
      minY = Math.min(minY, n.y - r);
      maxX = Math.max(maxX, n.x + r);
      maxY = Math.max(maxY, n.y + r);
    }
    const pad = 90;
    const bw = maxX - minX + pad * 2;
    const bh = maxY - minY + pad * 2;
    const k = Math.min(1.4, Math.max(0.25, Math.min(w / bw, h / bh)));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    vpTargetRef.current = { x: w / 2 - cx * k, y: h / 2 - cy * k, k };
  });

  useEffect(() => {
    if (fitToken > 0) fitView();
  }, [fitToken, fitView]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const resize = () => {
      const rect = svg.getBoundingClientRect();
      const first = sizeRef.current.w === 0;
      sizeRef.current = { w: rect.width, h: rect.height };
      if (first) centerView();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(svg);

    let raf = 0;
    const loop = () => {
      const ns = nodesRef.current;
      const es = edgesRef.current;

      if (alphaRef.current > 0.008 || draggingRef.current) {
        tick(ns, es, DEFAULT_CONFIG, Math.max(alphaRef.current, 0.05));
        alphaRef.current *= 0.985;
      }

      const vp = vpRef.current;
      const tgt = vpTargetRef.current;
      vp.x += (tgt.x - vp.x) * 0.18;
      vp.y += (tgt.y - vp.y) * 0.18;
      vp.k += (tgt.k - vp.k) * 0.18;
      if (viewportGRef.current) {
        viewportGRef.current.setAttribute(
          "transform",
          `translate(${vp.x.toFixed(2)},${vp.y.toFixed(2)}) scale(${vp.k.toFixed(4)})`,
        );
      }

      for (const n of ns) {
        const el = nodeEls.current.get(n.id);
        if (el) el.setAttribute("transform", `translate(${n.x.toFixed(2)},${n.y.toFixed(2)})`);
      }

      const byId = new Map(ns.map((n) => [n.id, n]));
      for (const e of es) {
        const el = edgeEls.current.get(e.id);
        if (!el) continue;
        const s = byId.get(e.source);
        const t = byId.get(e.target);
        if (!s || !t) continue;
        const mx = (s.x + t.x) / 2;
        const my = (s.y + t.y) / 2;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const cx = mx - dy * 0.08;
        const cy = my + dx * 0.08;
        el.setAttribute("d", `M${s.x.toFixed(1)},${s.y.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${t.x.toFixed(1)},${t.y.toFixed(1)}`);
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [centerView]);

  const onNodePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const node = nodesRef.current.find((n) => n.id === id);
    if (node) node.pinned = true;
    draggingRef.current = { id, lastX: e.clientX, lastY: e.clientY, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = draggingRef.current;
    if (drag) {
      const node = nodesRef.current.find((n) => n.id === drag.id);
      if (node) {
        const k = vpRef.current.k;
        node.x += (e.clientX - drag.lastX) / k;
        node.y += (e.clientY - drag.lastY) / k;
        node.vx = 0;
        node.vy = 0;
      }
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) drag.moved = true;
      alphaRef.current = Math.max(alphaRef.current, 0.4);
      return;
    }
    const pan = panRef.current;
    if (pan) {
      const dx = e.clientX - pan.lastX;
      const dy = e.clientY - pan.lastY;
      vpRef.current.x += dx;
      vpRef.current.y += dy;
      vpTargetRef.current.x += dx;
      vpTargetRef.current.y += dy;
      pan.lastX = e.clientX;
      pan.lastY = e.clientY;
    }
  };

  const endInteraction = () => {
    const drag = draggingRef.current;
    if (drag) {
      const node = nodesRef.current.find((n) => n.id === drag.id);
      if (node) node.pinned = false;
      if (!drag.moved) selectNode(drag.id);
      draggingRef.current = null;
    }
    panRef.current = null;
  };

  const onBgPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    panRef.current = { lastX: e.clientX, lastY: e.clientY };
  };

  const onWheel = (e: React.WheelEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const vp = vpRef.current;
    const factor = Math.exp(-e.deltaY * 0.0016);
    const newK = Math.min(2.4, Math.max(0.18, vp.k * factor));
    const wx = (mx - vp.x) / vp.k;
    const wy = (my - vp.y) / vp.k;
    vp.x = mx - wx * newK;
    vp.y = my - wy * newK;
    vp.k = newK;
    vpTargetRef.current = { ...vp };
  };

  const dprMemo = useMemo(() => nodes.map((n) => ({ n, size: nodeSize(n) })), [nodes]);

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 h-full w-full touch-none"
      style={{ cursor: panRef.current ? "grabbing" : "grab", zIndex: 1 }}
      onPointerDown={onBgPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endInteraction}
      onPointerLeave={endInteraction}
      onWheel={onWheel}
    >
      <g ref={viewportGRef}>
        <g>
          {edges.map((e) => {
            const target = nodes.find((n) => n.id === e.target);
            const c = colorForDepth(target ? target.depth : 1);
            return (
              <path
                key={e.id}
                ref={(el) => {
                  edgeEls.current.set(e.id, el);
                }}
                fill="none"
                stroke={c}
                strokeOpacity={0.32}
                strokeWidth={target && target.depth <= 1 ? 2 : 1.4}
                strokeLinecap="round"
              />
            );
          })}
        </g>

        <g>
          {dprMemo.map(({ n, size }) => {
            const color = colorForDepth(n.depth);
            const selected = n.id === selectedId;
            const r = radiusForDepth(n.depth);
            return (
              <g
                key={n.id}
                ref={(el) => {
                  nodeEls.current.set(n.id, el);
                }}
                style={{ cursor: "pointer" }}
                onPointerDown={(e) => onNodePointerDown(e, n.id)}
              >
                {n.loading && (
                  <circle
                    r={r * 0.5}
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    className="animate-pulse-ring"
                    style={{ transformOrigin: "center" }}
                  />
                )}
                {n.depth === 0 && (
                  <circle r={r * 0.72} fill={color} opacity={0.06} />
                )}
                <foreignObject
                  x={-size.w / 2}
                  y={-size.h / 2}
                  width={size.w}
                  height={size.h}
                  style={{ overflow: "visible" }}
                >
                  <div
                    title={n.teaser || n.label}
                    className="node-card"
                    style={{
                      width: size.w,
                      height: size.h,
                      fontSize: size.fs,
                      ["--nc" as string]: color,
                    }}
                    data-selected={selected ? "true" : "false"}
                    data-root={n.depth === 0 ? "true" : "false"}
                    data-unexplored={!n.explored && !n.loading ? "true" : "false"}
                  >
                    <span className="node-label">{n.label}</span>
                    {!n.explored && !n.loading && <span className="node-plus">+</span>}
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
}
