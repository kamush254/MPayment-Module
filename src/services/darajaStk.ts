import axios from "axios";
import { DarajaConfig } from "./darajaConfig";
import { getAccessToken } from "./darajaAuth";
import { buildTimestamp } from "../utils/timestamp";

export interface StkPushInput {
  amount: number;
  phone: string; // must already be normalised: 2547XXXXXXXX
  accountReference: string;
  description: string;
}

export interface StkPushResult {
  merchantRequestId: string;
  checkoutRequestId: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
}

export class StkPushOutcomeUnknownError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StkPushOutcomeUnknownError";
  }
}

export async function initiateStkPush(input: StkPushInput, cfg: DarajaConfig): Promise<StkPushResult> {
  const { shortcode, passkey, callbackUrl } = cfg;
  if (!shortcode || !/^\d+$/.test(shortcode)) {
    throw new Error("DARAJA_SHORTCODE must be set to a valid Daraja business shortcode.");
  }
  if (!passkey) {
    throw new Error("DARAJA_PASSKEY must be set before initiating an STK push.");
  }
  if (!callbackUrl) {
    throw new Error("DARAJA_CALLBACK_URL must be set before initiating an STK push.");
  }

  const token = await getAccessToken(cfg);
  const timestamp = buildTimestamp();

  const password = Buffer.from(
    `${shortcode}${passkey}${timestamp}`
  ).toString("base64");

  const body = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: cfg.transactionType,
    Amount: input.amount,
    PartyA: input.phone,
    PartyB: cfg.partyB,
    PhoneNumber: input.phone,
    CallBackURL: callbackUrl,
    AccountReference: input.accountReference,
    TransactionDesc: input.description,
  };

  let response;
  try {
    response = await axios.post(
      `${cfg.baseUrl}/mpesa/stkpush/v1/processrequest`,
      body,
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 20_000,
        maxRedirects: 0,
      }
    );
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response && err.response.status < 500) {
      const data = err.response.data as { errorMessage?: string; message?: string } | undefined;
      throw new Error(data?.errorMessage ?? data?.message ?? err.message);
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new StkPushOutcomeUnknownError(`STK request outcome is unknown: ${message}`);
  }

  const data = response.data;
  if (!data || typeof data !== "object") {
    throw new StkPushOutcomeUnknownError("Safaricom returned an invalid STK response");
  }
  const responseCode = String(data?.ResponseCode ?? "");
  if (responseCode && responseCode !== "0") {
    throw new Error(data.ResponseDescription ?? "Safaricom rejected the STK request");
  }
  if (
    responseCode !== "0" ||
    typeof data.CheckoutRequestID !== "string" ||
    !data.CheckoutRequestID ||
    typeof data.MerchantRequestID !== "string" ||
    !data.MerchantRequestID
  ) {
    throw new StkPushOutcomeUnknownError(
      "Safaricom response did not include valid checkout request identifiers"
    );
  }

  return {
    merchantRequestId: data.MerchantRequestID,
    checkoutRequestId: data.CheckoutRequestID,
    responseCode: data.ResponseCode,
    responseDescription: data.ResponseDescription,
    customerMessage: data.CustomerMessage,
  };
}