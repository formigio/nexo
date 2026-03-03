import type { Surreal } from "surrealdb";
import { RecordId } from "surrealdb";
import {
  EDGE_CONSTRAINTS,
  type CreateEdgeInput,
  type Edge,
  type EdgeType,
} from "../schema/types.js";
import { getNode } from "./nodes.js";

/**
 * Create an edge between two nodes using RELATE.
 * Validates source/target types against EDGE_CONSTRAINTS.
 */
export async function createEdge(db: Surreal, input: CreateEdgeInput): Promise<Edge> {
  const edgeType = input.type as EdgeType;
  const constraints = EDGE_CONSTRAINTS[edgeType];

  // Validate source and target nodes exist and have valid types
  const fromNode = await getNode(db, input.from);
  if (!fromNode) throw new Error(`Source node not found: ${input.from}`);

  const toNode = await getNode(db, input.to);
  if (!toNode) throw new Error(`Target node not found: ${input.to}`);

  if (!constraints.from.includes(fromNode.type as any)) {
    throw new Error(
      `${edgeType} edge cannot originate from ${fromNode.type}. ` +
      `Allowed: ${constraints.from.join(", ")}`
    );
  }

  if (!constraints.to.includes(toNode.type as any)) {
    throw new Error(
      `${edgeType} edge cannot target ${toNode.type}. ` +
      `Allowed: ${constraints.to.join(", ")}`
    );
  }

  // Use RecordId objects for RELATE - pass them as $from and $to variables
  const setClauses = ["type = $type", "createdAt = time::now()"];
  const vars: Record<string, unknown> = {
    from: new RecordId("node", input.from),
    to: new RecordId("node", input.to),
    type: input.type,
  };

  if (input.metadata) {
    setClauses.push("metadata = $metadata");
    vars.metadata = input.metadata;
  }

  const [results] = await db.query<[any[]]>(
    `RELATE $from->edge->$to SET ${setClauses.join(", ")}`,
    vars
  );

  const edge = results?.[0];
  if (!edge) throw new Error("Failed to create edge");
  return normalizeEdge(edge);
}

/**
 * List edges with optional filters.
 */
export async function listEdges(
  db: Surreal,
  filters?: { type?: string; from?: string; to?: string }
): Promise<Edge[]> {
  const conditions: string[] = [];
  const vars: Record<string, unknown> = {};

  if (filters?.type) {
    conditions.push("type = $type");
    vars.type = filters.type;
  }
  if (filters?.from) {
    conditions.push("in = $from");
    vars.from = new RecordId("node", filters.from);
  }
  if (filters?.to) {
    conditions.push("out = $to");
    vars.to = new RecordId("node", filters.to);
  }

  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  const query = `SELECT * FROM edge${where} ORDER BY type`;

  const [result] = await db.query<[any[]]>(query, vars);
  return (result ?? []).map(normalizeEdge);
}

/**
 * Delete an edge by its SurrealDB record ID.
 */
export async function deleteEdge(db: Surreal, id: string): Promise<boolean> {
  await db.query(`DELETE type::record("edge", $id)`, { id });
  return true;
}

/**
 * Normalize a SurrealDB edge record.
 */
export function normalizeEdge(record: any): Edge {
  const normalizeId = (val: any): string => {
    if (typeof val === "string") return val.replace(/^(node|edge):/, "");
    return val?.id?.toString()?.replace(/^(node|edge):/, "") ?? val?.toString()?.replace(/^(node|edge):/, "") ?? String(val);
  };

  return {
    ...record,
    id: normalizeId(record.id),
    in: normalizeId(record.in),
    out: normalizeId(record.out),
  };
}
