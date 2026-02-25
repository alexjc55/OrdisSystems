import { Router } from "express";
import { storage } from "../storage";
import { getDB } from "../db";
import { sql } from "drizzle-orm";
import { generateAppHash } from "../utils/app-hash";
import path from "path";
import fs from "fs";

const router = Router();

let testHash: string | null = null;
let testStartTime: number | null = null;

router.get("/api/health", async (req, res) => {
  try {
    const db = await getDB();
    await db.execute(sql`SELECT 1`);
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const uploadsExists = fs.existsSync(uploadsDir);
    const appHash = await generateAppHash();
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      database: "connected",
      uploads: uploadsExists ? "available" : "missing",
      uptime: process.uptime(),
      appHash,
      buildTime: process.env.BUILD_TIME || new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

router.get("/api/version", async (req, res) => {
  try {
    let appHash = await generateAppHash();
    const buildTime = process.env.BUILD_TIME || new Date().toISOString();

    if (req.query.test === 'notification') {
      testHash = 'test_' + Date.now().toString().slice(-6);
      testStartTime = Date.now();
      appHash = testHash;
    } else if (testHash && testStartTime && (Date.now() - testStartTime) < 300000) {
      appHash = testHash;
    } else if (testHash && testStartTime && (Date.now() - testStartTime) >= 300000) {
      testHash = null;
      testStartTime = null;
    }

    res.json({
      version: process.env.npm_package_version || "1.0.0",
      appHash,
      buildTime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Version check failed:', error);
    res.status(500).json({ error: "Failed to get version info", timestamp: new Date().toISOString() });
  }
});

router.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /auth
Disallow: /checkout
Disallow: /profile

Sitemap: ${req.protocol}://${req.get('host')}/sitemap.xml`);
});

router.get('/sitemap.xml', async (req, res) => {
  try {
    const categories = await storage.getCategories();
    const products = await storage.getProducts();
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const languages = ['ru', 'en', 'he', 'ar'];
    const now = new Date().toISOString();

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">`;

    sitemap += `
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>`;
    languages.forEach(lang => {
      const langPath = lang === 'ru' ? '' : `/${lang}`;
      sitemap += `
    <xhtml:link rel="alternate" hreflang="${lang}" href="${baseUrl}${langPath}/" />`;
    });
    sitemap += `
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/" />
  </url>`;

    categories.forEach(category => {
      const categoryLastMod = category.updatedAt
        ? new Date(category.updatedAt).toISOString()
        : (category.createdAt ? new Date(category.createdAt).toISOString() : now);
      sitemap += `
  <url>
    <loc>${baseUrl}/category/${category.id}</loc>
    <lastmod>${categoryLastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>`;
      languages.forEach(lang => {
        const langPath = lang === 'ru' ? '' : `/${lang}`;
        sitemap += `
    <xhtml:link rel="alternate" hreflang="${lang}" href="${baseUrl}${langPath}/category/${category.id}" />`;
      });
      sitemap += `
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/category/${category.id}" />
  </url>`;
    });

    sitemap += `
  <url>
    <loc>${baseUrl}/all-products</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>`;
    languages.forEach(lang => {
      const langPath = lang === 'ru' ? '' : `/${lang}`;
      sitemap += `
    <xhtml:link rel="alternate" hreflang="${lang}" href="${baseUrl}${langPath}/all-products" />`;
    });
    sitemap += `
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/all-products" />
  </url>`;

    sitemap += `
</urlset>`;

    res.type('application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

router.get('/clear-sw', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Очистка кеша...</title>
  <style>
    body { font-family: sans-serif; text-align: center; padding: 40px; background: #fff; }
    h2 { color: #333; }
    p { color: #666; }
    .spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top-color: #f97316; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 20px auto; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .done { color: #22c55e; font-size: 2rem; }
  </style>
</head>
<body>
  <div class="spinner" id="spinner"></div>
  <h2 id="status">Очищаем кеш...</h2>
  <p id="msg">Подождите несколько секунд</p>
  <script>
    async function clearAll() {
      try {
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(r => r.unregister()));
        }
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
        sessionStorage.clear();
        const keep = ['i18nextLng', 'language'];
        const saved = {};
        keep.forEach(k => { if (localStorage.getItem(k)) saved[k] = localStorage.getItem(k); });
        localStorage.clear();
        keep.forEach(k => { if (saved[k]) localStorage.setItem(k, saved[k]); });
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('spinner').textContent = '';
        document.getElementById('status').innerHTML = '<span class="done">✓</span> Кеш очищен!';
        document.getElementById('msg').textContent = 'Перенаправляем на главную...';
        setTimeout(() => { window.location.replace('/'); }, 1500);
      } catch (e) {
        document.getElementById('status').textContent = 'Готово. Перенаправляем...';
        setTimeout(() => { window.location.replace('/'); }, 1000);
      }
    }
    clearAll();
  </script>
</body>
</html>`);
});

export default router;
