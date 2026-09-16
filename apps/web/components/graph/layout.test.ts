import { describe, expect, it } from "vitest";
import { layeredLayout } from "./layout";

describe("layeredLayout — TC-UX-014 determinism", () => {
  const nodes = [
    { id: "victim:C-1", type: "VICTIM" },
    { id: "acct:A", type: "MULE_ACCOUNT" },
    { id: "acct:B", type: "MULE_ACCOUNT" },
    { id: "atm:X", type: "ATM" },
  ];
  const edges = [
    { source: "victim:C-1", target: "acct:A" },
    { source: "acct:A", target: "acct:B" },
    { source: "acct:B", target: "atm:X" },
  ];

  it("places the victim at column 0 and each hop one column further", () => {
    const positions = layeredLayout(nodes, edges);
    expect(positions.get("victim:C-1")?.x).toBe(0);
    expect(positions.get("acct:A")?.x).toBe(260);
    expect(positions.get("acct:B")?.x).toBe(520);
    expect(positions.get("atm:X")?.x).toBe(780);
  });

  it("is stable across repeated calls with the same input (1px determinism)", () => {
    const first = layeredLayout(nodes, edges);
    const second = layeredLayout([...nodes], [...edges]);
    for (const n of nodes) {
      expect(second.get(n.id)).toEqual(first.get(n.id));
    }
  });

  it("places a node unreachable from the victim (a truncated edge) in a trailing column instead of dropping it", () => {
    const orphan = { id: "atm:ORPHAN", type: "ATM" as const };
    const positions = layeredLayout([...nodes, orphan], edges);
    expect(positions.has("atm:ORPHAN")).toBe(true);
    expect(positions.get("atm:ORPHAN")!.x).toBeGreaterThan(positions.get("atm:X")!.x);
  });

  it("positions every node when there is no victim node at all", () => {
    const positions = layeredLayout(
      [{ id: "acct:A", type: "MULE_ACCOUNT" }],
      [],
    );
    expect(positions.size).toBe(1);
  });
});
