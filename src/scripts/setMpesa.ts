import readline from "readline";
import { findClientByName, saveMpesaCredentials } from "../db/apiClientRepository";
import { pool } from "../db/pool";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string) => new Promise<string>((res) => rl.question(q, (a) => res(a.trim())));

async function main() {
  const clientArgument = process.argv.slice(2).join(" ").trim();
  if (!clientArgument) {
    console.error("Usage: npm run client:mpesa -- <client id or \"client name\">");
    process.exit(1);
  }

  let clientId = Number(clientArgument);
  if (!Number.isInteger(clientId)) {
    const client = await findClientByName(clientArgument);
    if (!client) {
      throw new Error(`No active client found with name: ${clientArgument}`);
    }
    clientId = client.id;
  }

  const shortcode = await ask("Shortcode (Paybill or Till number): ");
  const typeAnswer = (await ask("Type (paybill or till): ")).toLowerCase();
  const envAnswer = (await ask("Environment (sandbox or production): ")).toLowerCase();
  const passkey = await ask("Passkey: ");
  const consumerKey = await ask("Consumer key: ");
  const consumerSecret = await ask("Consumer secret: ");
  rl.close();

  if (!/^\d{5,8}$/.test(shortcode)) throw new Error("Shortcode must be 5 to 8 digits");
  if (typeAnswer !== "paybill" && typeAnswer !== "till") throw new Error("Type must be paybill or till");
  if (envAnswer !== "sandbox" && envAnswer !== "production") throw new Error("Environment must be sandbox or production");
  if (!passkey || !consumerKey || !consumerSecret) throw new Error("Nothing can be empty");

  const ok = await saveMpesaCredentials(clientId, {
    shortcode,
    type: typeAnswer,
    env: envAnswer,
    passkey,
    consumerKey,
    consumerSecret,
  });

  console.log(ok ? "Saved. The secrets are stored locked." : "No client found with that id.");
  await pool.end();
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});