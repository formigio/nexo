import type { Surreal } from "surrealdb";
import { RecordId } from "surrealdb";
import { generateNodeId } from "../schema/ids.js";
import {
  type CreateNodeInput,
  type Node,
  type NodeType,
  PROPS_SCHEMA,
} from "../schema/types.js";

/**
 * Create a new node. Validates type-specific props via Zod.
 */
export async function createNode(db: Surreal, input: CreateNodeInput): Promise<Node> {
  const nodeType = input.type as NodeType;

  // Validate type-specific props
  const propsSchema = PROPS_SCHEMA[nodeType];
  const props = propsSchema.parse(input.props);

  const id = input.id ?? generateNodeId(nodeType, input.name);

  // Build SET clauses - only include optional fields if provided
  const fields = [
    "type = $type",
    "app = $app",
    "name = $name",
    "tags = $tags",
    "props = $props",
    "createdAt = time::now()",
    "updatedAt = time::now()",
    "version = 1",
  ];
  const vars: Record<string, unknown> = {
    id,
    type: input.type,
    app: input.app,
    name: input.name,
    tags: input.tags ?? [],
    props,
  };

  if (input.description) {
    fields.push("description = $desc");
    vars.desc = input.description;
  }

  const [results] = await db.query<[any[]]>(
    `UPSERT type::record("node", $id) SET ${fields.join(", ")}`,
    vars
  );

  const result = results?.[0];
  if (!result) throw new Error(`Failed to create node: ${id}`);
  return normalizeNode(result);
}

/**
 * Get a node by its string ID (e.g., "scr_schedule").
 */
export async function getNode(db: Surreal, id: string): Promise<Node | null> {
  const [results] = await db.query<[any[]]>(
    `SELECT * FROM type::record("node", $id)`,
    { id }
  );
  const result = results?.[0];
  if (!result) return null;
  return normalizeNode(result);
}

/**
 * List nodes with optional filters.
 */
export async function listNodes(
  db: Surreal,
  filters?: { app?: string; type?: string; tag?: string }
): Promise<Node[]> {
  const conditions: string[] = [];
  const vars: Record<string, unknown> = {};

  if (filters?.app) {
    conditions.push("app = $app");
    vars.app = filters.app;
  }
  if (filters?.type) {
    conditions.push("type = $type");
    vars.type = filters.type;
  }
  if (filters?.tag) {
    conditions.push("$tag IN tags");
    vars.tag = filters.tag;
  }

  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  const query = `SELECT * FROM node${where} ORDER BY type, name`;

  const [result] = await db.query<[any[]]>(query, vars);
  return (result ?? []).map(normalizeNode);
}

/**
 * Update a node's fields. Bumps version and updatedAt.
 */
export async function updateNode(
  db: Surreal,
  id: string,
  updates: Partial<Pick<Node, "name" | "description" | "tags" | "props">>
): Promise<Node> {
  const existing = await getNode(db, id);
  if (!existing) throw new Error(`Node not found: ${id}`);

  // If props are being updated, validate against the type schema
  if (updates.props) {
    const nodeType = existing.type as NodeType;
    const propsSchema = PROPS_SCHEMA[nodeType];
    updates.props = propsSchema.parse({ ...existing.props, ...updates.props });
  }

  // Build SET clauses dynamically
  const setClauses: string[] = ["updatedAt = time::now()", "version = $version"];
  const vars: Record<string, unknown> = {
    id,
    version: existing.version + 1,
  };

  if (updates.name !== undefined) {
    setClauses.push("name = $name");
    vars.name = updates.name;
  }
  if (updates.description !== undefined) {
    setClauses.push("description = $desc");
    vars.desc = updates.description;
  }
  if (updates.tags !== undefined) {
    setClauses.push("tags = $tags");
    vars.tags = updates.tags;
  }
  if (updates.props !== undefined) {
    setClauses.push("props = $props");
    vars.props = updates.props;
  }

  const [results] = await db.query<[any[]]>(
    `UPDATE type::record("node", $id) SET ${setClauses.join(", ")}`,
    vars
  );

  const result = results?.[0];
  if (!result) throw new Error(`Failed to update node: ${id}`);
  return normalizeNode(result);
}

/**
 * Delete a node by ID. Returns true if deleted.
 */
export async function deleteNode(db: Surreal, id: string): Promise<boolean> {
  // First delete all edges connected to this node
  await db.query(
    `DELETE edge WHERE in = type::record("node", $id) OR out = type::record("node", $id)`,
    { id }
  );
  await db.query(
    `DELETE type::record("node", $id)`,
    { id }
  );
  return true;
}

/**
 * Normalize a SurrealDB record into a clean Node object.
 * Handles RecordId → string conversion for the id field.
 */
export function normalizeNode(record: any): Node {
  const id = record.id;
  const normalized = typeof id === "string"
    ? id.replace(/^node:/, "")
    : id?.id ?? id?.toString()?.replace(/^node:/, "") ?? String(id);
  return {
    ...record,
    id: normalized,
  };
}
