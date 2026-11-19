import axios from "axios";
import { env } from "../config/env";

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

export async function getAccessToken(): Promise<string> {
  // Reuse the token if it is still valid (with a 60 second safety margin)
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const credentials = Buffer.from(
    `${env.daraja.consumerKey}:${env.daraja.consumerSecret}`
  ).toString("base64");

  const response = await axios.get(
    `${env.daraja.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: { Authorization: `Basic ${credentials}` },
      timeout: 15_000,
    }
  );

  cachedToken = response.data.access_token;
  tokenExpiresAt = Date.now() + Number(response.data.expires_in) * 1000;

  return cachedToken as string;
}