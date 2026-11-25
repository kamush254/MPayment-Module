import { env } from "../config/env";
import { getMpesaCredentials } from "../db/apiClientRepository";

export interface DarajaConfig {
  baseUrl: string;
  shortcode: string;
  passkey: string;
  consumerKey: string;
  consumerSecret: string;
  callbackUrl: string;
}

// Finds the M-Pesa details to use for a payment
export async function getDarajaConfig(clientId: number | null): Promise<DarajaConfig> {
  // Old payments from before owners existed: use the .env details
  if (clientId === null) {
    if (
      !env.daraja.shortcode ||
      !env.daraja.passkey ||
      !env.daraja.consumerKey ||
      !env.daraja.consumerSecret ||
      !env.daraja.callbackUrl
    ) {
      throw new Error("Missing Daraja configuration");
    }

    return {
      baseUrl: env.daraja.baseUrl,
      shortcode: env.daraja.shortcode,
      passkey: env.daraja.passkey,
      consumerKey: env.daraja.consumerKey,
      consumerSecret: env.daraja.consumerSecret,
      callbackUrl: env.daraja.callbackUrl,
    };
  }

  const c = await getMpesaCredentials(clientId);
  if (!c) {
    throw new Error("This client has no M-Pesa details saved");
  }
  if (c.type === "till") {
    throw new Error("Till is not supported yet (coming in Step 4)");
  }
  if (!env.daraja.callbackUrl) {
    throw new Error("DARAJA_CALLBACK_URL must be set");
$keyA2 = "<App A2 API key>"
if ([string]::IsNullOrWhiteSpace($keyA2)) {
    throw "App A2 API key is missing"
}

$r = Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/payments" `
  -Headers @{ "x-api-key" = $keyA2 } `
  -ContentType "application/json" `
  -Body '{"amount":1,"phone":"0708374149","accountReference":"ORDER030","description":"Test","idempotencyKey":"owner-test-1"}'

$r  }

  return {
    baseUrl:
      c.env === "production"
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke",
    shortcode: c.shortcode,
    passkey: c.passkey,
    consumerKey: c.consumerKey,
    consumerSecret: c.consumerSecret,
    callbackUrl: env.daraja.callbackUrl,
  };
}