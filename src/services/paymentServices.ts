import {
  insertPayment,
   findById,
  findByIdempotencyKey,
  attachCheckoutIds,
  markFailed,
    markResult,
  Payment,
  NewPayment,
} from "../db/paymentRepository";
import { initiateStkPush } from "./darajaStk";
import { queryStkStatus } from "./darajaQuery";
import { mapStatus } from "./callbackService";

export interface CreatePaymentResult {
  payment: Payment;
  created: boolean; // false means this was a duplicate request
}

export async function createPayment(input: NewPayment): Promise<CreatePaymentResult> {
  // 1. Save a PENDING record first
  const inserted = await insertPayment(input);

  if (!inserted) {
    // Same idempotency key was used before: return the original, do not charge again
    const existing = await findByIdempotencyKey(input.idempotencyKey);
    return { payment: existing as Payment, created: false };
  }

  // 2. Ask Safaricom to send the prompt
  try {
    const stk = await initiateStkPush({
      amount: input.amount,
      phone: input.phone,
      accountReference: input.accountReference,
      description: input.description,
    });

    if (stk.responseCode !== "0") {
      const failed = await markFailed(inserted.id, stk.responseDescription);
      return { payment: failed, created: true };
    }

    // 3. Store Safaricom's IDs so the callback can find this row later
    const updated = await attachCheckoutIds(
      inserted.id,
      stk.checkoutRequestId,
      stk.merchantRequestId
    );
    return { payment: updated, created: true };
  } catch (err: any) {
    const reason = JSON.stringify(err.response?.data ?? err.message);
    await markFailed(inserted.id, reason);
    throw err;
  }
}
export async function getPayment(id: string): Promise<Payment | null> {
  return findById(id);
}
export interface ReconcileResult {
  payment: Payment;
  checked: boolean; // true if we actually asked Safaricom
  note: string;
}

export async function reconcilePayment(id: string): Promise<ReconcileResult | null> {
  const payment = await findById(id);
  if (!payment) return null;

  // Only unfinished payments with a checkout id are worth asking about
  if (payment.status !== "PENDING") {
    return { payment, checked: false, note: "Payment is already finalised" };
  }
  if (!payment.checkout_request_id) {
    return { payment, checked: false, note: "Payment has no checkout request id" };
  }

  const answer = await queryStkStatus(payment.checkout_request_id);

  if (answer.resultCode === null) {
    return { payment, checked: true, note: `Still pending: ${answer.resultDesc}` };
  }

  const status = mapStatus(answer.resultCode);

  // The query does not return the receipt number, so it stays null here
  const updated = await markResult(
    payment.checkout_request_id,
    status,
    answer.resultCode,
    answer.resultDesc,
    null
  );

  if (!updated) {
    // A callback finalised it while we were asking
    const latest = (await findById(id)) as Payment;
    return { payment: latest, checked: true, note: "Finalised by another update first" };
  }

  return { payment: updated, checked: true, note: `Updated to ${updated.status}` };
}