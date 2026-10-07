import type { Express, RequestHandler } from "express";
import rateLimit from "express-rate-limit";

const blocked: RequestHandler = (req, res) => {
  // Do not log credentials, request bodies, or session cookies.
  console.warn(JSON.stringify({
    event: "auth_rate_limit",
    time: new Date().toISOString(),
    path: req.path,
    ip: req.ip,
  }));
  res.status(429).json({
    message: "Too many attempts. Please try again later.",
    code: "AUTH_RATE_LIMITED",
  });
};

export function mountAuthRateLimits(app: Express) {
  // Count failed attempts too, before password hashing or any database writes.
  // Default IP keys group IPv6 addresses by subnet to prevent address rotation.
  app.post("/api/register", rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: blocked,
  }));
  app.post("/api/login", rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: blocked,
  }));
}
