import { insertRawCallback } from "../db/callbackRepository";
import { markResult,findByCheckoutRequestId } from "../db/paymentRepository";
import { sendWebhook } from "./webhookServices";


// Translate Safaricom's result codes into our own clean statuses
export function mapStatus(resultCode: number): string {
  if (resultCode === 0) return "SUCCESS";
  if (resultCode === 1032) return "CANCELLED"; // customer cancelled the prompt
  if (resultCode === 1037) return "TIMEOUT"; // customer did not respond in time
  return "FAILED"; // wrong PIN, insufficient funds, etc.
}

function extractReceipt(callback: any): string | null {
  const items = callback.CallbackMetadata?.Item;
  if (!Array.isArray(items)) return null;
  const receipt = items.find((i: any) => i.Name === "MpesaReceiptNumber");
  return receipt?.Value ? String(receipt.Value) : null;
}
function extractAmount(callback: any): number | null {
  const items = callback.CallbackMetadata?.Item;
  if (!Array.isArray(items)) return null;
  const amount = items.find((i: any) => i.Name === "Amount");
  const value = Number(amount?.Value);
  return Number.isFinite(value) ? value : null;
}

export async function processStkCallback(payload: any): Promise<void> {
  // 1. Always store the raw payload first
  await insertRawCallback(payload);

  const callback = payload?.Body?.stkCallback;
  if (!callback || !callback.CheckoutRequestID) {
    console.warn("Callback ignored: unexpected payload shape");
    return;
  }

  // 2. Work out the new status
  const rawResultCode = callback.ResultCode;
  const resultCode =
    typeof rawResultCode === "number"
      ? rawResultCode
      : typeof rawResultCode === "string" && /^\d+$/.test(rawResultCode)
        ? Number(rawResultCode)
        : NaN;
  if (!Number.isSafeInteger(resultCode) || resultCode < 0) {
    console.warn("Callback ignored: invalid result code");
    return;
  }
  const status = mapStatus(resultCode);
  const receipt = status === "SUCCESS" ? extractReceipt(callback) : null;
    // Safety check: a SUCCESS must report the same amount we asked for
  if (status === "SUCCESS") {
    const payment = await findByCheckoutRequestId(callback.CheckoutRequestID);
    if (payment && payment.status !== "SUCCESS") {
      const paid = extractAmount(callback);
      if (paid === null || paid !== payment.amount) {
        console.warn(
          `Amount mismatch for payment ${payment.id}: expected ${payment.amount}, callback says ${paid}. Left unchanged.`
        );
        return;
      }
    }
  }

  // 3. Update the payment (only if still PENDING)
  const updated = await markResult(
    callback.CheckoutRequestID,
    status,
    resultCode,
    callback.ResultDesc ?? null,
    receipt
  );

  if (updated) {
    console.log(`Payment ${updated.id} is now ${updated.status}`);
        void sendWebhook(updated);
  } else {
    console.log(
      `Callback for ${callback.CheckoutRequestID} changed nothing (unknown payment or already finalised)`
    );
  }
}