import { readFileSync } from "fs";
import { load, Schema, Type, DEFAULT_SCHEMA } from "js-yaml";
import { resolve } from "path";

// CloudFormation uses custom YAML tags (!Ref, !Sub, !If, etc.)
// Register them so js-yaml doesn't throw on unknown tags.
const CF_INTRINSICS = [
  "Ref", "Sub", "If", "Equals", "Not", "And", "Or",
  "Select", "Split", "Join", "FindInMap", "GetAtt", "Base64",
  "Condition", "ImportValue", "Transform", "Cidr",
];

const cfTypes = CF_INTRINSICS.flatMap((name) => [
  new Type(`!${name}`, { kind: "scalar", construct: (d) => d }),
  new Type(`!${name}`, { kind: "sequence", construct: (d) => d }),
  new Type(`!${name}`, { kind: "mapping", construct: (d) => d }),
]);

const CF_SCHEMA = new Schema({
  implicit: (DEFAULT_SCHEMA as any).implicit,
  explicit: [...(DEFAULT_SCHEMA as any).explicit, ...cfTypes],
});

export interface ParsedEndpoint {
  method: string;
  path: string;
  authRequired: boolean;
  functionName: string;
  handler: string;
  eventName: string;
}

interface SamTemplate {
  Resources?: Record<string, SamResource>;
}

interface SamResource {
  Type: string;
  Properties?: {
    Handler?: string;
    Events?: Record<string, SamEvent>;
    [key: string]: unknown;
  };
}

interface SamEvent {
  Type: string;
  Properties?: {
    Path?: string;
    Method?: string;
    Auth?: { Authorizer?: string };
    [key: string]: unknown;
  };
}

/**
 * Parse a SAM template.yaml and extract all HttpApi endpoint definitions.
 */
export function parseSamTemplate(templatePath: string): ParsedEndpoint[] {
  const content = readFileSync(resolve(templatePath), "utf-8");
  const template = load(content, { schema: CF_SCHEMA }) as SamTemplate;

  const endpoints: ParsedEndpoint[] = [];

  if (!template?.Resources) return endpoints;

  for (const [resourceName, resource] of Object.entries(template.Resources)) {
    if (resource.Type !== "AWS::Serverless::Function") continue;

    const handler = resource.Properties?.Handler ?? "";
    const events = resource.Properties?.Events ?? {};

    for (const [eventName, event] of Object.entries(events)) {
      if (event.Type !== "HttpApi") continue;

      const props = event.Properties;
      if (!props?.Path || !props?.Method) continue;

      const authorizer = props.Auth?.Authorizer;
      const authRequired = authorizer !== "NONE";

      endpoints.push({
        method: (props.Method as string).toUpperCase(),
        path: props.Path as string,
        authRequired,
        functionName: resourceName,
        handler,
        eventName,
      });
    }
  }

  return endpoints;
}

/**
 * Derive a human-readable name for a nexo APIEndpoint node from an endpoint.
 * e.g. GET /trips/{tripId}/activities → "GET /trips/{tripId}/activities"
 */
export function endpointName(ep: ParsedEndpoint): string {
  return `${ep.method} ${ep.path}`;
}
