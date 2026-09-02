import type {
  ExpandResponse,
  Health,
  MapSummary,
  SavedMap,
  GraphNode,
  GraphEdge,
} from "./types";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${body ? ` — ${body}` : ""}`);
  }
  return res.json() as Promise<T>;
}

export async function getHealth(): Promise<Health> {
  return json<Health>(await fetch("/api/health"));
}

export async function expandConcept(
  concept: string,
  context: string[],
  count = 6,
): Promise<ExpandResponse> {
  const res = await fetch("/api/expand", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ concept, context, count }),
  });
  return json<ExpandResponse>(res);
}

export async function streamDeepDive(
  concept: string,
  context: string[],
  onToken: (text: string) => void,
  signal?: AbortSignal,
): Promise<{ demo: boolean }> {
  const res = await fetch("/api/deepdive", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ concept, context }),
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`deep-dive failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let demo = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      let event = "message";
      let data = "";
      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data) continue;
      try {
        const parsed = JSON.parse(data);
        if (event === "token" && typeof parsed.text === "string") {
          onToken(parsed.text);
        } else if (event === "done") {
          demo = Boolean(parsed.demo);
        } else if (event === "error") {
          throw new Error(parsed.message || "stream error");
        }
      } catch {
      }
    }
  }
  return { demo };
}

export async function listMaps(): Promise<MapSummary[]> {
  return json<MapSummary[]>(await fetch("/api/maps"));
}

export async function saveMap(
  title: string,
  data: { nodes: GraphNode[]; edges: GraphEdge[]; rootConcept: string },
): Promise<SavedMap> {
  const res = await fetch("/api/maps", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, data }),
  });
  return json<SavedMap>(res);
}

export async function loadMap(id: string): Promise<SavedMap> {
  return json<SavedMap>(await fetch(`/api/maps/${id}`));
}

export async function deleteMap(id: string): Promise<void> {
  const res = await fetch(`/api/maps/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`delete failed: ${res.status}`);
}
