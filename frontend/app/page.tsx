"use client";

import { Composer } from "@/components/Composer";
import { DeepDivePanel } from "@/components/DeepDivePanel";
import { GraphCanvas } from "@/components/GraphCanvas";
import { Toasts } from "@/components/Toasts";
import { Toolbar } from "@/components/Toolbar";
import { useStore } from "@/lib/store";
import { useEffect } from "react";

function ControlsHint() {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-10 hidden select-none rounded-lg px-1 text-[11.5px] text-faint sm:block">
      <span className="opacity-80">Drag</span> to pan ·{" "}
      <span className="opacity-80">Scroll</span> to zoom ·{" "}
      <span className="opacity-80">Click</span> a node to grow it
    </div>
  );
}

export default function Home() {
  const init = useStore((s) => s.init);
  const nodes = useStore((s) => s.nodes);
  const rootConcept = useStore((s) => s.rootConcept);
  const selectedId = useStore((s) => s.selectedId);
  const selectNode = useStore((s) => s.selectNode);
  const reset = useStore((s) => s.reset);
  const requestFit = useStore((s) => s.requestFit);
  const saveCurrentMap = useStore((s) => s.saveCurrentMap);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";

      if (e.key === "Escape") {
        if (selectedId) selectNode(null);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (nodes.length) void saveCurrentMap(rootConcept ?? "Untitled map");
        return;
      }
      if (typing) return;
      if (e.key.toLowerCase() === "f") requestFit();
      if (e.key.toLowerCase() === "n") reset();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, nodes.length, rootConcept, selectNode, reset, requestFit, saveCurrentMap]);

  const hasMap = nodes.length > 0;

  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden">
      <div className="ambient" />
      <div className="grid-veil" />
      <GraphCanvas />
      {hasMap ? <Toolbar /> : <Composer />}
      <DeepDivePanel />
      {hasMap && <ControlsHint />}
      <Toasts />
    </main>
  );
}
