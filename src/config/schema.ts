import { z } from "zod";

export const NexoConfigSchema = z.object({
  app: z.string().optional(),
  db: z
    .object({
      url: z.string().optional(),
      namespace: z.string().optional(),
      database: z.string().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      caFile: z.string().optional(),
    })
    .optional(),
  ingest: z
    .object({
      frontend: z.string().optional(),
      backend: z.string().optional(),
      samTemplate: z.string().optional(),
      appEntry: z.string().optional(),
      handlerSourceRoots: z.array(z.string()).optional(),
      skipDirs: z.array(z.string()).optional(),
    })
    .optional(),
  web: z
    .object({
      port: z.number().int().positive().optional(),
      host: z.string().optional(),
    })
    .optional(),
  api: z
    .object({
      url: z.string().optional(),
      key: z.string().optional(),
    })
    .optional(),
});

export type NexoConfig = z.infer<typeof NexoConfigSchema>;

export const DEFAULTS = {
  db: {
    url: "http://localhost:8000",
    namespace: "nexo",
    database: "nexo",
    username: "root",
    password: "root",
  },
  web: {
    port: 3000,
    host: "127.0.0.1",
  },
  ingest: {
    samTemplateCandidates: [
      "unified-stack/template.yaml",
      "template.yaml",
      "infra/web.yaml",
    ],
    appEntryCandidates: [
      "src/App.tsx",
      "src/App.jsx",
    ],
    handlerSourceRoots: [
      "unified-stack/src",
      "src",
    ],
    builtinSkipDirs: [
      "node_modules", "dist", ".git", ".cache", "build", "coverage",
      "__tests__", "__mocks__", "test", "tests", ".aws-sam",
    ],
  },
} as const;
