/**
 * Neon PostgreSQL database connection using drizzle-orm/neon-http adapter.
 *
 * Requires DATABASE_URL environment variable to be set with a Neon connection string.
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL environment variable is not set. " +
        "Please add a Neon PostgreSQL connection string to your .env file."
    );
  }
  return url;
};

const sql = neon(getDatabaseUrl());

export const db = drizzle(sql, { schema });

export type Database = typeof db;
