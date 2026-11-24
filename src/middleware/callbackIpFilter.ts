import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import { isAllowedIp, normalizeIp } from "../utils/ip";

export function callbackIpFilter(req: Request, res: Response, next: NextFunction) {
  if (env.callbackIpMode === "off") return next();

  const ip = normalizeIp(req.ip);
  const allowed = isAllowedIp(req.ip, env.callbackAllowedIps);

  if (allowed) return next();

  if (env.callbackIpMode === "enforce") {
    console.warn(`Callback blocked: IP ${ip} is not on the allow-list`);
    return res.status(404).json({ error: "Not found" });
  }

  // log mode: let it through, but record the IP so we can build the list
  console.warn(`Callback from IP ${ip} (not on allow-list, log mode: allowed)`);
  next();
}