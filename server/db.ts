import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("DATABASE_URL is not set. Falling back to in-memory storage.");
}

export const pool = connectionString
  ? new Pool({ connectionString })
  : null;

export const db = pool ? drizzle(pool, { schema }) : null;
