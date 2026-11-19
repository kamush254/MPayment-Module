import { pool } from "./pool";

export async function insertRawCallback(payload: unknown): Promise<void> {
  await pool.query(`INSERT INTO callbacks_raw (payload) VALUES ($1)`, [
    JSON.stringify(payload),
  ]);
}