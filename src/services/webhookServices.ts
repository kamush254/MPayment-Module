import crypto from "crypto";
import axios from "axios";
import { env } from "../config/env";
import { Payment, markWebhookDelivered } from "../db/paymentRepository";
import { getWebhookSecret } from "../db/apiClientRepository";

const RETRY_DELAYS_MS = [0, 5_000, 30_000]; // try now, then after 5s, then after 30s

async function secretFor(payment: Payment): Promise<string> {
  if (payment.client_id) {
    const own = await getWebhookSecret(payment.client_id);
    if (own) return own;
  }
  return env.webhookSecret; // older payments and clients without a secret
}

function sign(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

export async function sendWebhook(payment: Payment): Promise<void> {
  if (!payment.webhook_url) return;

  const body = JSON.stringify({
    event: "payment.updated",
    paymentId: payment.id,
    status: payment.status,
    amount: payment.amount,
    accountReference: payment.account_reference,
    mpesaReceipt: payment.mpesa_receipt,
    resultDescription: payment.result_desc,
    updatedAt: payment.updated_at,
  });
  const signature = sign(body, await secretFor(payment));

  for (const delay of RETRY_DELAYS_MS) {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    try {
      await axios.post(payment.webhook_url, body, {
        headers: { "Content-Type": "application/json", "x-signature": signature },
        timeout: 10_000,
        maxRedirects: 0,
      });
      await markWebhookDelivered(payment.id);
      console.log(`Webhook delivered for payment ${payment.id}`);
      return;
    } catch (err: any) {
      console.warn(`Webhook attempt failed for payment ${payment.id}: ${err.message}`);
    }
  }
  console.error(`Webhook gave up for payment ${payment.id}`);
}