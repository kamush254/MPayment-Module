# M-Pesa Payment Service

An Express, TypeScript, and PostgreSQL service for starting and tracking M-Pesa Daraja STK Push payments.

## Requirements

- Node.js 20 or newer
- npm
- PostgreSQL
- A Safaricom Daraja sandbox account
- Optional: Cloudflare Tunnel for receiving public Safaricom callbacks

## 1. Install the project

Open PowerShell in the project directory:

```powershell
cd C:\Users\user\mpesa
npm install
```

## 2. Configure PostgreSQL

Create a PostgreSQL database:

```powershell
psql -U postgres
```

```sql
CREATE DATABASE mpesa_payments;
\q
```

If your PostgreSQL username, password, host, or port is different, update `DATABASE_URL` in `.env`.

## 3. Create `.env`

Create `.env` in the project root. A typical configuration is:

```dotenv
PORT=3000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/mpesa_payments

DARAJA_ENV=sandbox
DARAJA_CONSUMER_KEY=YOUR_CONSUMER_KEY
DARAJA_CONSUMER_SECRET=YOUR_CONSUMER_SECRET
DARAJA_SHORTCODE=174379
DARAJA_PASSKEY=YOUR_PASSKEY
DARAJA_CALLBACK_URL=https://YOUR-TUNNEL-DOMAIN/callbacks/stk/YOUR_CALLBACK_TOKEN

CALLBACK_TOKEN=YOUR_CALLBACK_TOKEN
WEBHOOK_SECRET=YOUR_DEFAULT_WEBHOOK_SECRET

CALLBACK_IP_MODE=log
CALLBACK_ALLOWED_IPS=196.201.214.200,196.201.214.206
TRUST_PROXY_HOPS=1
```

Environment values:

- `DARAJA_ENV`: use `sandbox` for testing or `production` for live Daraja.
- `DARAJA_CALLBACK_URL`: public HTTPS URL for Safaricom callbacks.
- `CALLBACK_TOKEN`: secret token in the callback URL.
- `WEBHOOK_SECRET`: fallback secret used for older payments.
- `CALLBACK_IP_MODE`: `off`, `log`, or `enforce`.
- `CALLBACK_ALLOWED_IPS`: comma-separated IP addresses permitted in `enforce` mode.
- `TRUST_PROXY_HOPS`: number of trusted reverse proxies.

Do not commit `.env` or share API keys, webhook secrets, Daraja credentials, or database passwords.

## 4. Apply the database schema

```powershell
npm run db:migrate
```

This creates or updates the required tables and columns.

## 5. Start the server

For development with automatic restarts:

```powershell
npm run dev
```

The server starts at `http://localhost:3000`.

Check it:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/health"
```

It should return:

```text
status
------
ok
```

Stop the server with `Ctrl+C`.

## 6. Create an API client

Create a client and receive a one-time API key and webhook secret:

```powershell
npm run client:create -- "Test Client"
```

Save the generated values securely, then store them in PowerShell:

```powershell
$key = "mpk_YOUR_API_KEY"
$secret = "whsec_YOUR_WEBHOOK_SECRET"
```

The API key identifies the client. The webhook secret signs outgoing webhooks for that client.

Use the printed client ID to save that client's Daraja credentials:

```powershell
# Replace 123 with the ID printed by client:create
npm run client:mpesa -- 123
```

Using the ID avoids ambiguity when multiple clients have the same name.

## 7. Start a public callback tunnel

Open a second terminal:

```powershell
cloudflared tunnel --url http://localhost:3000
```

Copy the generated `https://...trycloudflare.com` URL and update `.env`:

```dotenv
DARAJA_CALLBACK_URL=https://YOUR-TUNNEL-DOMAIN/callbacks/stk/YOUR_CALLBACK_TOKEN
```

Restart `npm run dev` after changing `.env`.

Quick tunnels are temporary and change whenever the tunnel restarts.

Verify the public endpoint:

```powershell
Invoke-RestMethod -Uri "https://YOUR-TUNNEL-DOMAIN/health"
```

## 8. Create a payment

Set the payment JSON and send it:

```powershell
$body = @{
    amount = 1
    phone = "0708374149"
    accountReference = "ORDER001"
    description = "Test"
    idempotencyKey = "order-001"
} | ConvertTo-Json

$payment = Invoke-RestMethod `
    -Method Post `
    -Uri "http://localhost:3000/payments" `
    -Headers @{ "x-api-key" = $key } `
    -ContentType "application/json" `
    -Body $body

$payment
```

The STK Push prompt should appear on the test phone. Safaricom callbacks update the payment to `SUCCESS`, `CANCELLED`, or `TIMEOUT`.

## 9. Check and reconcile a payment

Use the payment ID returned in step 8:

```powershell
$paymentId = "YOUR_PAYMENT_UUID"

Invoke-RestMethod `
    -Uri "http://localhost:3000/payments/$paymentId" `
    -Headers @{ "x-api-key" = $key }
```

Manually query Safaricom:

```powershell
Invoke-RestMethod `
    -Method Post `
    -Uri "http://localhost:3000/payments/$paymentId/reconcile" `
    -Headers @{ "x-api-key" = $key }
```

The reconciliation job also checks stale pending payments automatically. It runs once per minute, limits a run to 10 payments, and spaces queries by 2.5 seconds.

## 10. Verify a webhook signature

Save the exact raw webhook request body to `body.txt`, preserving whitespace and JSON formatting.

Verify with the client webhook secret:

```powershell
$env:VERIFY_SECRET = $secret
npm run webhook:verify -- body.txt "YOUR_64_CHARACTER_SIGNATURE"
$env:VERIFY_SECRET = $null
```

The matching result is `Signature VALID`.

Remove the temporary file:

```powershell
Remove-Item -LiteralPath ".\body.txt"
```

## 11. Run tests and type checking

```powershell
npm test
npx tsc --noEmit
```

Both commands should complete successfully.

## 12. Build and run production output

Build the TypeScript project:

```powershell
npm run build
```

Run the compiled server:

```powershell
npm start
```

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/payments` | Start a payment |
| GET | `/payments/:id` | Check payment status |
| POST | `/payments/:id/reconcile` | Ask Safaricom for the latest status |
| POST | `/callbacks/stk/:token` | Receive an STK callback |

Protected `/payments` endpoints require:

```text
x-api-key: mpk_YOUR_API_KEY
```

## Payment rules

- `amount` must be a positive whole number.
- `phone` must be a valid Kenyan phone number.
- `accountReference` is limited to 12 characters.
- `description` is limited to 13 characters.
- `idempotencyKey` is required and scoped separately for each API client.
- A PENDING payment can be reconciled until its 30-minute cutoff.
- A payment still PENDING after 30 minutes becomes `UNCONFIRMED`.
- Finalized payments are not finalized again.
- Callback IP filtering is controlled by `CALLBACK_IP_MODE`.

## Troubleshooting

### Missing API key

Create a client and send its key in the `x-api-key` header.

### Invalid API key

The key must exactly match the one returned once by `npm run client:create`. Generate a new client if the old key was lost or exposed.

### Database connection errors

Verify that PostgreSQL is running and that `DATABASE_URL` matches the database credentials.

### Callback URL or port does not work

Confirm the server is listening on port 3000 and that the Cloudflare tunnel is still running. Restart `npm run dev` after every `.env` change.

### TypeScript build errors

Run:

```powershell
npx tsc --noEmit
```
