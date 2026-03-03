import { TYPE_PREFIX, type NodeType } from "./types.js";

/**
 * Convert a string to a URL-safe slug.
 * "Schedule Screen" → "schedule_screen"
 * "PUT /trips/{tripId}/rsvp" → "put_trips_tripid_rsvp"
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[{}]/g, "")           // Remove braces from path params
    .replace(/[^a-z0-9]+/g, "_")   // Replace non-alphanumeric with underscore
    .replace(/^_|_$/g, "")         // Trim leading/trailing underscores
    .replace(/_+/g, "_");          // Collapse multiple underscores
}

/**
 * Generate a node ID from its type and name.
 * ("Screen", "Schedule") → "scr_schedule"
 * ("APIEndpoint", "PUT /trips/{tripId}/rsvp") → "api_put_trips_tripid_rsvp"
 */
export function generateNodeId(type: NodeType, name: string): string {
  const prefix = TYPE_PREFIX[type];
  const slug = slugify(name);
  return `${prefix}_${slug}`;
}
