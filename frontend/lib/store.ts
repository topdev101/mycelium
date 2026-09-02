import { create } from "zustand";
import {
  deleteMap,
  expandConcept,
  getHealth,
  listMaps,
  loadMap,
  saveMap,
} from "./api";
import { radiusForDepth, seedChildPosition } from "./physics";
import type { GraphEdge, GraphNode, Health, MapSummary } from "./types";

let _id = 0;
const nid = () => `n${_id++}`;
const eid = () => `e${_id++}`;

let _toastId = 0;

export interface Toast {
  id: number;
  message: string;
  kind: "info" | "success" | "error";
}

export type Theme = "dark" | "light";

interface State {
  nodes: GraphNode[];
  edges: GraphEdge[];
  rootConcept: string | null;
  selectedId: string | null;
  demoMode: boolean;
  loadingMap: boolean;

  health: Health | null;
  savedMaps: MapSummary[];
  theme: Theme;
  toasts: Toast[];

  reheatToken: number;
  fitToken: number;

  init: () => Promise<void>;
  refreshHealth: () => Promise<void>;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  pushToast: (message: string, kind?: Toast["kind"]) => void;
  dismissToast: (id: number) => void;

  startMap: (concept: string) => Promise<void>;
  expandNode: (id: string) => Promise<void>;
  selectNode: (id: string | null) => void;
  setNodeDetail: (id: string, detail: string) => void;
  reset: () => void;
  requestFit: () => void;
  reheat: () => void;

  refreshMaps: () => Promise<void>;
  saveCurrentMap: (title: string) => Promise<void>;
  openMap: (id: string) => Promise<void>;
  removeMap: (id: string) => Promise<void>;
}

function ancestorLabels(nodes: GraphNode[], node: GraphNode): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const trail: string[] = [];
  let cur = node.parentId ? byId.get(node.parentId) : undefined;
  const guard = new Set<string>();
  while (cur && !guard.has(cur.id)) {
    trail.unshift(cur.label);
    guard.add(cur.id);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return trail;
}

export const useStore = create<State>((set, get) => ({
  nodes: [],
  edges: [],
  rootConcept: null,
  selectedId: null,
  demoMode: false,
  loadingMap: false,
  health: null,
  savedMaps: [],
  theme: "dark",
  toasts: [],
  reheatToken: 0,
  fitToken: 0,

  init: async () => {
    let theme: Theme = "dark";
    try {
      const stored = localStorage.getItem("mycelium-theme");
      if (stored === "light" || stored === "dark") theme = stored;
    } catch {
    }
    get().setTheme(theme);
    await Promise.all([get().refreshHealth(), get().refreshMaps()]);
  },

  refreshHealth: async () => {
    try {
      const health = await getHealth();
      set({ health });
    } catch {
      set({ health: null });
    }
  },

  setTheme: (t) => {
    set({ theme: t });
    try {
      document.documentElement.classList.toggle("light", t === "light");
      localStorage.setItem("mycelium-theme", t);
    } catch {
    }
  },

  toggleTheme: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),

  pushToast: (message, kind = "info") => {
    const id = ++_toastId;
    set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }));
    setTimeout(() => get().dismissToast(id), 3600);
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  startMap: async (concept) => {
    const trimmed = concept.trim();
    if (!trimmed) return;
    set({ loadingMap: true, demoMode: false });

    const root: GraphNode = {
      id: nid(),
      label: trimmed,
      teaser: "",
      relation: "root",
      parentId: null,
      depth: 0,
      explored: false,
      loading: true,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      pinned: false,
    };
    set({ nodes: [root], edges: [], rootConcept: trimmed, selectedId: null });
    get().reheat();

    try {
      const res = await expandConcept(trimmed, [], 6);
      const children: GraphNode[] = [];
      const edges: GraphEdge[] = [];
      res.branches.forEach((b, i) => {
        const pos = seedChildPosition(root, i, res.branches.length);
        const child: GraphNode = {
          id: nid(),
          label: b.label,
          teaser: b.teaser,
          relation: b.relation,
          parentId: root.id,
          depth: 1,
          explored: false,
          loading: false,
          x: pos.x,
          y: pos.y,
          vx: 0,
          vy: 0,
          pinned: false,
        };
        children.push(child);
        edges.push({ id: eid(), source: root.id, target: child.id, relation: b.relation });
      });
      root.explored = true;
      root.loading = false;
      root.summary = res.summary;
      set({
        nodes: [root, ...children],
        edges,
        demoMode: get().demoMode || res.demo,
        loadingMap: false,
        selectedId: root.id,
      });
      get().reheat();
    } catch (err) {
      root.loading = false;
      set({ nodes: [root], loadingMap: false });
      get().pushToast(
        `Couldn't reach the backend. Is it running on :8000? (${(err as Error).message})`,
        "error",
      );
    }
  },

  expandNode: async (id) => {
    const state = get();
    const node = state.nodes.find((n) => n.id === id);
    if (!node || node.loading || node.explored) return;

    node.loading = true;
    set({ nodes: [...state.nodes] });

    const context = ancestorLabels(state.nodes, node).concat(node.label);
    try {
      const res = await expandConcept(node.label, context, 6);
      const existing = new Set(
        state.nodes
          .filter((n) => n.parentId === node.id)
          .map((n) => n.label.toLowerCase()),
      );
      const newNodes: GraphNode[] = [];
      const newEdges: GraphEdge[] = [];
      const fresh = res.branches.filter((b) => !existing.has(b.label.toLowerCase()));
      fresh.forEach((b, i) => {
        const pos = seedChildPosition(node, i, fresh.length);
        const child: GraphNode = {
          id: nid(),
          label: b.label,
          teaser: b.teaser,
          relation: b.relation,
          parentId: node.id,
          depth: node.depth + 1,
          explored: false,
          loading: false,
          x: pos.x,
          y: pos.y,
          vx: 0,
          vy: 0,
          pinned: false,
        };
        newNodes.push(child);
        newEdges.push({ id: eid(), source: node.id, target: child.id, relation: b.relation });
      });
      node.explored = true;
      node.loading = false;
      node.summary = res.summary;
      set({
        nodes: [...get().nodes, ...newNodes],
        edges: [...get().edges, ...newEdges],
        demoMode: get().demoMode || res.demo,
      });
      get().reheat();
    } catch (err) {
      node.loading = false;
      set({ nodes: [...get().nodes] });
      get().pushToast(`Expansion failed: ${(err as Error).message}`, "error");
    }
  },

  selectNode: (id) => {
    set({ selectedId: id });
    if (id) {
      const node = get().nodes.find((n) => n.id === id);
      if (node && !node.explored && !node.loading) {
        void get().expandNode(id);
      }
    }
  },

  setNodeDetail: (id, detail) => {
    const node = get().nodes.find((n) => n.id === id);
    if (!node) return;
    node.detail = detail;
    set({ nodes: [...get().nodes] });
  },

  reset: () =>
    set({
      nodes: [],
      edges: [],
      rootConcept: null,
      selectedId: null,
      demoMode: false,
    }),

  requestFit: () => set((s) => ({ fitToken: s.fitToken + 1 })),
  reheat: () => set((s) => ({ reheatToken: s.reheatToken + 1 })),

  refreshMaps: async () => {
    try {
      set({ savedMaps: await listMaps() });
    } catch {
    }
  },

  saveCurrentMap: async (title) => {
    const { nodes, edges, rootConcept } = get();
    if (!nodes.length || !rootConcept) {
      get().pushToast("Nothing to save yet — explore a topic first.", "info");
      return;
    }
    try {
      await saveMap(title, { nodes, edges, rootConcept });
      await get().refreshMaps();
      get().pushToast("Map saved.", "success");
    } catch (err) {
      get().pushToast(`Save failed: ${(err as Error).message}`, "error");
    }
  },

  openMap: async (id) => {
    try {
      const m = await loadMap(id);
      const nodes = m.data.nodes.map((n) => ({ ...n, vx: 0, vy: 0, loading: false }));
      set({
        nodes,
        edges: m.data.edges,
        rootConcept: m.data.rootConcept,
        selectedId: null,
        demoMode: false,
      });
      get().reheat();
      get().requestFit();
      get().pushToast(`Loaded "${m.title}".`, "success");
    } catch (err) {
      get().pushToast(`Load failed: ${(err as Error).message}`, "error");
    }
  },

  removeMap: async (id) => {
    try {
      await deleteMap(id);
      await get().refreshMaps();
      get().pushToast("Map deleted.", "info");
    } catch (err) {
      get().pushToast(`Delete failed: ${(err as Error).message}`, "error");
    }
  },
}));

export { radiusForDepth };
