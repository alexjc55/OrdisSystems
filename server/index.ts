import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes/index";
import { setupVite, serveStatic, log } from "./vite";
import { seedDatabase } from "./seed";
import { getDB } from "./db";
import { metaInjectionMiddleware } from "./meta-injection-middleware";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Ensure database is initialized before starting the server
  try {
    await getDB();
    console.log("✅ Database connection verified");
  } catch (error) {
    console.error("❌ Failed to connect to database. Server will not start.", error);
    process.exit(1);
  }

  // Seed database with initial data
  try {
    await seedDatabase();
  } catch (error) {
    console.log("Database already seeded or error occurred:", error);
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
    // Note: SEO bot middleware is disabled in development to avoid conflicts with Vite
    // It will be enabled on VPS in production mode
  } else {
    // PRODUCTION MODE: Enable SEO bot middleware BEFORE static serving
    // This allows bots to get HTML with structured data while users get static files
    app.use(metaInjectionMiddleware());
    serveStatic(app);
  }

  // Use PORT environment variable with fallback to 5000 for Replit compatibility
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
