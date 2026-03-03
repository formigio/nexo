import { readFileSync } from "fs";
import { resolve } from "path";

export interface ParsedScreen {
  route: string;
  componentName: string;
  accessLevel: "public" | "authenticated" | "admin";
}

// Matches: <Route path="/some/path" element={<ComponentName ... />} />
// or:      <Route path="/some/path" element={<ComponentName />} />
const ROUTE_REGEX = /<Route\s+path="([^"]+)"\s+element=\{([^}]+)\}\s*\/>/g;

// Detect wrapping context — we look for ProtectedRoute or AdminRoute inside the element
function detectAccessLevel(elementContent: string): "public" | "authenticated" | "admin" {
  if (/AdminRoute/.test(elementContent)) return "admin";
  if (/ProtectedRoute/.test(elementContent)) return "authenticated";
  return "public";
}

// Extract the primary component name from the element expression
// e.g. <ProtectedRoute><Schedule /></ProtectedRoute> → "Schedule"
// e.g. <StatusPage /> → "StatusPage"
function extractComponentName(elementContent: string): string {
  // Look for self-closing component tags (not ProtectedRoute/AdminRoute wrappers)
  const matches = elementContent.match(/<([A-Z][A-Za-z0-9]*)(?:\s[^/]*)?\s*\/>/g);
  if (matches) {
    for (const m of matches) {
      const name = m.match(/<([A-Z][A-Za-z0-9]*)/)?.[1];
      if (name && name !== "ProtectedRoute" && name !== "AdminRoute") {
        return name;
      }
    }
  }
  // Fallback: first capitalized component reference
  const first = elementContent.match(/<([A-Z][A-Za-z0-9]*)/)?.[1];
  return first ?? "Unknown";
}

/**
 * Normalize React Router :param syntax to nexo {param} convention.
 * /trip/:tripId/activity/:activityId → /trip/{tripId}/activity/{activityId}
 */
function normalizeRoute(route: string): string {
  return route.replace(/:([a-zA-Z][a-zA-Z0-9]*)/g, "{$1}");
}

/**
 * Parse App.jsx and extract all Route definitions with access levels.
 */
export function parseRoutes(appJsxPath: string): ParsedScreen[] {
  const content = readFileSync(resolve(appJsxPath), "utf-8");
  const screens: ParsedScreen[] = [];

  let match: RegExpExecArray | null;
  ROUTE_REGEX.lastIndex = 0;

  while ((match = ROUTE_REGEX.exec(content)) !== null) {
    const rawRoute = match[1];
    const elementContent = match[2];

    // Skip wildcard catch-all routes
    if (rawRoute === "*") continue;

    const route = normalizeRoute(rawRoute);
    const componentName = extractComponentName(elementContent);
    const accessLevel = detectAccessLevel(elementContent);

    screens.push({ route, componentName, accessLevel });
  }

  return screens;
}

/**
 * Derive a node name from a parsed screen.
 * componentName is used as the name since it's more descriptive than the route.
 */
export function screenName(screen: ParsedScreen): string {
  return screen.componentName;
}
