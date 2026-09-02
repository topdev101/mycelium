export interface Branch {
  label: string;
  teaser: string;
  relation: string;
}

export interface ExpandResponse {
  concept: string;
  summary: string;
  branches: Branch[];
  demo: boolean;
}

export interface GraphNode {
  id: string;
  label: string;
  teaser: string;
  relation: string;
  parentId: string | null;
  depth: number;
  summary?: string;
  detail?: string;
  explored: boolean;
  loading: boolean;

  x: number;
  y: number;
  vx: number;
  vy: number;
  pinned: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
}

export interface MapSummary {
  id: string;
  title: string;
  node_count: number;
  created_at: string;
  updated_at: string;
}

export interface SavedMap extends MapSummary {
  data: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    rootConcept: string;
  };
}

export interface Health {
  status: string;
  llm_enabled: boolean;
  model: string | null;
}
