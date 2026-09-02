"use client";

import { streamDeepDive } from "@/lib/api";
import { useStore } from "@/lib/store";
import type { GraphNode } from "@/lib/types";
import { colorForDepth } from "@/lib/visual";
import { AnimatePresence, motion } from "framer-motion";
import { CornerDownRight, Loader2, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Markdown } from "./Markdown";

function ancestorsOf(nodes: GraphNode[], node: GraphNode): GraphNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out: GraphNode[] = [];
  const seen = new Set<string>();
  let cur = node.parentId ? byId.get(node.parentId) : undefined;
  while (cur && !seen.has(cur.id)) {
    out.unshift(cur);
    seen.add(cur.id);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return out;
}

export function DeepDivePanel() {
  const nodes = useStore((s) => s.nodes);
  const selectedId = useStore((s) => s.selectedId);
  const selectNode = useStore((s) => s.selectNode);
  const setNodeDetail = useStore((s) => s.setNodeDetail);
  const demoMode = useStore((s) => s.demoMode);

  const node = nodes.find((n) => n.id === selectedId) ?? null;

  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const current = useStore.getState().nodes.find((n) => n.id === selectedId) ?? null;
    if (!current) {
      setText("");
      setStreaming(false);
      return;
    }
    if (current.detail) {
      setText(current.detail);
      setStreaming(false);
      return;
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setText("");
    setStreaming(true);
    const ctx = ancestorsOf(useStore.getState().nodes, current).map((a) => a.label);
    let acc = "";
    streamDeepDive(
      current.label,
      ctx,
      (tk) => {
        acc += tk;
        setText(acc);
      },
      ctrl.signal,
    )
      .then(() => {
        setStreaming(false);
        if (acc) setNodeDetail(current.id, acc);
      })
      .catch(() => {
        if (ctrl.signal.aborted) return;
        setStreaming(false);
        setText(acc || "Couldn't load an explanation. Is the backend running?");
      });
    return () => ctrl.abort();

  }, [selectedId]);

  const children = node ? nodes.filter((n) => n.parentId === node.id) : [];
  const trail = node ? ancestorsOf(nodes, node) : [];
  const color = node ? colorForDepth(node.depth) : "#2dd4bf";

  return (
    <AnimatePresence>
      {node && (
        <motion.aside
          key="deepdive"
          initial={{ x: 440, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 440, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 34 }}
          className="glass fixed right-3 top-[72px] bottom-3 z-20 flex w-[min(400px,calc(100vw-24px))] flex-col rounded-2xl shadow-panel"
        >
          <div className="flex items-start gap-2 border-b border-border/70 p-4">
            <div className="min-w-0 flex-1">
              {trail.length > 0 && (
                <div className="mb-1.5 flex flex-wrap items-center gap-1 text-[11px] text-faint">
                  {trail.map((a, i) => (
                    <span key={a.id} className="flex items-center gap-1">
                      <button
                        onClick={() => selectNode(a.id)}
                        className="max-w-[120px] truncate rounded px-1 transition-colors hover:text-accent"
                      >
                        {a.label}
                      </button>
                      {i < trail.length - 1 && <span className="opacity-50">/</span>}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <span
                  className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  style={{ color, borderColor: `${color}66`, background: `${color}1a` }}
                >
                  {node.relation}
                </span>
              </div>
              <h2 className="mt-1.5 text-lg font-semibold leading-snug text-text">
                {node.label}
              </h2>
            </div>
            <button
              onClick={() => selectNode(null)}
              aria-label="Close"
              className="shrink-0 rounded-lg p-1.5 text-dim transition-colors hover:bg-surface hover:text-text"
            >
              <X size={18} />
            </button>
          </div>

          <div ref={bodyRef} className="no-scrollbar flex-1 overflow-y-auto p-4">
            <motion.div
              key={node.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {node.summary ? (
                <div className="mb-4 flex gap-2 rounded-xl border border-border/60 bg-surface/50 p-3">
                  <Sparkles size={15} className="mt-0.5 shrink-0 text-accent" />
                  <p className="text-[13.5px] leading-relaxed text-dim">{node.summary}</p>
                </div>
              ) : node.loading ? (
                <div className="mb-4 h-16 animate-pulse rounded-xl border border-border/60 bg-surface/40" />
              ) : null}

              <div className="text-[14px]">
                {streaming && text.length === 0 ? (
                  <div className="flex items-center gap-2 text-dim">
                    <Loader2 size={15} className="animate-spin text-accent" />
                    <span className="text-[13px]">Thinking…</span>
                  </div>
                ) : (
                  <Markdown text={text} streaming={streaming} />
                )}
              </div>

              <div className="mt-6">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-faint">
                  <CornerDownRight size={13} />
                  Branches
                </div>
                {children.length === 0 && node.loading ? (
                  <div className="flex items-center gap-2 py-2 text-[13px] text-dim">
                    <Loader2 size={14} className="animate-spin text-accent" />
                    Growing branches…
                  </div>
                ) : children.length === 0 ? (
                  <p className="py-1 text-[13px] text-faint">
                    Click this node on the canvas to grow its branches.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {children.map((c) => {
                      const cc = colorForDepth(c.depth);
                      return (
                        <li key={c.id}>
                          <button
                            onClick={() => selectNode(c.id)}
                            className="group w-full rounded-xl border border-border/50 bg-surface/40 p-2.5 text-left transition-all hover:border-border hover:bg-surface"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{ background: cc, boxShadow: `0 0 8px ${cc}` }}
                              />
                              <span className="flex-1 truncate text-[13.5px] font-medium text-text">
                                {c.label}
                              </span>
                            </div>
                            {c.teaser && (
                              <p className="mt-1 line-clamp-2 pl-3.5 text-[12px] leading-snug text-faint">
                                {c.teaser}
                              </p>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </motion.div>
          </div>

          {demoMode && (
            <div className="border-t border-border/70 px-4 py-2.5 text-[11px] text-faint">
              Demo content · add an{" "}
              <code className="rounded bg-surface px-1 text-dim">OPENAI_API_KEY</code> for real AI
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
