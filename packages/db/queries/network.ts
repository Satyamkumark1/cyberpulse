import { sql } from "drizzle-orm";
import { db } from "../client";

export interface TraversalEdgeRow {
  id: number;
  fromAccountId: number;
  toAccountId: number;
  amountPaise: number;
  timestamp: string;
  channel: string;
  depth: number;
}

// architecture/database-design.md §7, engineering/folder-structure.md §5.
// The one raw SQL statement in the codebase — isolated here so it gets
// individual review rather than relying on a "use raw SQL carefully" rule.
// Three independent protections, all required: a depth bound, a cycle guard
// (the `visited` array — a cyclic chain within the depth bound would
// otherwise loop forever), and a hard row cap (a wide fan-out within both
// bounds would otherwise return unbounded rows).
export async function traverseFromComplaint(
  complaintId: number,
  maxDepth: number,
  rowLimit: number,
): Promise<TraversalEdgeRow[]> {
  const rows = await db.execute<{
    id: number;
    from_account_id: number;
    to_account_id: number;
    amount_paise: string;
    timestamp: string;
    channel: string;
    depth: number;
  }>(sql`
    WITH RECURSIVE trail AS (
      SELECT t.id, t.from_account_id, t.to_account_id, t.amount_paise,
             t.timestamp, t.channel, 1 AS depth,
             ARRAY[t.from_account_id, t.to_account_id] AS visited
      FROM transactions t
      WHERE t.complaint_id = ${complaintId}

      UNION ALL

      SELECT t.id, t.from_account_id, t.to_account_id, t.amount_paise,
             t.timestamp, t.channel, tr.depth + 1,
             tr.visited || t.to_account_id
      FROM transactions t
      JOIN trail tr ON t.from_account_id = tr.to_account_id
      WHERE tr.depth < ${maxDepth}
        AND NOT (t.to_account_id = ANY(tr.visited))
    )
    SELECT id, from_account_id, to_account_id, amount_paise, timestamp, channel, depth
    FROM trail
    LIMIT ${rowLimit}
  `);

  // postgres-js returns `bigint`-typed columns (id, the two account ids) as
  // strings under raw `execute()` — Drizzle's `mode: "number"` conversion
  // only applies to its typed query builder, not here. Left as strings, every
  // numeric comparison against a typed Drizzle row (e.g. account.id) would
  // silently fail (`"91" !== 91`), which is exactly the kind of thing that
  // looks like a correctness bug in the caller instead of a type mismatch here.
  return Array.from(rows).map((r) => ({
    id: Number(r.id),
    fromAccountId: Number(r.from_account_id),
    toAccountId: Number(r.to_account_id),
    amountPaise: Number(r.amount_paise),
    timestamp: r.timestamp,
    channel: r.channel,
    depth: r.depth,
  }));
}
