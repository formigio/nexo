import { readFileSync } from "node:fs";
import yaml from "js-yaml";
import { SpecFileSchema } from "./schema.js";
import type {
  ParsedSpecFile,
  ParsedNodeEntry,
  ParsedInlineEdge,
  ParsedExplicitEdge,
  SpecFileKind,
} from "./types.js";
import { INLINE_EDGES } from "./types.js";
import type { NodeType } from "../schema/types.js";

// ── Public API ───────────────────────────────────────────────

export interface ParseError {
  file: string;
  message: string;
  path?: string;
}

export interface ParseResult {
  spec: ParsedSpecFile | null;
  errors: ParseError[];
}

/**
 * Parse a single *.graph.yaml spec file.
 * Returns extracted nodes (with inline edges separated from props)
 * and any explicit edges defined in the `edges:` section.
 */
export function parseSpecFile(filePath: string): ParseResult {
  const errors: ParseError[] = [];

  let raw: unknown;
  try {
    const content = readFileSync(filePath, "utf-8");
    raw = yaml.load(content);
  } catch (err: any) {
    return {
      spec: null,
      errors: [{ file: filePath, message: `YAML parse error: ${err.message}` }],
    };
  }

  const result = SpecFileSchema.safeParse(raw);
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push({
        file: filePath,
        message: issue.message,
        path: issue.path.join("."),
      });
    }
    return { spec: null, errors };
  }

  const data = result.data;
  const header = { nexo: data.nexo, app: data.app, kind: data.kind as SpecFileKind };
  const nodes: ParsedNodeEntry[] = [];
  const explicitEdges: ParsedExplicitEdge[] = [];

  if (data.kind === "feature") {
    if (data.feature) {
      nodes.push(extractNode(data.feature as Record<string, unknown>, "Feature"));
    }
    if (data.screens) {
      for (const entry of data.screens) {
        nodes.push(extractNode(entry as Record<string, unknown>, "Screen"));
      }
    }
    if (data.components) {
      for (const entry of data.components) {
        nodes.push(extractNode(entry as Record<string, unknown>, "Component"));
      }
    }
    if (data.actions) {
      for (const entry of data.actions) {
        nodes.push(extractNode(entry as Record<string, unknown>, "UserAction"));
      }
    }
    if (data.endpoints) {
      for (const entry of data.endpoints) {
        nodes.push(extractNode(entry as Record<string, unknown>, "APIEndpoint"));
      }
    }
    if (data.rules) {
      for (const entry of data.rules) {
        nodes.push(extractNode(entry as Record<string, unknown>, "BusinessRule"));
      }
    }
  } else if (data.kind === "data") {
    if (data.entities) {
      for (const entry of data.entities) {
        const entryObj = entry as Record<string, unknown>;
        const fields = entryObj.fields as Record<string, unknown>[] | undefined;
        const { fields: _, ...entityData } = entryObj;
        const entityNode = extractNode(entityData, "DataEntity");
        nodes.push(entityNode);

        // Nested fields become separate DataField nodes with HAS_FIELD inline edges
        if (fields) {
          for (const field of fields) {
            const fieldNode = extractNode(field, "DataField");
            nodes.push(fieldNode);
            entityNode.inlineEdges.push({
              edgeType: "HAS_FIELD",
              targetName: fieldNode.name,
              targetType: "DataField",
              reverse: false,
            });
          }
        }
      }
    }
  } else if (data.kind === "infra") {
    if (data.resources) {
      for (const entry of data.resources) {
        nodes.push(extractNode(entry as Record<string, unknown>, "InfraResource"));
      }
    }
  } else if (data.kind === "shared") {
    if (data.states) {
      for (const entry of data.states) {
        nodes.push(extractNode(entry as Record<string, unknown>, "UserState"));
      }
    }
    if (data.components) {
      for (const entry of data.components) {
        nodes.push(extractNode(entry as Record<string, unknown>, "Component"));
      }
    }
    if (data.rules) {
      for (const entry of data.rules) {
        nodes.push(extractNode(entry as Record<string, unknown>, "BusinessRule"));
      }
    }
  }

  // Extract explicit edges from the `edges:` section (all kinds support it)
  const rawEdges = (data as any).edges as Array<{ type: string; from: string; to: string; metadata?: Record<string, unknown> }> | undefined;
  if (rawEdges) {
    for (const e of rawEdges) {
      explicitEdges.push(e as ParsedExplicitEdge);
    }
  }

  return {
    spec: { filePath, header, nodes, explicitEdges },
    errors,
  };
}

// ── Internals ────────────────────────────────────────────────

/** Fields common to all YAML node entries (not props, not edges) */
const COMMON_FIELDS = new Set(["id", "name", "description", "tags"]);

/** Fields that contain nested node definitions (handled separately) */
const NESTED_FIELDS: Partial<Record<NodeType, Set<string>>> = {
  DataEntity: new Set(["fields"]),
};

/**
 * Extract a ParsedNodeEntry from a raw YAML entry object.
 * Separates common fields, inline edge references, and type-specific props.
 */
function extractNode(entry: Record<string, unknown>, nodeType: NodeType): ParsedNodeEntry {
  const edgeDefs = INLINE_EDGES[nodeType] ?? {};
  const edgeFields = new Set(Object.keys(edgeDefs));
  const nestedFields = NESTED_FIELDS[nodeType] ?? new Set();

  const id = typeof entry.id === "string" && entry.id.length > 0 ? entry.id : undefined;
  const name = entry.name as string;
  const description = entry.description as string | undefined;
  const tags = entry.tags as string[] | undefined;

  const props: Record<string, unknown> = {};
  const inlineEdges: ParsedInlineEdge[] = [];

  for (const [key, value] of Object.entries(entry)) {
    if (COMMON_FIELDS.has(key) || nestedFields.has(key)) continue;

    if (edgeFields.has(key) && value != null) {
      const def = edgeDefs[key];
      const refs = Array.isArray(value) ? value : [value];
      for (const ref of refs) {
        if (typeof ref === "string" && ref.length > 0) {
          inlineEdges.push({
            edgeType: def.edgeType,
            targetName: ref,
            targetType: def.targetType,
            reverse: def.reverse ?? false,
          });
        }
      }
    } else if (!edgeFields.has(key)) {
      props[key] = value;
    }
  }

  return { id, name, type: nodeType, description, tags, props, inlineEdges };
}
