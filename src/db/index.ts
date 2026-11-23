import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL || "postgres://csagil_user:csagil_password@localhost:5432/csagil_db";

const isRemote =
  connectionString.includes("supabase.co") ||
  connectionString.includes("pooler.supabase.com") ||
  connectionString.includes("sslmode=require");

// For serverless Vercel / edge: max: 1 connection per lambda
// For local node: standard pooling
const client = postgres(connectionString, {
  max: process.env.NODE_ENV === "production" ? 5 : 10,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(client, { schema });
export type Database = typeof db;
export * from "./schema";
