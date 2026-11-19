import { Request, Response, NextFunction } from "express";
import { hashApiKey } from "../utils/apiKey";
import { isValidKeyHash } from "../db/apiClientRepository";

export async function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const key = req.header("x-api-key");

  if (!key) {
    return res.status(401).json({ error: "Missing API key" });
  }

  try {
    const valid = await isValidKeyHash(hashApiKey(key));
    if (!valid) {
      return res.status(401).json({ error: "Invalid API key" });
    }
    next();
  } catch (err: any) {
    console.error("API key check failed:", err.message);
    return res.status(500).json({ error: "Could not verify API key" });
  }
}