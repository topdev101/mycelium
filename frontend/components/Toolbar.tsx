"use client";

import { exportGraphPng } from "@/lib/exportPng";
import { useStore } from "@/lib/store";
import {
  Download,
  FolderOpen,
  Maximize2,
  Moon,
  Plus,
  Save,
  Sun,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";

type Menu = "save" | "load" | null;

function IconButton({
  onClick,
  title,
  children,
  active,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`rounded-lg p-2 transition-colors hover:bg-surface hover:text-text ${
        active ? "bg-surface text-text" : "text-dim"
      }`}
    >
      {children}
    </button>
  );
}

export function Toolbar() {
  const rootConcept = useStore((s) => s.rootConcept);
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const theme = useStore((s) => s.theme);
  const health = useStore((s) => s.health);
  const demoMode = useStore((s) => s.demoMode);
  const savedMaps = useStore((s) => s.savedMaps);

  const reset = useStore((s) => s.reset);
  const requestFit = useStore((s) => s.requestFit);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const saveCurrentMap = useStore((s) => s.saveCurrentMap);
  const openMap = useStore((s) => s.openMap);
  const removeMap = useStore((s) => s.removeMap);
  const refreshMaps = useStore((s) => s.refreshMaps);

  const [menu, setMenu] = useState<Menu>(null);
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (menu === "load") void refreshMaps();
    if (menu === "save") setTitle(rootConcept ?? "Untitled map");
  }, [menu, rootConcept, refreshMaps]);

  const llmOn = Boolean(health?.llm_enabled);
  const statusLabel = !llmOn
    ? "Demo mode"
    : demoMode
      ? "Fallback"
      : (health?.model ?? "AI on");
  const statusOk = llmOn && !demoMode;

  const doSave = () => {
    void saveCurrentMap(title.trim() || "Untitled map");
    setMenu(null);
  };

  return (
    <>
      {menu && <div className="fixed inset-0 z-30" onClick={() => setMenu(null)} />}

      <header className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-center justify-between gap-3 p-3">
        <div className="glass pointer-events-auto flex items-center gap-2.5 rounded-xl px-3 py-2">
          <span className="text-accent">
            <Logo size={22} />
          </span>
          <div className="leading-none">
            <div className="text-[14px] font-semibold tracking-tight text-text">Mycelium</div>
            {rootConcept && (
              <div className="mt-0.5 max-w-[180px] truncate text-[11px] text-faint">
                {rootConcept}
              </div>
            )}
          </div>
        </div>

        <div className="glass pointer-events-auto relative flex items-center gap-0.5 rounded-xl p-1">
          <div
            className="mr-1 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px]"
            title={
              llmOn
                ? `AI enabled · ${health?.model}`
                : "No API key — running on the mock engine"
            }
          >
            <span
              className={`h-2 w-2 rounded-full ${statusOk ? "bg-accent" : "bg-gold"}`}
              style={{ boxShadow: `0 0 8px ${statusOk ? "#2dd4bf" : "#fbbf24"}` }}
            />
            <span className="hidden text-dim sm:inline">{statusLabel}</span>
          </div>

          <div className="mx-0.5 h-5 w-px bg-border" />

          <IconButton onClick={requestFit} title="Fit to screen (F)">
            <Maximize2 size={17} />
          </IconButton>

          <div className="relative">
            <IconButton onClick={() => setMenu(menu === "save" ? null : "save")} title="Save map (⌘S)" active={menu === "save"}>
              <Save size={17} />
            </IconButton>
            {menu === "save" && (
              <div className="glass absolute right-0 top-11 z-40 w-64 rounded-xl p-3 shadow-panel">
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-faint">
                  Map name
                </label>
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && doSave()}
                  className="mb-2 w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-[13px] text-text focus:border-accent/60 focus:outline-none"
                />
                <button
                  onClick={doSave}
                  className="w-full rounded-lg bg-accent py-2 text-[13px] font-semibold text-bg transition hover:brightness-110"
                >
                  Save
                </button>
              </div>
            )}
          </div>

          <div className="relative">
            <IconButton onClick={() => setMenu(menu === "load" ? null : "load")} title="Open saved map" active={menu === "load"}>
              <FolderOpen size={17} />
            </IconButton>
            {menu === "load" && (
              <div className="glass absolute right-0 top-11 z-40 max-h-[60vh] w-72 overflow-y-auto rounded-xl p-1.5 shadow-panel">
                {savedMaps.length === 0 ? (
                  <div className="px-3 py-6 text-center text-[12.5px] text-faint">
                    No saved maps yet.
                  </div>
                ) : (
                  savedMaps.map((m) => (
                    <div
                      key={m.id}
                      className="group flex items-center gap-1 rounded-lg p-1 transition-colors hover:bg-surface"
                    >
                      <button
                        onClick={() => {
                          void openMap(m.id);
                          setMenu(null);
                        }}
                        className="min-w-0 flex-1 px-2 py-1.5 text-left"
                      >
                        <div className="truncate text-[13px] font-medium text-text">{m.title}</div>
                        <div className="text-[11px] text-faint">
                          {m.node_count} nodes · {new Date(m.updated_at).toLocaleDateString()}
                        </div>
                      </button>
                      <button
                        onClick={() => void removeMap(m.id)}
                        title="Delete"
                        className="rounded-md p-1.5 text-faint opacity-0 transition-all hover:bg-bg hover:text-gold group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <IconButton
            onClick={() => exportGraphPng(nodes, edges, rootConcept ?? "map")}
            title="Export as PNG"
          >
            <Download size={17} />
          </IconButton>

          <div className="mx-0.5 h-5 w-px bg-border" />

          <IconButton onClick={toggleTheme} title="Toggle theme">
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </IconButton>

          <button
            onClick={reset}
            title="New map (N)"
            className="ml-1 flex items-center gap-1.5 rounded-lg bg-accent/15 px-2.5 py-2 text-[13px] font-medium text-accent transition-colors hover:bg-accent/25"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New</span>
          </button>
        </div>
      </header>
    </>
  );
}
