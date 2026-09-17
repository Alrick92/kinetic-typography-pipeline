import type { NextFunction, Request, Response } from "express";

/**
 * Optional shared-secret auth. If API_KEY is unset, the API is open — fine for a
 * container that's only reachable on a private network. Set API_KEY once this is
 * exposed publicly (e.g. behind NGINX Proxy Manager) and clients must send it back
 * via the X-API-Key header.
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.API_KEY;
  if (!expected) return next();
  if (req.path === "/health") return next();

  const provided = req.header("X-API-Key");
  if (provided !== expected) {
    return res.status(401).json({ error: "Missing or invalid X-API-Key header" });
  }
  next();
}
