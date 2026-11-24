import crypto from "crypto";

export function generateApiKey(): string {
  return "mpk_" + crypto.randomBytes(24).toString("hex");
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}
export function generateWebhookSecret(): string {
  return "whsec_" + crypto.randomBytes(32).toString("hex");
}