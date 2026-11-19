import axios from "axios";
import { env } from "../config/env";
import { getAccessToken } from "./darajaAuth";
import { buildTimestamp } from "../utils/timestamp";

export interface StkQueryResult {
  resultCode: number | null; // null means Safaricom gave no final result yet
  resultDesc: string;
}

export async function queryStkStatus(checkoutRequestId: string): Promise<StkQueryResult> {
  const token = await getAccessToken();
  const timestamp = buildTimestamp();

  const password = Buffer.from(
    `${env.daraja.shortcode}${env.daraja.passkey}${timestamp}`
  ).toString("base64");

  try {
    const response = await axios.post(
      `${env.daraja.baseUrl}/mpesa/stkpushquery/v1/query`,
      {
        BusinessShortCode: env.daraja.shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 20_000,
      }
    );

    const data = response.data;
    const code = data.ResultCode;

    // If there is no ResultCode, there is no final answer yet
        const desc: string = data.ResultDesc ?? data.ResponseDescription ?? "";

    // No result code, or Safaricom says it is still processing: not final yet
    if (
      code === undefined ||
      code === null ||
      code === "" ||
      /still under processing|being processed/i.test(desc)
    ) {
      return { resultCode: null, resultDesc: desc || "No result yet" };
    }

    return { resultCode: Number(code), resultDesc: desc };

    return { resultCode: Number(code), resultDesc: data.ResultDesc ?? "" };
    } catch (err: any) {
    // Safaricom often answers 500 while the customer is still deciding, sometimes with an empty message
    const body = err.response?.data;
    const message: string = body?.errorMessage ?? err.message;
    const code: string = body?.errorCode ?? "";

    if (/being processed/i.test(message) || code === "500.001.1001") {
      return {
        resultCode: null,
        resultDesc: message || `Safaricom returned ${code} (no result available)`,
      };
    }
    throw err;
  }
}