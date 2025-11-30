import { Pool } from "pg";
import { env } from "../config/env";

export const pool = new Pool({ connectionString: env.databaseUrl });

export const query = (text: string, params?: Array<string | number | boolean | null | Date>) => {
  return pool.query(text, params);
};
