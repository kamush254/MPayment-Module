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
    TransactionType: "CustomerPayBillOnline",
    Amount: input.amount,
    PartyA: input.phone,
    PartyB: shortcode,
    PhoneNumber: input.phone,
    CallBackURL: callbackUrl,
    AccountReference: input.accountReference,
    TransactionDesc: input.description,
  };

  const response = await axios.post(
    `${cfg.baseUrl}/mpesa/stkpush/v1/processrequest`,
    body,
    {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 20_000,
    }
  );

  const data = response.data;

  return {
    merchantRequestId: data.MerchantRequestID,
    checkoutRequestId: data.CheckoutRequestID,
    responseCode: data.ResponseCode,
    responseDescription: data.ResponseDescription,
    customerMessage: data.CustomerMessage,
  };
}