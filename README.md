# M-Pesa Payment Service

A small Express + TypeScript + PostgreSQL service that takes M-Pesa (Daraja) STK Push payments for other apps.

## Setup
1. `npm install`
2. Create a PostgreSQL database and put its URL in `.env` (see `.env.example`)
3. `npm run db:migrate`
4. `npm run dev`

## Endpoints
| Method | Path | Purpose |
|---|---|---|
| POST | /payments | Start a payment: amount, phone, accountReference (max 12), description (max 13), idempotencyKey |
| GET | /payments/:id | Check a payment's status |
| POST | /payments/:id/reconcile | Ask Safaricom for the status of a PENDING payment |
| POST | /callbacks/stk/:token | Safaricom calls this (secret token in the URL) |

## Statuses
PENDING, SUCCESS, FAILED, CANCELLED, TIMEOUT, UNCONFIRMED

## Key rules
- The same idempotencyKey never creates a second payment.
- A payment can only be finalised once.
- A response of "still processing" from Safaricom never finalises a payment.
-- A payment still PENDING after 30 minutes becomes UNCONFIRMED; a late callback can still finalise it.
-- A SUCCESS callback is only accepted if its Amount equals the payment's amount.

## API authentication
Create an API client with `npm run client:create -- "App Name"` and save the generated key securely. In PowerShell, enter the key when prompted, then use it in the same session:

```powershell
$key = Read-Host -Prompt "Enter API key"
$paymentId = Read-Host -Prompt "Enter the payment UUID returned by POST /payments"
Invoke-RestMethod -Uri "http://localhost:3000/payments/$paymentId" -Headers @{ "x-api-key" = $key }
```