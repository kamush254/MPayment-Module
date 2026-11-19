import { pool } from "./pool";

export interface Payment {
  id: string;
  idempotency_key: string;
  amount: number;
  phone: string;
  account_reference: string;
  description: string | null;
  status: string;
  checkout_request_id: string | null;
  merchant_request_id: string | null;
  mpesa_receipt: string | null;
  result_code: number | null;
  result_desc: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface NewPayment {
  idempotencyKey: string;
  amount: number;
  phone: string;
  accountReference: string;
  description: string;
}

// Returns the new row, or null if this idempotency key already exists
export async function insertPayment(p: NewPayment): Promise<Payment | null> {
  const result = await pool.query<Payment>(
    `INSERT INTO payments (idempotency_key, amount, phone, account_reference, description)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (idempotency_key) DO NOTHING
     RETURNING *`,
    [p.idempotencyKey, p.amount, p.phone, p.accountReference, p.description]
  );
  return result.rows[0] ?? null;
}

export async function findByIdempotencyKey(key: string): Promise<Payment | null> {
  const result = await pool.query<Payment>(
    `SELECT * FROM payments WHERE idempotency_key = $1`,
    [key]
  );
  return result.rows[0] ?? null;
}

export async function attachCheckoutIds(
  id: string,
  checkoutRequestId: string,
  merchantRequestId: string
): Promise<Payment> {
  const result = await pool.query<Payment>(
    `UPDATE payments
     SET checkout_request_id = $2, merchant_request_id = $3, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, checkoutRequestId, merchantRequestId]
  );
  return result.rows[0];
}

export async function markFailed(id: string, reason: string): Promise<Payment> {
  const result = await pool.query<Payment>(
    `UPDATE payments
     SET status = 'FAILED', result_desc = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, reason]
  );
  return result.rows[0];
}
// Updates a payment from a callback result.
// The "AND status = 'PENDING'" guard means a payment can only be finalised once.
// Returns null if the payment was not found or was already finalised.
export async function markResult(
  checkoutRequestId: string,
  status: string,
  resultCode: number,
  resultDesc: string | null,
  mpesaReceipt: string | null
): Promise<Payment | null> {
  const result = await pool.query<Payment>(
    `UPDATE payments
     SET status = $2, result_code = $3, result_desc = $4,
         mpesa_receipt = $5, updated_at = NOW()
        WHERE checkout_request_id = $1 AND status IN ('PENDING', 'UNCONFIRMED')
     RETURNING *`,
    [checkoutRequestId, status, resultCode, resultDesc, mpesaReceipt]
  );
  return result.rows[0] ?? null;
  
}
export async function findById(id: string): Promise<Payment | null> {
  const result = await pool.query<Payment>(
    `SELECT * FROM payments WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}
export async function findStalePending(
  olderThanMinutes: number,
  limit: number
): Promise<Payment[]> {
  const result = await pool.query<Payment>(
    `SELECT * FROM payments
     WHERE status = 'PENDING'
       AND checkout_request_id IS NOT NULL
       AND created_at < NOW() - ($1::int * INTERVAL '1 minute')
     ORDER BY created_at ASC
     LIMIT $2`,
    [olderThanMinutes, limit]
  );
  return result.rows;
}
export async function markUnconfirmed(olderThanMinutes: number): Promise<Payment[]> {
  const result = await pool.query<Payment>(
    `UPDATE payments
     SET status = 'UNCONFIRMED',
         result_desc = 'No final result from M-Pesa; check the M-Pesa statement',
         updated_at = NOW()
     WHERE status = 'PENDING'
       AND created_at < NOW() - ($1::int * INTERVAL '1 minute')
     RETURNING *`,
    [olderThanMinutes]
  );
  return result.rows;
}
export async function findByCheckoutRequestId(checkoutRequestId: string): Promise<Payment | null> {
  const result = await pool.query<Payment>(
    `SELECT * FROM payments WHERE checkout_request_id = $1`,
    [checkoutRequestId]
  );
  return result.rows[0] ?? null;
}