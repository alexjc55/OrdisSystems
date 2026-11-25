import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { test } from "node:test";
import ts from "typescript";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema";
import { ensureInitialStoreSettings, initialStoreName } from "../server/initial-store-settings";

test("new store name uses only its own configured hostname or the neutral Ordis name", () => {
  assert.equal(initialStoreName({ REPLIT_APP_URL: "https://dk.ordis.co.il" }), "dk.ordis.co.il");
  assert.equal(initialStoreName({ REPLIT_APP_URL: "https://example.test/path?q=ignored" }), "example.test");
  for (const origin of [undefined, "", "invalid", "javascript:alert(1)", "file:///tmp/shop"]) {
    assert.equal(initialStoreName({ REPLIT_APP_URL: origin }), "Ordis");
  }
});

test("all dashboard hooks precede every conditional render return", () => {
  const source = ts.createSourceFile("admin-dashboard.tsx",
    readFileSync("client/src/pages/admin-dashboard.tsx", "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const dashboard = source.statements.find(statement =>
    ts.isFunctionDeclaration(statement) && statement.name?.text === "AdminDashboard");
  assert.ok(dashboard && ts.isFunctionDeclaration(dashboard) && dashboard.body);
  const hooks: number[] = [], returns: number[] = [];
  const visit = (node: ts.Node) => {
    // Child components, event handlers and query callbacks have their own scope.
    if (ts.isFunctionLike(node)) return;
    if (ts.isReturnStatement(node)) returns.push(node.getStart(source));
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const name = ts.isIdentifier(callee) ? callee.text
        : ts.isPropertyAccessExpression(callee) ? callee.name.text : "";
      if (/^use[A-Z]/.test(name)) hooks.push(node.getStart(source));
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(dashboard.body, visit);
  assert.ok(hooks.length > 10 && returns.length > 1);
  assert.ok(Math.max(...hooks) < Math.min(...returns),
    "A loading/error return can skip hooks and crash the next render");
});

// Enabled only by prepare-clean-install.mjs, against its disposable socket DB.
test("settings initialization is atomic, preserves configured stores and never seeds business records",
  { skip: process.env.CLEAN_INSTALL_TESTS !== "1" }, async () => {
    assert.ok(basename(process.env.PGHOST || "").startsWith("ordis-clean-install-"));
    assert.equal(process.env.PGDATABASE, "initial_settings");
    assert.equal(process.env.USE_NEON, "false");
    const pool = new pg.Pool({
      host: process.env.PGHOST, port: 5432, user: "install_test",
      database: "initial_settings", max: 8, connectionTimeoutMillis: 5000,
    });
    try {
      const db = drizzle(pool, { schema });
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM store_settings")).rows[0].n, 0);
      const created = await Promise.all(Array.from({ length: 8 }, () =>
        ensureInitialStoreSettings(db, { REPLIT_APP_URL: "https://new-store.test" })));
      assert.equal(created.filter(Boolean).length, 1);
      const rows = (await pool.query("SELECT * FROM store_settings")).rows;
      assert.equal(rows.length, 1);
      assert.equal(rows[0].store_name, "new-store.test");
      assert.equal(rows[0].auth_page_title, "new-store.test");
      assert.deepEqual(rows[0].payment_methods, []);
      assert.deepEqual(rows[0].payment_provider_config, { active: "none" });
      assert.match(rows[0].feed_token, /^[0-9a-f-]{36}$/);
      await pool.query(`UPDATE store_settings SET store_name = 'Configured store',
        contact_phone = '', smtp_password = 'synthetic-preserve-test',
        payment_provider_config = '{"active":"none","custom":"keep"}'::jsonb`);
      const before = (await pool.query("SELECT * FROM store_settings")).rows;
      assert.equal(await ensureInitialStoreSettings(db, { REPLIT_APP_URL: "https://different.test" }), false);
      assert.deepEqual((await pool.query("SELECT * FROM store_settings")).rows, before,
        "Even intentionally empty fields and stored credentials must stay untouched");
      for (const table of ["users", "products", "categories", "orders", "payment_email_outbox"]) {
        assert.equal((await pool.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n, 0);
      }
    } finally { await pool.end(); }
  });
