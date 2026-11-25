import { pool } from "./pool";
import { encrypt, decrypt } from "../utils/crypto";

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

export async function findClientByName(name: string): Promise<{ id: number } | null> {
  const result = await pool.query<{ id: number }>(
    `SELECT id FROM api_clients WHERE name = $1 AND is_active = TRUE`,
    [name]
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
export interface MpesaCredentials {
  shortcode: string;
  type: "paybill" | "till";
  env: "sandbox" | "production";
  passkey: string;
  consumerKey: string;
  consumerSecret: string;
}

// Saves an owner's M-Pesa details. The secret parts are locked first.
export async function saveMpesaCredentials(
  clientId: number,
  c: MpesaCredentials
): Promise<boolean> {
  const result = await pool.query(
    `UPDATE api_clients
     SET mpesa_shortcode = $2, mpesa_type = $3, mpesa_env = $4,
         mpesa_passkey_enc = $5, mpesa_consumer_key_enc = $6, mpesa_consumer_secret_enc = $7
     WHERE id = $1`,
    [
      clientId,
      c.shortcode,
      c.type,
      c.env,
      encrypt(c.passkey),
      encrypt(c.consumerKey),
      encrypt(c.consumerSecret),
    ]
  );
  return result.rowCount === 1;
}

// Reads an owner's M-Pesa details and unlocks the secret parts.
// Returns null if this owner has not saved any details.
export async function getMpesaCredentials(clientId: number): Promise<MpesaCredentials | null> {
  const result = await pool.query(
    `SELECT mpesa_shortcode, mpesa_type, mpesa_env,
            mpesa_passkey_enc, mpesa_consumer_key_enc, mpesa_consumer_secret_enc
     FROM api_clients WHERE id = $1`,
    [clientId]
  );
  const row = result.rows[0];
  if (
    !row ||
    !row.mpesa_shortcode ||
    !row.mpesa_passkey_enc ||
    !row.mpesa_consumer_key_enc ||
    !row.mpesa_consumer_secret_enc
  ) {
    return null;
  }
  return {
    shortcode: row.mpesa_shortcode,
    type: row.mpesa_type === "till" ? "till" : "paybill",
    env: row.mpesa_env === "production" ? "production" : "sandbox",
    passkey: decrypt(row.mpesa_passkey_enc),
    consumerKey: decrypt(row.mpesa_consumer_key_enc),
    consumerSecret: decrypt(row.mpesa_consumer_secret_enc),
  };
}