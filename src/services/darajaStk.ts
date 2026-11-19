import axios from "axios";
import { env } from "../config/env";
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

export async function initiateStkPush(input: StkPushInput): Promise<StkPushResult> {
  const { shortcode, passkey, callbackUrl } = env.daraja;
  if (!shortcode || !/^\d+$/.test(shortcode)) {
    throw new Error("DARAJA_SHORTCODE must be set to a valid Daraja business shortcode.");
  }
  if (!passkey) {
    throw new Error("DARAJA_PASSKEY must be set before initiating an STK push.");
  }
  if (!callbackUrl) {
    throw new Error("DARAJA_CALLBACK_URL must be set before initiating an STK push.");
  }

  const token = await getAccessToken();
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
    `${env.daraja.baseUrl}/mpesa/stkpush/v1/processrequest`,
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