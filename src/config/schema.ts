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
    })
    .optional(),
  ingest: z
    .object({
      frontend: z.string().optional(),
      backend: z.string().optional(),
    })
    .optional(),
  web: z
    .object({
      port: z.number().int().positive().optional(),
      host: z.string().optional(),
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
} as const;
