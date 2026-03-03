import { readFileSync, writeFileSync } from "node:fs";
import { generateNodeId } from "../schema/ids.js";
import type { ParsedSpecFile } from "./types.js";

/**
 * Write system-generated IDs back into YAML spec files.
 * Uses line-by-line string replacement to preserve formatting,
 * comments, and blank lines — no YAML round-trip.
 */
export function enrichSpecFile(spec: ParsedSpecFile): { written: number } {
  const content = readFileSync(spec.filePath, "utf-8");
  const lines = content.split("\n");
  let written = 0;
  const usedNameLines = new Set<number>();

  for (const node of spec.nodes) {
    // Reserve name lines even for nodes that already have IDs,
    // so duplicate names (e.g., feature + screen) don't collide
    const nameLineIdx = findNameLine(lines, node.name, usedNameLines);
    if (nameLineIdx !== -1) usedNameLines.add(nameLineIdx);

    if (node.id) continue; // Already has an ID
    if (nameLineIdx === -1) continue;

    const generatedId = generateNodeId(node.type, node.name);

    // Look backwards from the name line for the nearest empty "id:" line
    for (let i = nameLineIdx - 1; i >= Math.max(0, nameLineIdx - 5); i--) {
      const line = lines[i];

      // Match empty id field: optional list bullet + "id:" + optional null/~
      const match = line.match(/^(\s*(?:-\s*)?)id:\s*(?:null|~|''|"")?$/);
      if (match) {
        const prefix = match[1];
        lines[i] = `${prefix}id: ${generatedId}`;
        written++;
        break;
      }

      // Stop searching if we hit another entry or section header
      const trimmed = line.trim();
      if (trimmed === "" || trimmed.startsWith("#")) continue;
      if (trimmed.startsWith("- ") && !trimmed.startsWith("- id")) break;
      if (trimmed.endsWith(":") && !trimmed.startsWith("id")) break;
    }
  }

  if (written > 0) {
    writeFileSync(spec.filePath, lines.join("\n"), "utf-8");
  }

  return { written };
}

/**
 * Find the line index containing a node's name declaration.
 * Handles unquoted, double-quoted, and single-quoted values.
 */
function findNameLine(lines: string[], name: string, skip: Set<number>): number {
  for (let i = 0; i < lines.length; i++) {
    if (skip.has(i)) continue;
    const trimmed = lines[i].trim();
    if (
      trimmed === `name: ${name}` ||
      trimmed === `name: "${name}"` ||
      trimmed === `name: '${name}'`
    ) {
      return i;
    }
  }
  return -1;
}
