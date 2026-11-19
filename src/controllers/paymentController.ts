import axios from "axios";
import { Request, Response } from "express";
import { normalizePhone } from "../utils/phone";
import { createPayment,getPayment,reconcilePayment } from "../services/paymentServices";


export async function initiatePayment(req: Request, res: Response) {
  const { amount, phone, accountReference, description, idempotencyKey } = req.body ?? {};

  // Validate input
  if (!Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({ error: "amount must be a whole number greater than 0" });
  }
  if (typeof phone !== "string") {
    return res.status(400).json({ error: "phone is required" });
  }
  if (typeof accountReference !== "string" || !accountReference || accountReference.length > 12) {
    return res.status(400).json({ error: "accountReference is required (max 12 characters)" });
  }
  if (typeof idempotencyKey !== "string" || !idempotencyKey) {
    return res.status(400).json({ error: "idempotencyKey is required" });
  }
  const desc = typeof description === "string" && description ? description : "Payment";
  if (desc.length > 13) {
    return res.status(400).json({ error: "description must be 13 characters or fewer" });
  }

  let normalizedPhone: string;
  try {
    normalizedPhone = normalizePhone(phone);
  } catch {
    return res.status(400).json({ error: "phone is not a valid Kenyan number" });
  }

  try {
    const { payment, created } = await createPayment({
      idempotencyKey,
      amount,
      phone: normalizedPhone,
      accountReference,
      description: desc,
    });

    return res.status(created ? 201 : 200).json({
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      checkoutRequestId: payment.checkout_request_id,
      duplicate: !created,
    });
  } catch (err: any) {
    console.error("Payment initiation failed:", err.response?.data ?? err.message);
    return res.status(502).json({ error: "Could not initiate payment with M-Pesa" });
  }
}
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getPaymentStatus(req: Request, res: Response) {
  const id = String(req.params.id);

  // PostgreSQL throws an error if given a malformed UUID, so check the shape first
  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ error: "id must be a valid payment id" });
  }

  try {
    const payment = await getPayment(id);

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    return res.status(200).json({
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      accountReference: payment.account_reference,
      mpesaReceipt: payment.mpesa_receipt,
      resultDescription: payment.result_desc,
      createdAt: payment.created_at,
      updatedAt: payment.updated_at,
    });
  } catch (err: any) {
    console.error("Payment lookup failed:", err.message);
    return res.status(500).json({ error: "Could not fetch payment" });
  }
}
export async function reconcilePaymentStatus(req: Request, res: Response) {
  const id = String(req.params.id);

  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ error: "id must be a valid payment id" });
  }

  try {
    const result = await reconcilePayment(id);

    if (!result) {
      return res.status(404).json({ error: "Payment not found" });
    }

    return res.status(200).json({
      id: result.payment.id,
      status: result.payment.status,
      mpesaReceipt: result.payment.mpesa_receipt,
      resultDescription: result.payment.result_desc,
      checkedWithSafaricom: result.checked,
      note: result.note,
    });
  } catch (err: unknown) {
    const details = axios.isAxiosError(err)
      ? err.response?.data ?? err.message
      : err instanceof Error
        ? err.message
        : String(err);
    console.error("Reconcile failed:", details);
    return res.status(502).json({
      error: "Could not query M-Pesa for this payment",
      ...(process.env.NODE_ENV === "production" ? {} : { details }),
    });
  }
}