import { getDarajaConfig } from "./darajaConfig";
import {
  insertPayment,
  findById,
  findByIdempotencyKey,
  attachCheckoutIds,
  markFailed,
  markResult,
  resetForRetry,
  Payment,
  NewPayment,
} from "../db/paymentRepository";
import { initiateStkPush } from "./darajaStk";
import { queryStkStatus } from "./darajaQuery";
import { mapStatus } from "./callbackService";
import { sendWebhook } from "./webhookServices";

export interface CreatePaymentResult {
  payment: Payment;
  created: boolean; // false means this was a duplicate request
}

async function pushToSafaricom(payment: Payment): Promise<Payment> {
  try {
    const cfg = await getDarajaConfig(payment.client_id);
    const stk = await initiateStkPush(
      {
        amount: payment.amount,
        phone: payment.phone,
        accountReference: payment.account_reference,
        description: payment.description ?? "Payment",
      },
      cfg
    );

    return attachCheckoutIds(
      payment.id,
      stk.checkoutRequestId,
      stk.merchantRequestId
    );
  } catch (err: unknown) {
    const axiosData =
      typeof err === "object" && err !== null && "response" in err
        ? (err as { response?: { data?: unknown } }).response?.data
        : undefined;
    const reason = JSON.stringify(
      axiosData ?? (err instanceof Error ? err.message : String(err))
    );
    await markFailed(payment.id, reason);
    throw err;
  }
}


export async function createPayment(input: NewPayment): Promise<CreatePaymentResult> {
  // 1. Save a PENDING record first
  const inserted = await insertPayment(input);

  if (inserted) {
    return { payment: await pushToSafaricom(inserted), created: true };
  }

  // 2. Same idempotency key was used before
  const existing = await findByIdempotencyKey(input.idempotencyKey);
  if (!existing) {
    throw new Error("Failed to load the existing payment");
  }

  // 3. Retry only if Safaricom never accepted the earlier attempt
  if (existing.status === "FAILED" && !existing.checkout_request_id) {
    const reset = await resetForRetry(existing.id);
    if (reset) {
      return { payment: await pushToSafaricom(reset), created: true };
    }
  }

  // 4. Anything else: return the original, do not charge again
  return { payment: existing, created: false };
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

  const cfg = await getDarajaConfig(payment.client_id);
  const answer = await queryStkStatus(payment.checkout_request_id, cfg);

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

  void sendWebhook(updated);
  return { payment: updated, checked: true, note: `Updated to ${updated.status}` };
}