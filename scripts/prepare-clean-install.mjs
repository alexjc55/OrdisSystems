// Prepare a data-free schema for an EXTERNAL PostgreSQL installation.
// All validation uses disposable databases; never inherit workspace DB credentials.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import pg from "pg";

if (!process.argv.includes("--prepare")) throw new Error("Explicit --prepare required");
const root = fileURLToPath(new URL("../", import.meta.url));
const destination = path.join(root, "generated-artifacts/ordis-clean-install");
fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
const staging = fs.mkdtempSync(path.join(path.dirname(destination), ".clean-stage-"));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ordis-clean-install-"));
const env = {
  PATH: process.env.PATH, HOME: process.env.HOME, LANG: "C.UTF-8",
  DOTENV_CONFIG_PATH: "/dev/null", NODE_ENV: "production", USE_NEON: "false",
  PGHOST: temp, PGPORT: "5432", PGUSER: "install_test", PGPASSWORD: "",
  SESSION_SECRET: "isolated-install-fixture-not-a-production-session-secret",
  PAYMENT_HYP_ENABLED: "false", PAYMENT_GROW_ENABLED: "false",
  PAYMENT_ALLPAY_ENABLED: "false", PAYMENT_PAYME_ENABLED: "false",
};
const clients = [];
let postgresStarted = false, published = false, child, interrupted = false, releasePreview;
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.once(signal, () => { interrupted = true; releasePreview?.(); });
}
const sha = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
function execute(command, args, database = "postgres", extraEnv = {}, cwd = root) {
  if (interrupted) throw new Error("Interrupted");
  return spawnSync(command, args, {
    cwd, env: { ...env, PGDATABASE: database, ...extraEnv },
    encoding: "utf8", timeout: 120_000, maxBuffer: 10 * 1024 * 1024,
  });
}
function run(command, args, database, extraEnv, cwd) {
  const result = execute(command, args, database, extraEnv, cwd);
  if (result.status !== 0) {
    fs.appendFileSync(path.join(temp, "diagnostics.log"), result.stderr || "", { mode: 0o600 });
    throw new Error(`${command} failed; isolated diagnostics: ${temp}`);
  }
  return result.stdout;
}
async function connect(database) {
  const client = new pg.Client({
    host: temp, port: 5432, user: "install_test", database, connectionTimeoutMillis: 5000,
  });
  await client.connect();
  clients.push(client);
  return client;
}
async function stopApp() {
  if (!child) return;
  const current = child;
  child = undefined;
  if (current.exitCode !== null || current.signalCode !== null) return;
  const closed = new Promise(resolve => current.once("close", resolve));
  current.kill("SIGTERM");
  await Promise.race([closed, delay(3000)]);
  if (current.exitCode === null && current.signalCode === null) {
    current.kill("SIGKILL");
    await closed;
  }
}
async function startApp(database, seed) {
  await stopApp();
  const listener = net.createServer();
  await new Promise((resolve, reject) => {
    listener.once("error", reject);
    listener.listen(process.argv.includes("--preview") && database === "fresh" ? 5018 : 0, "127.0.0.1", resolve);
  });
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  const log = fs.openSync(path.join(temp, `${database}-app.log`), "a", 0o600);
  try {
    child = spawn(process.execPath, [path.join(root, "dist/index.js")], {
      cwd: temp,
      env: { ...env, PGDATABASE: database, PORT: String(port), ...(seed === undefined ? {} : { SEED_DEMO_CATALOG: seed }) },
      stdio: ["ignore", log, log],
    });
  } finally { fs.closeSync(log); }
  const base = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 80 && !interrupted; attempt++) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`Isolated ${database} app exited; diagnostics: ${temp}`);
    }
    try {
      const response = await fetch(`${base}/api/categories`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) { await response.body.cancel(); return { base, port }; }
      await response.body.cancel();
    } catch {}
    await delay(150);
  }
  throw new Error(`Isolated ${database} startup timeout; diagnostics: ${temp}`);
}
try {
  const canonical = run(path.join(root, "node_modules/.bin/drizzle-kit"),
    ["export", "--dialect=postgresql", "--schema=./shared/schema.ts"]);
  const tables = [...canonical.matchAll(/CREATE TABLE "([^"]+)"/g)].map(match => match[1]);
  assert.ok(tables.includes("users") && tables.includes("payment_email_outbox"));
  assert.ok(!tables.includes("session"));
  const guard = `
DO $empty_install$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname <> 'information_schema' AND n.nspname !~ '^pg_'
      AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
  ) THEN
    RAISE EXCEPTION 'Target database is not empty; clean installation refused';
  END IF;
END
$empty_install$;`;
  const extra = `
-- connect-pg-simple uses "session", not the separate legacy "sessions" model.
CREATE TABLE public."session" (
  sid varchar NOT NULL PRIMARY KEY,
  sess json NOT NULL,
  expire timestamp(6) NOT NULL
);
-- The legacy "sessions" table already owns the schema-wide IDX_session_expire name.
CREATE INDEX session_expire_idx ON public."session" (expire);
-- Match the CHECK constraints from the standalone outbox migration.
ALTER TABLE public.payment_email_outbox
  ADD CONSTRAINT payment_email_outbox_audience_check CHECK (audience IN ('admin', 'guest')),
  ADD CONSTRAINT payment_email_outbox_status_check CHECK (status IN ('pending', 'sent', 'failed'));
`;
  const schemaFile = path.join(staging, "ordis-empty.sql");
  fs.writeFileSync(schemaFile,
    "-- Fresh EXTERNAL store only. No business data or credentials.\nBEGIN;\n" +
    "SET LOCAL search_path = public;\n" + guard + "\n" + canonical + "\n" + extra + "\nCOMMIT;\n",
    { mode: 0o600 });
  run("initdb", ["-D", `${temp}/data`, "-A", "trust", "-U", "install_test", "--no-locale", "--encoding=UTF8"]);
  run("pg_ctl", ["-D", `${temp}/data`, "-l", `${temp}/postgres.log`, "-o", `-h '' -k ${temp}`, "-w", "start"]);
  postgresStarted = true;
  for (const database of ["fresh", "legacy_default", "initial_settings"]) {
    run("createdb", [database]);
    run("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-f", schemaFile], database);
  }
  const client = await connect("fresh");
  const actualTables = (await client.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
  )).rows.map(row => row.tablename);
  assert.deepEqual(actualTables, [...tables, "session"].sort());
  const counts = {};
  for (const name of actualTables) {
    const quoted = `"${name.replaceAll('"', '""')}"`;
    counts[name] = Number((await client.query(`SELECT count(*) AS count FROM public.${quoted}`)).rows[0].count);
    assert.equal(counts[name], 0, `${name} must be empty`);
    await client.query(`SELECT * FROM public.${quoted} LIMIT 0`);
  }
  const checks = await client.query(
    "SELECT count(*)::int AS count FROM pg_constraint WHERE conrelid = 'public.payment_email_outbox'::regclass AND contype = 'c'",
  );
  assert.equal(checks.rows[0].count, 2);
  run(process.execPath, ["--import", "tsx", "--test", "tests/admin-initialization.test.ts"],
    "initial_settings", { CLEAN_INSTALL_TESTS: "1" });
  // Synthetic credentials are only for this disposable database.
  const fixtureCredentials = {
    BOOTSTRAP_ADMIN_USERNAME: "install-test-admin",
    BOOTSTRAP_ADMIN_PASSWORD: "Isolated-Test-Admin-482!Only",
  };
  const bootstrapCommand = path.join(root, "node_modules/.bin/tsx");
  const bootstrapArgs = [path.join(root, "scripts/bootstrap-admin.ts")];
  // Run outside the repo so dotenv.config() cannot read a workspace .env.
  run(bootstrapCommand, bootstrapArgs, "fresh", fixtureCredentials, temp);
  assert.notEqual(execute(bootstrapCommand, bootstrapArgs, "fresh", fixtureCredentials, temp).status, 0);
  assert.equal(Number((await client.query("SELECT count(*) AS count FROM users")).rows[0].count), 1);
  assert.notEqual(execute("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-f", schemaFile], "fresh").status, 0);
  assert.equal(Number((await client.query("SELECT count(*) AS count FROM users")).rows[0].count), 1);
  fs.symlinkSync(path.join(root, "dist"), path.join(temp, "dist"), "dir");
  fs.mkdirSync(path.join(temp, "uploads"));
  await startApp("legacy_default", undefined);
  const legacyClient = await connect("legacy_default");
  // Public APIs can hide inactive demo products; prove seeding in the DB itself.
  for (const name of ["products", "categories"]) {
    const count = Number((await legacyClient.query(`SELECT count(*) AS count FROM public."${name}"`)).rows[0].count);
    assert.ok(count > 0, "Default seeding must remain enabled");
  }
  let preview = await startApp("fresh", "false");
  for (const endpoint of ["products", "categories"]) {
    const data = await (await fetch(`${preview.base}/api/${endpoint}`)).json();
    assert.deepEqual(data, [], `${endpoint} must stay empty`);
  }
  const homepage = await fetch(preview.base);
  assert.equal(homepage.status, 200);
  await homepage.body.cancel();
  const login = await fetch(`${preview.base}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-Proto": "https" },
    body: JSON.stringify({ username: fixtureCredentials.BOOTSTRAP_ADMIN_USERNAME, password: fixtureCredentials.BOOTSTRAP_ADMIN_PASSWORD }),
  });
  assert.equal(login.status, 200);
  await login.body.cancel();
  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie, "Login must create a PostgreSQL-backed session");
  const identity = await fetch(`${preview.base}/api/auth/user`, { headers: { Cookie: cookie } });
  assert.equal(identity.status, 200);
  assert.equal((await identity.json()).role, "admin");
  assert.ok(Number((await client.query('SELECT count(*) AS count FROM public."session"')).rows[0].count) > 0);
  assert.equal((await client.query("SELECT count(*)::int AS count FROM store_settings")).rows[0].count, 1);
  const browserResult = run(process.execPath, ["--import", "tsx", "tests/clean-install-admin.browser.ts"],
    "fresh", {
      CLEAN_INSTALL_TESTS: "1", CLEAN_INSTALL_ORIGIN: preview.base, CLEAN_INSTALL_COOKIE: cookie,
      CLEAN_INSTALL_SCREENSHOT: path.join(staging, "admin-settings.jpg"),
    });
  console.log(browserResult.trim());
  const settingsBeforeRestart = (await client.query("SELECT * FROM store_settings")).rows;
  const adminBeforeRestart = (await client.query("SELECT * FROM users")).rows;
  assert.equal(settingsBeforeRestart[0].store_name, "Configured fixture shop");
  // Restart the actual application, not just the browser.
  preview = await startApp("fresh", "false");
  assert.deepEqual((await client.query("SELECT * FROM store_settings")).rows, settingsBeforeRestart);
  assert.deepEqual((await client.query("SELECT * FROM users")).rows, adminBeforeRestart);
  for (const name of ["products", "categories", "orders", "order_items", "payment_email_outbox"]) {
    assert.equal(Number((await client.query(`SELECT count(*) AS count FROM public."${name}"`)).rows[0].count), 0);
  }
  fs.copyFileSync(path.join(root, "docs/dk-clean-install.md"), path.join(staging, "README-RU.md"));
  fs.writeFileSync(path.join(staging, "verification.json"), JSON.stringify({
    tableCount: actualTables.length, initialRows: counts, schemaSha256: sha(schemaFile),
    freshImport: true, nonemptyImportRefused: true, bootstrapAndLoginVerified: true,
    emptyCatalogVerified: true, legacyDemoDefaultVerified: true, workspaceDatabaseUsed: false,
    signedInAdminRendered: true, adminSettingsSavedAndReloaded: true,
    settingsAndAdminPreservedOnRestart: true, atomicSettingsInitializationVerified: true,
    sourceHashes: Object.fromEntries(["shared/schema.ts", "server/index.ts", "server/lib/demo-catalog.ts",
      "server/initial-store-settings.ts", "client/src/pages/admin-dashboard.tsx"]
      .map(file => [file, sha(path.join(root, file))])),
  }, null, 2) + "\n", { mode: 0o600 });
  const files = fs.readdirSync(staging).sort();
  fs.writeFileSync(path.join(staging, "SHA256SUMS"),
    files.map(file => `${sha(path.join(staging, file))}  ${file}\n`).join(""), { mode: 0o600 });
  fs.rmSync(destination, { recursive: true, force: true });
  fs.renameSync(staging, destination);
  published = true;
  console.log(`Verified clean schema: ${actualTables.length} tables, zero initial rows.`);
  console.log("Verified empty catalog, unchanged demo default, first admin, full signed-in dashboard and restart preservation.");
  console.log(`Output: ${path.relative(root, destination)}`);
  if (process.argv.includes("--preview") && !interrupted) {
    console.log(`CLEAN_INSTALL_PREVIEW_PORT=${preview.port}`);
    await new Promise(resolve => { releasePreview = resolve; if (interrupted) resolve(); });
  }
} finally {
  await stopApp();
  await Promise.all(clients.map(client => client.end().catch(() => {})));
  if (postgresStarted) {
    const stopped = spawnSync("pg_ctl", ["-D", `${temp}/data`, "-m", "immediate", "-w", "stop"], { env, stdio: "ignore", timeout: 30_000 });
    if (published && stopped.status === 0) fs.rmSync(temp, { recursive: true, force: true });
  }
  fs.rmSync(staging, { recursive: true, force: true });
}
