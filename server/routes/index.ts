import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import path from "path";
import { setupAuth } from "../auth";
import rateLimit from "express-rate-limit";

import systemRoutes from "./system.routes";
import authRoutes from "./auth.routes";
import profileRoutes from "./profile.routes";
import catalogRoutes from "./catalog.routes";
import ordersRoutes from "./orders.routes";
import adminUserRoutes from "./admin/users.routes";
import adminOrderRoutes from "./admin/orders.routes";
import adminSettingsRoutes from "./admin/settings.routes";
import adminThemesRoutes from "./admin/themes.routes";
import adminAnalyticsRoutes from "./admin/analytics.routes";
import adminPushRoutes from "./admin/push.routes";
import feedsRoutes from "./integrations/feeds.routes";
import translationsRoutes from "./integrations/translations.routes";
import barcodeRoutes from "./integrations/barcode.routes";

export async function registerRoutes(app: Express): Promise<Server> {
  app.use((req, res, next) => {
    if (req.path.startsWith('/uploads/') || req.path === '/api/favicon') {
      return next();
    }

    if (req.path === '/thanks' || req.path.startsWith('/thanks?')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      res.setHeader('Vary', '*');
      return next();
    }

    if (req.path.startsWith('/api/') || req.path === '/' || req.path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    next();
  });

  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
    maxAge: '1h',
    etag: true,
    lastModified: true
  }));

  app.use('/api', (req, res, next) => {
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    next();
  });

  await setupAuth(app);

  const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { message: "Too many requests" },
    standardHeaders: true,
    legacyHeaders: false
  });

  const forgotPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { message: "Too many requests" },
    standardHeaders: true,
    legacyHeaders: false
  });

  const guestOrderLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: { message: "Too many requests" },
    standardHeaders: true,
    legacyHeaders: false
  });

  app.post('/api/login', loginLimiter);
  app.post('/api/auth/forgot-password', forgotPasswordLimiter);
  app.post('/api/orders/guest', guestOrderLimiter);

  app.use(systemRoutes);
  app.use("/api", authRoutes);
  app.use("/api", profileRoutes);
  app.use("/api", catalogRoutes);
  app.use("/api", ordersRoutes);
  app.use("/api", adminUserRoutes);
  app.use("/api", adminOrderRoutes);
  app.use("/api", adminSettingsRoutes);
  app.use("/api", adminThemesRoutes);
  app.use("/api", adminAnalyticsRoutes);
  app.use("/api", adminPushRoutes);
  app.use("/api", feedsRoutes);
  app.use("/api", translationsRoutes);
  app.use("/api", barcodeRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
