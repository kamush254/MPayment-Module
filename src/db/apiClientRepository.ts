import { pool } from "./pool";

export async function createClient(name: string, keyHash: string): Promise<void> {
  await pool.query(`INSERT INTO api_clients (name, key_hash) VALUES ($1, $2)`, [
    name,
    keyHash,
  ]);
}

export async function isValidKeyHash(keyHash: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM api_clients WHERE key_hash = $1 AND is_active = TRUE`,
    [keyHash]
  );
  return result.rowCount === 1;
}