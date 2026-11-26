import axios from "axios";
import { DarajaConfig } from "./darajaConfig";
import { getAccessToken } from "./darajaAuth";
import { buildTimestamp } from "../utils/timestamp";

export interface StkQueryResult {
  resultCode: number | null; // null means Safaricom gave no final result yet
  resultDesc: string;
}

export async function queryStkStatus(
  checkoutRequestId: string,
  cfg: DarajaConfig
): Promise<StkQueryResult> {
  const token = await getAccessToken(cfg);
  const timestamp = buildTimestamp();

  const password = Buffer.from(
    `${cfg.shortcode}${cfg.passkey}${timestamp}`
  ).toString("base64");

  try {
    const response = await axios.post(
      `${cfg.baseUrl}/mpesa/stkpushquery/v1/query`,
      {
        BusinessShortCode: cfg.shortcode,
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
    const code = data?.ResultCode;

    // If there is no ResultCode, there is no final answer yet
    const desc: string = data?.ResultDesc ?? data?.ResponseDescription ?? "";

    // No result code, or Safaricom says it is still processing: not final yet
    if (
      code === undefined ||
      code === null ||
      code === "" ||
      /still under processing|being processed/i.test(desc)
    ) {
      return { resultCode: null, resultDesc: desc || "No result yet" };
    }

    const resultCode =
      typeof code === "number"
        ? code
        : typeof code === "string" && /^\d+$/.test(code)
          ? Number(code)
          : NaN;
    if (!Number.isSafeInteger(resultCode)) {
      throw new Error("Safaricom returned an invalid STK query result code");
    }

    return { resultCode, resultDesc: desc };
  } catch (err: any) {
    // Safaricom often answers 500 while the customer is still deciding, sometimes with an empty message
    const body = err.response?.data;
    const message: string = body?.errorMessage ?? err.message;
    const code: string = body?.errorCode ?? "";
    const faultCode: string = body?.fault?.detail?.errorcode ?? "";
    if (faultCode === "policies.ratelimit.SpikeArrestViolation") {
      return { resultCode: null, resultDesc: "Rate limited by Safaricom, will retry later" };
    }

    if (/being processed/i.test(message) || code === "500.001.1001") {
      return {
        resultCode: null,
        resultDesc: message || `Safaricom returned ${code} (no result available)`,
      };
    }
    throw err;
  }
}