// One-off external-store recovery. Never connects using workspace credentials.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import pg from "pg";

const source = "attached_assets/dump_1794827013716.sql";
const images = "attached_assets/archiveGO7F2.tar_1794827013715.gz";
const destination = "generated-artifacts/edahouse-recovery";
if (!process.argv.includes("--prepare")) throw new Error("Explicit --prepare required");
if (process.argv.includes("--help")) process.exit(0);
fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
const output = fs.mkdtempSync(path.join(path.dirname(destination), ".edahouse-stage-"));
fs.chmodSync(output, 0o700);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ordis-recovery-"));
// Intentionally do not inherit DATABASE_URL, Neon, SMTP, payment or owner secrets.
const env = {
  PATH: process.env.PATH, HOME: process.env.HOME,
  LANG: "C.UTF-8", DOTENV_CONFIG_PATH: "/dev/null",
  PGHOST: temp, PGPORT: "5432", PGUSER: "recovery", PGPASSWORD: "",
  PGDATABASE: "postgres", USE_NEON: "false", NODE_ENV: "test",
};
const log = path.join(temp, "commands.log");
function run(command, args, extra = {}) {
  const result = spawnSync(command, args, { env, encoding: "utf8", maxBuffer: 20 * 1024 * 1024, ...extra });
  if (result.status !== 0) {
    // SQL error details can include private row values. Keep them out of chat.
    fs.appendFileSync(log, `${command}\n${result.stderr || ""}\n`, { mode: 0o600 });
    throw new Error(`${command} failed; private diagnostics: ${log}`);
  }
  return result.stdout;
}
const ident = name => `"${name.replaceAll('"', '""')}"`;
const clients = [];
async function connect(database) {
  const client = new pg.Client({ host: temp, port: 5432, user: "recovery", database });
  await client.connect(); clients.push(client); return client;
}
const sha = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
let started = false;
let verified = false;
try {
  const sql = fs.readFileSync(source, "utf8");
  if (!sql.includes("-- PostgreSQL database dump complete") ||
      !sql.includes("INSERT INTO public.products VALUES") ||
      /^\s*(?:\\(?:!|i(?:r|nclude)?|connect)|CREATE\s+(?:FUNCTION|PROCEDURE|TRIGGER|EXTENSION)|DO\s|COPY.*PROGRAM)/im.test(sql)) {
    throw new Error("Unexpected source format or executable constructs; manual review required");
  }
  // The source was made with --clean, without --if-exists. Its DROP preamble
  // cannot run against an empty database. Retain the SET commands, then the
  // complete schema/data section; never execute those cleanup statements.
  const start = sql.indexOf("CREATE SCHEMA public;");
  if (start < 0) throw new Error("Unexpected clean-dump preamble");
  const header = sql.slice(0, start).split("\n").filter(line => /^(SET |SELECT pg_catalog\.set_config|\\restrict )/.test(line)).join("\n");
  const portable = (header + "\n" + sql.slice(start).replace("CREATE SCHEMA public;", "CREATE SCHEMA IF NOT EXISTS public;")).split("\n").filter(line =>
    !/^ALTER .* OWNER TO /.test(line) && !/^(GRANT|REVOKE) /.test(line)).join("\n");
  const portablePath = path.join(temp, "original.sql");
  fs.writeFileSync(portablePath, portable, { mode: 0o600 });
  run("initdb", ["-D", `${temp}/data`, "-A", "trust", "-U", "recovery", "--no-locale", "--encoding=UTF8"]);
  run("pg_ctl", ["-D", `${temp}/data`, "-l", `${temp}/postgres.log`, "-o", `-h '' -k ${temp}`, "-w", "start"]);
  started = true;
  for (const name of ["original", "restored", "canonical", "roundtrip"]) run("createdb", [name]);
  for (const name of ["original", "restored"]) {
    run("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", name, "-1", "-f", portablePath]);
  }
  const schema = run("./node_modules/.bin/drizzle-kit", ["export", "--dialect=postgresql", "--schema=./shared/schema.ts"]);
  const canonicalFile = `${temp}/canonical.sql`;
  fs.writeFileSync(canonicalFile, schema);
  run("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", "canonical", "-1", "-f", canonicalFile]);
  const original = await connect("original"), restored = await connect("restored"), canonical = await connect("canonical");
  const tableQuery = "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename";
  const existingTables = new Set((await restored.query(tableQuery)).rows.map(r => r.tablename));
  const columnQuery = `SELECT c.relname AS tab, a.attname AS col, format_type(a.atttypid,a.atttypmod) AS type,
    a.attnotnull AS required, pg_get_expr(d.adbin,d.adrelid) AS def
    FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
    WHERE n.nspname='public' AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname,a.attnum`;
  const wantedColumns = (await canonical.query(columnQuery)).rows;
  const oldColumns = (await restored.query(columnQuery)).rows;
  const oldByKey = new Map(oldColumns.map(c => [`${c.tab}.${c.col}`, c]));
  const additions = [];
  const statements = schema.split(/;\s*(?:\n|$)/).map(s => s.trim()).filter(Boolean);
  for (const statement of statements) {
    const match = /^CREATE TABLE "([^"]+)"/.exec(statement);
    if (match && !existingTables.has(match[1])) additions.push(`${statement};`);
    else if (!match && !/^(ALTER TABLE|CREATE (?:UNIQUE )?INDEX)/.test(statement)) {
      throw new Error("Unexpected canonical DDL");
    }
  }
  let addedColumns = 0;
  for (const column of wantedColumns) {
    if (!existingTables.has(column.tab)) continue;
    const old = oldByKey.get(`${column.tab}.${column.col}`);
    if (!old) {
      additions.push(`ALTER TABLE ${ident(column.tab)} ADD COLUMN ${ident(column.col)} ${column.type}` +
        (column.def ? ` DEFAULT ${column.def}` : "") + (column.required ? " NOT NULL" : "") + ";");
      addedColumns++;
    } else if (old.type !== column.type) {
      // Widen text storage only. Never reinterpret or narrow historical values.
      const oldLength = /^character varying\((\d+)\)$/.exec(old.type);
      const newLength = /^character varying\((\d+)\)$/.exec(column.type);
      const textual = t => /^(text|character varying(?:\(\d+\))?)$/.test(t);
      if (textual(old.type) && textual(column.type)) {
        if ((oldLength && newLength && +newLength[1] > +oldLength[1]) ||
            (oldLength && !newLength)) {
          additions.push(`ALTER TABLE ${ident(column.tab)} ALTER COLUMN ${ident(column.col)} TYPE ${column.type};`);
        }
      } else throw new Error(`Type requires explicit review: ${column.tab}.${column.col}`);
    }
  }
  const constraintQuery = `SELECT c.relname AS tab,k.conname AS name,pg_get_constraintdef(k.oid) AS def
    FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'`;
  const oldConstraints = (await restored.query(constraintQuery)).rows;
  for (const statement of statements.filter(s => s.startsWith("ALTER TABLE"))) {
    const match = /^ALTER TABLE "([^"]+)" ADD CONSTRAINT "([^"]+)"/.exec(statement);
    if (!match) throw new Error("Unexpected constraint DDL");
    const desired = (await canonical.query(constraintQuery)).rows.find(c => c.tab === match[1] && c.name === match[2]);
    if (!desired) throw new Error("Missing canonical constraint");
    if (oldConstraints.some(c => c.tab === desired.tab && c.def === desired.def)) continue;
    if (oldConstraints.some(c => c.tab === desired.tab && c.name === desired.name)) throw new Error("Constraint name collision");
    additions.push(`${statement};`);
  }
  const indexes = new Set((await restored.query("SELECT indexname FROM pg_indexes WHERE schemaname='public'")).rows.map(r => r.indexname));
  for (const statement of statements.filter(s => /^CREATE (?:UNIQUE )?INDEX/.test(s))) {
    const match = /^CREATE (?:UNIQUE )?INDEX "([^"]+)"/.exec(statement);
    if (!match) throw new Error("Unexpected index DDL");
    if (!indexes.has(match[1])) additions.push(`${statement};`);
  }
  const upgrade = additions.join("\n\n");
  await restored.query("BEGIN");
  await restored.query(upgrade);
  await restored.query("COMMIT");
  // Include non-Drizzle checks/indexes required by the durable mail queue.
  const queueMigration = fs.readFileSync("migrations/0008_payment_email_outbox.sql", "utf8");
  await restored.query(queueMigration);
  // CREATE TABLE IF NOT EXISTS cannot add these checks to a table that the
  // canonical schema already created. Preserve the standalone migration rules.
  const queueChecks = `ALTER TABLE payment_email_outbox
    ADD CONSTRAINT payment_email_outbox_audience_check CHECK (audience::text = ANY(ARRAY['admin'::text,'guest'::text])),
    ADD CONSTRAINT payment_email_outbox_status_check CHECK (status::text = ANY(ARRAY['pending'::text,'sent'::text,'failed'::text]));`;
  await restored.query(queueChecks);
  const beforeData = {};
  for (const table of existingTables) {
    const cols = oldColumns.filter(c => c.tab === table).map(c => ident(c.col)).join(",");
    const select = `SELECT ${cols} FROM ${ident(table)}`;
    const normalize = rows => rows.map(row => JSON.stringify(row)).sort();
    const before = normalize((await original.query(select)).rows);
    const after = normalize((await restored.query(select)).rows);
    if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error(`Historical data changed in ${table}`);
    beforeData[table] = before.length;
  }
  const actualColumns = new Map((await restored.query(columnQuery)).rows.map(c => [`${c.tab}.${c.col}`, c]));
  for (const col of wantedColumns) {
    if (!actualColumns.has(`${col.tab}.${col.col}`)) throw new Error("Missing column after upgrade");
  }
  const empty = await restored.query("SELECT (SELECT count(*)::int FROM payment_email_outbox) AS emails,(SELECT count(*)::int FROM pending_payments) AS payments");
  if (empty.rows[0].emails || empty.rows[0].payments) throw new Error("Recovery must not replay historical mail/payments");
  // Exercise every current Drizzle column, including old tables.
  for (const tab of new Set(wantedColumns.map(c => c.tab))) {
    const cols = wantedColumns.filter(c => c.tab === tab).map(c => ident(c.col)).join(",");
    await restored.query(`SELECT ${cols} FROM ${ident(tab)} LIMIT 1`);
  }
  // Exercise a new linked order, line and queue insertion, then roll it all back.
  await restored.query("BEGIN");
  const inserted = await restored.query(`INSERT INTO orders(status,total_amount,payment_method,guest_name)
    VALUES('pending',0,'cash','Recovery verification') RETURNING id`);
  const orderId = inserted.rows[0].id;
  await restored.query(`INSERT INTO order_items(order_id,product_id,quantity,price_per_kg,total_price)
    SELECT $1,id,1,price,price FROM products ORDER BY id LIMIT 1`, [orderId]);
  await restored.query(`INSERT INTO payment_email_outbox(order_id,audience,recipient,checkout_snapshot)
    VALUES($1,'guest','recovery@example.invalid','{}'::jsonb)`, [orderId]);
  await restored.query("ROLLBACK");
  // Restore sequence values changed by the rollback-only insert.
  for (const table of ["orders", "order_items", "payment_email_outbox"]) {
    await restored.query(`SELECT setval(pg_get_serial_sequence($1,'id'),COALESCE((SELECT max(id) FROM ${ident(table)}),1),EXISTS(SELECT 1 FROM ${ident(table)}))`, [table]);
  }
  const dumpFile = path.join(output, "edahouse-restored.sql");
  run("pg_dump", ["--no-owner", "--no-acl", "--format=p", "-d", "restored", "-f", dumpFile]);
  fs.chmodSync(dumpFile, 0o600);
  run("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", "roundtrip", "-1", "-f", dumpFile]);
  const roundtrip = await connect("roundtrip");
  const dumpAgain = path.join(temp, "again.sql");
  run("pg_dump", ["--no-owner", "--no-acl", "--format=p", "-d", "roundtrip", "-f", dumpAgain]);
  const stable = file => fs.readFileSync(file, "utf8").split("\n").filter(l => !/^\\(?:un)?restrict /.test(l)).join("\n");
  if (stable(dumpFile) !== stable(dumpAgain)) throw new Error("Restore/dump roundtrip differs");
  const mediaList = run("tar", ["-tzf", images]).split("\n").filter(Boolean);
  if (mediaList.some(p => p.startsWith("/") || p.split("/").includes(".."))) throw new Error("Unsafe archive paths");
  const media = new Set(mediaList.map(p => p.replace(/^\.\//, "")));
  const refs = [...new Set(sql.match(/\/uploads\/[^\s"'<>\\,\]}]+/g) || [])];
  if (refs.some(p => !media.has(p.slice(1)))) throw new Error("Missing image reference");
  fs.writeFileSync(path.join(output, "schema-upgrade.sql"), upgrade + "\n" + queueMigration + "\n" + queueChecks, { mode: 0o600 });
  const report = {
    sourceSha256: sha(source), imagesSha256: sha(images), restoredSha256: sha(dumpFile),
    counts: beforeData, addedTables: [...new Set(wantedColumns.map(c => c.tab))].filter(t => !existingTables.has(t)).length,
    addedColumns, mediaReferences: refs.length, allMediaReferencesFound: true,
    originalDataUnchanged: true, fullRoundtripPassed: true,
    allCurrentColumnsReadable: true, rollbackOnlyOrderLineAndQueuePassed: true,
    noHistoricalEmailsOrPayments: true,
    originalAccountPasswordsAndRolesUnchanged: true,
    applicationCommit: run("git", ["rev-parse", "HEAD"]).trim(),
  };
  fs.writeFileSync(path.join(output, "verification.json"), JSON.stringify(report, null, 2), { mode: 0o600 });
  if (fs.existsSync(path.join(destination, "storefront.jpg"))) {
    fs.copyFileSync(path.join(destination, "storefront.jpg"), path.join(output, "storefront.jpg"));
  }
  // Publish only after all checks succeeded; a failed run leaves the previous
  // verified recovery directory untouched.
  fs.rmSync(destination, { recursive: true, force: true });
  fs.renameSync(output, destination);
  verified = true;
  console.log(JSON.stringify(report));
} finally {
  for (const client of clients) await client.end().catch(() => {});
  if (started) spawnSync("pg_ctl", ["-D", `${temp}/data`, "-m", "immediate", "-w", "stop"], { env, stdio: "ignore" });
  // Keep private diagnostics on failure; successful scratch data can be removed.
  if (verified) fs.rmSync(temp, { recursive: true, force: true });
  else console.error(`Private recovery diagnostics retained in ${temp}`);
}
