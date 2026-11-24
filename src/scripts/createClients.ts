import {
  generateApiKey,
  generateWebhookSecret,
  hashApiKey,
} from "../utils/apiKey";
import { createClient } from "../db/apiClientRepository";
import { pool } from "../db/pool";

async function main() {
  const name = process.argv[2];
  if (!name) {
    console.error('Usage: npm run client:create -- "App Name"');
    process.exit(1);
  }

  const key = generateApiKey();
  const webhookSecret = generateWebhookSecret();
  await createClient(name, hashApiKey(key), webhookSecret);

  console.log(`Client created: ${name}`);
  console.log("API key (shown ONCE, save it now):");
  console.log(key);
  console.log("Webhook secret (shown ONCE, save it now):");
  console.log(webhookSecret);
  await pool.end();
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});