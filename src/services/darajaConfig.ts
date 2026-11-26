import { env } from "../config/env";
import { getMpesaCredentials } from "../db/apiClientRepository";

export interface DarajaConfig {
  baseUrl: string;
  shortcode: string;
  passkey: string;
  consumerKey: string;
  consumerSecret: string;
  callbackUrl: string;
  transactionType: "CustomerPayBillOnline" | "CustomerBuyGoodsOnline";
  partyB: string;
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
      transactionType: "CustomerPayBillOnline",
      partyB: env.daraja.shortcode,
    };
  }

  const c = await getMpesaCredentials(clientId);
  if (!c) {
    throw new Error("This client has no M-Pesa details saved");
  }
  let transactionType: DarajaConfig["transactionType"] = "CustomerPayBillOnline";
  let partyB = c.shortcode;
  if (c.type === "till") {
    if (!c.tillNumber) {
      throw new Error("This client is a Till but has no till number saved");
    }
    transactionType = "CustomerBuyGoodsOnline";
    partyB = c.tillNumber;
  }
  if (!env.daraja.callbackUrl) {
    throw new Error("DARAJA_CALLBACK_URL must be set");
  }

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
    transactionType,
    partyB,
  };
}