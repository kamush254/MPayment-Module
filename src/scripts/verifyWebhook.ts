import crypto from "crypto";
import fs from "fs";
import path from "path";
import { env } from "../config/env";

// Usage: npm run webhook:verify -- <path to body file> <x-signature>
const [bodyPath, signature] = process.argv.slice(2);

if (!bodyPath || !signature) {
  console.error("Usage: npm run webhook:verify -- <body file> <x-signature>");
  process.exit(1);
}

const resolvedBodyPath = path.resolve(bodyPath);
if (!fs.existsSync(resolvedBodyPath)) {
  console.error(`Webhook body file not found: ${resolvedBodyPath}`);
  console.error("Save the exact request body to this file or pass the path to an existing file.");
  process.exit(1);
}

const body = fs.readFileSync(resolvedBodyPath, "utf8");
const secret = process.env.VERIFY_SECRET ?? env.webhookSecret;
const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");

const a = Buffer.from(expected);
const b = Buffer.from(signature);
const ok = a.length === b.length && crypto.timingSafeEqual(a, b);

console.log(ok ? "Signature VALID" : "Signature INVALID");