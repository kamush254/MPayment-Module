import { findStalePending, markUnconfirmed } from "../db/paymentRepository";
import { reconcilePayment } from "../services/paymentServices";

const INTERVAL_MS = 60_000; // run every minute
const MIN_AGE_MINUTES = 2; // ignore payments younger than this
const GIVE_UP_AFTER_MINUTES = 30; // then mark UNCONFIRMED
const BATCH_SIZE = 10; // max payments checked per run
const DELAY_BETWEEN_QUERIES_MS = 2_500; // stays under Safaricom's 30/min, burst 3
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let running = false;

export async function runReconcileOnce(): Promise<void> {
  // Skip if the previous run has not finished yet
  if (running) return;
  running = true;

  try {
    // 1. Ask Safaricom about stale pending payments
    const stale = await findStalePending(MIN_AGE_MINUTES, BATCH_SIZE);

    if (stale.length > 0) {
      console.log(`Reconcile job: checking ${stale.length} pending payment(s)`);

      for (const payment of stale) {
        try {
          const result = await reconcilePayment(payment.id);
          console.log(`Reconcile job: ${payment.id} -> ${result?.note ?? "not found"}`);
        } catch (err: any) {
          // One bad payment must not stop the rest
          console.error(`Reconcile job: ${payment.id} failed:`, err.response?.data ?? err.message);
        }
        await sleep(DELAY_BETWEEN_QUERIES_MS);
      }
    }

    // 2. Give up on anything still pending after the cutoff
    const expired = await markUnconfirmed(GIVE_UP_AFTER_MINUTES);
    for (const p of expired) {
      console.log(`Reconcile job: ${p.id} marked UNCONFIRMED after ${GIVE_UP_AFTER_MINUTES} minutes`);
    }
  } catch (err: any) {
    console.error("Reconcile job failed:", err.message);
  } finally {
    running = false;
  }
}

export function startReconcileJob(): void {
  setInterval(runReconcileOnce, INTERVAL_MS);
  console.log("Reconcile job started (every 60 seconds)");
}