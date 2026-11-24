import { pool } from "./pool";

export async function createClient(
  name: string,
  keyHash: string,
  webhookSecret: string
): Promise<void> {
  await pool.query(
    `INSERT INTO api_clients (name, key_hash, webhook_secret) VALUES ($1, $2, $3)`,
    [name, keyHash, webhookSecret]
  );
}

export async function findClientByKeyHash(keyHash: string): Promise<{ id: number } | null> {
  const result = await pool.query<{ id: number }>(
    `SELECT id FROM api_clients WHERE key_hash = $1 AND is_active = TRUE`,
    [keyHash]
  );
  return result.rows[0] ?? null;
}

export async function getWebhookSecret(clientId: number): Promise<string | null> {
  const result = await pool.query<{ webhook_secret: string | null }>(
    `SELECT webhook_secret FROM api_clients WHERE id = $1`,
    [clientId]
  );
  return result.rows[0]?.webhook_secret ?? null;
}