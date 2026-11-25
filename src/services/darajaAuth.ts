import axios from "axios";
import { DarajaConfig } from "./darajaConfig";

// One saved token per owner
const cache = new Map<string, { token: string; expiresAt: number }>();

export async function getAccessToken(cfg: DarajaConfig): Promise<string> {
  const cacheKey = `${cfg.baseUrl}|${cfg.consumerKey}`;
  const saved = cache.get(cacheKey);

  // Reuse the token if it is still valid (with a 60 second safety margin)
  if (saved && Date.now() < saved.expiresAt - 60_000) {
    return saved.token;
  }

  const credentials = Buffer.from(`${cfg.consumerKey}:${cfg.consumerSecret}`).toString("base64");

  const response = await axios.get(
    `${cfg.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: { Authorization: `Basic ${credentials}` },
      timeout: 15_000,
    }
  );

  const token = response.data.access_token as string;
  cache.set(cacheKey, {
    token,
    expiresAt: Date.now() + Number(response.data.expires_in) * 1000,
  });
  return token;
}