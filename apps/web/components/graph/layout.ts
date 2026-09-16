// ADR-007: deterministic layered layout, memoised by complaint (TC-UX-014
// asserts 1px stability across reloads). A pure function of (nodes, edges) —
// no randomness, no force simulation — so the same graph always lays out
// identically.

export interface LayoutPosition {
  x: number;
  y: number;
}

const COLUMN_WIDTH = 260;
const ROW_HEIGHT = 110;

export function layeredLayout(
  nodes: { id: string; type: string }[],
  edges: { source: string; target: string }[],
): Map<string, LayoutPosition> {
  const adjacency = new Map<string, string[]>();
  for (const n of nodes) adjacency.set(n.id, []);
  for (const e of edges) {
    adjacency.get(e.source)?.push(e.target);
    adjacency.get(e.target)?.push(e.source);
  }

  const victim = nodes.find((n) => n.type === "VICTIM");
  const level = new Map<string, number>();
  if (victim) {
    level.set(victim.id, 0);
    const queue = [victim.id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentLevel = level.get(current)!;
      for (const neighbor of adjacency.get(current) ?? []) {
        if (!level.has(neighbor)) {
          level.set(neighbor, currentLevel + 1);
          queue.push(neighbor);
        }
      }
    }
  }

  // Truncation can keep a node whose only edge was cut, leaving it
  // unreachable from the victim within the rendered subgraph — placed in
  // its own trailing column rather than dropped.
  const unconnectedLevel = 1 + Math.max(0, ...level.values());

  const byLevel = new Map<number, string[]>();
  for (const n of nodes) {
    const lvl = level.get(n.id) ?? unconnectedLevel;
    const arr = byLevel.get(lvl) ?? [];
    arr.push(n.id);
    byLevel.set(lvl, arr);
  }

  const positions = new Map<string, LayoutPosition>();
  for (const [lvl, ids] of byLevel) {
    const ordered = [...ids].sort();
    ordered.forEach((id, index) => {
      positions.set(id, { x: lvl * COLUMN_WIDTH, y: index * ROW_HEIGHT - ((ordered.length - 1) * ROW_HEIGHT) / 2 });
    });
  }
  return positions;
}
