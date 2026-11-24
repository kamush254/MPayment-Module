import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined;
}

const darajaEnv = process.env.DARAJA_ENV === "production" ? "production" : "sandbox";

export const env = {
  port: Number(process.env.PORT) || 3000,
  callbackIpMode: ["off", "enforce"].includes(process.env.CALLBACK_IP_MODE ?? "")
    ? (process.env.CALLBACK_IP_MODE as "off" | "enforce")
    : "log",
  callbackAllowedIps: (process.env.CALLBACK_ALLOWED_IPS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  trustProxyHops: Number(process.env.TRUST_PROXY_HOPS) || 0,
  databaseUrl: required("DATABASE_URL"),
  callbackToken: required("CALLBACK_TOKEN"),
  webhookSecret: required("WEBHOOK_SECRET"),
  daraja: {
    env: darajaEnv,
    baseUrl:
      darajaEnv === "production"
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke",
    consumerKey: required("DARAJA_CONSUMER_KEY"),
    consumerSecret: required("DARAJA_CONSUMER_SECRET"),
    shortcode: optional("DARAJA_SHORTCODE"),
    passkey: optional("DARAJA_PASSKEY"),
    callbackUrl: optional("DARAJA_CALLBACK_URL"),
  },
};

if (env.callbackIpMode === "enforce" && env.callbackAllowedIps.length === 0) {
  throw new Error("CALLBACK_IP_MODE=enforce requires CALLBACK_ALLOWED_IPS");
}