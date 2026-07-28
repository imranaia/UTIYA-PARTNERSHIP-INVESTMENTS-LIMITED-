import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "./schema";

neonConfig.webSocketConstructor = ws;

let _db: NeonDatabase<typeof schema> | null = null;

// Lazy init so `next build` doesn't crash when DATABASE_URL isn't set yet
// (e.g. before the Postgres integration is provisioned on a fresh Vercel project).
export function getDb() {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    _db = drizzle(pool, { schema });
  }
  return _db;
}

export type Db = ReturnType<typeof getDb>;
export type DbTx = Parameters<Parameters<Db["transaction"]>[0]>[0];
