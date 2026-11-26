import { Request, Response } from "express";
import { env } from "../config/env";
import { processStkCallback } from "../services/callbackService";

export async function handleStkCallback(req: Request, res: Response) {
  // Wrong or missing token: pretend the route does not exist
  if (req.params.token !== env.callbackToken) {
    return res.status(404).json({ error: "Not found" });
  }

  try {
    await processStkCallback(req.body);
  } catch (err: any) {
    console.error("Callback processing failed:", err.message);
    return res.status(500).json({ ResultCode: 1, ResultDesc: "Callback processing failed" });
  }

  // Safaricom just needs to know we received it
  return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
}