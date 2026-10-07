import assert from "node:assert/strict";
import { after, test } from "node:test";
import { promisify } from "node:util";
import { scrypt } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { bootstrapAdmin, BootstrapError, validateBootstrapCredentials } from "../server/bootstrap-admin";

assert.equal(process.env.BOOTSTRAP_TEST_CLUSTER, "isolated", "Run via npm run test:bootstrap only");
assert.match(process.env.PGHOST ?? "", /^\/tmp\/bootstrap-tests\.[a-zA-Z0-9]+$/);
const { getPool } = await import("../server/db");
const { seedDatabase } = await import("../server/seed");
const pool = await getPool();
const testPassword = "Test-Only_Strong-Password-932!";
after(async () => { await pool.end(); });

async function reset() {
  await pool.query("TRUNCATE users, products, categories CASCADE");
}

test("missing/weak inputs are refused without defaults or echoed credentials", () => {
  for (const [username, password] of [
    [undefined, undefined], ["admin", undefined], [undefined, testPassword],
    ["admin", "admin123"], ["__superadmin__", testPassword],
    ["a".repeat(51), testPassword], ["new-admin", "a".repeat(20)],
    ["new-admin", " "+testPassword], ["new-admin", testPassword.repeat(20)],
  ]) {
    assert.throws(() => validateBootstrapCredentials(username, password), (error: unknown) =>
      error instanceof BootstrapError && !error.message.includes(testPassword));
  }
  assert.equal(validateBootstrapCredentials(" New-Admin ", testPassword).username, "new-admin");
});

test("ordinary seed never creates an account or logs credentials on an empty DB", async (t) => {
  await reset();
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => { logs.push(args.map(String).join(" ")); };
  try {
    try { await seedDatabase(); } catch (error) {
      // Catalog data predates the current schema; admin safety must also hold on failure.
      assert.ok(error && typeof error === "object" && "code" in error && "column" in error);
      assert.equal(error.code, "23502");
      assert.equal(error.column, "price");
      t.diagnostic("Catalog seed did not complete on current schema; account safety still checked.");
    }
    await seedDatabase();
  } finally { console.log = originalLog; }
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM users")).rows[0].n, 0);
  assert.doesNotMatch(logs.join("\n"), /admin123|password:|login:\s*admin|Admin credentials/i);
  assert.doesNotMatch(readFileSync("server/seed.ts", "utf8"), /hashPassword|insert\(users\)|admin-default/);
});

test("explicit bootstrap works with existing catalog, stores a salted login-compatible hash, and refuses reruns", async () => {
  await bootstrapAdmin(pool, " Owner ", testPassword);
  const before = (await pool.query("SELECT * FROM users")).rows;
  assert.equal(before.length, 1);
  assert.equal(before[0].username, "owner");
  assert.equal(before[0].role, "admin");
  assert.notEqual(before[0].id, "admin-default");
  const [hash, salt] = before[0].password.split(".");
  const derived = await promisify(scrypt)(testPassword, salt, 64) as Buffer;
  assert.equal(derived.toString("hex"), hash);
  assert.notEqual(before[0].password, testPassword);
  await assert.rejects(bootstrapAdmin(pool, "different-owner", testPassword), BootstrapError);
  assert.deepEqual((await pool.query("SELECT * FROM users")).rows, before);
});

test("any existing role blocks bootstrap, and seed leaves all accounts untouched", async () => {
  for (const role of ["customer", "worker", "admin"]) {
    await reset();
    await pool.query(
      "INSERT INTO users (id, username, password, role, email, password_reset_token) VALUES ($1,$2,$3,$4,$5,$6)",
      ["existing", "existing", "unchanged-existing-hash", role, "fixture@example.invalid", "unchanged-token"],
    );
    await pool.query("INSERT INTO categories (name) VALUES ('Existing catalog')");
    const before = (await pool.query("SELECT * FROM users")).rows;
    await assert.rejects(bootstrapAdmin(pool, "new-owner", testPassword), BootstrapError);
    await seedDatabase();
    assert.deepEqual((await pool.query("SELECT * FROM users")).rows, before);
  }
});

test("simultaneous commands create exactly one admin", async () => {
  await reset();
  const results = await Promise.allSettled([
    bootstrapAdmin(pool, "first-owner", testPassword),
    bootstrapAdmin(pool, "second-owner", testPassword),
  ]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  const rejected = results.find(r => r.status === "rejected") as PromiseRejectedResult;
  assert.ok(rejected.reason instanceof BootstrapError);
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM users")).rows[0].n, 1);
});

test("registration cannot insert between the empty-user check and admin creation", async () => {
  await reset();
  let locked!: () => void;
  let resume!: () => void;
  const lockReached = new Promise<void>(resolve => { locked = resolve; });
  const continueBootstrap = new Promise<void>(resolve => { resume = resolve; });
  const observedPool = {
    async connect() {
      const client = await pool.connect();
      return {
        async query(text: string, values?: string[]) {
          const result = await client.query(text, values);
          if (text.startsWith("LOCK TABLE")) {
            locked();
            await continueBootstrap;
          }
          return result;
        },
        release() { client.release(); },
      };
    },
  };
  const adminCreation = bootstrapAdmin(observedPool, "owner", testPassword);
  await lockReached;
  let inserted = false;
  const registration = pool.query(
    "INSERT INTO users (id, username, password, role) VALUES ('customer', 'customer', 'fixture-hash', 'customer')",
  ).then(() => { inserted = true; });
  try {
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(inserted, false, "registration must wait for admin transaction");
  } finally {
    resume();
    await Promise.all([adminCreation, registration]);
  }
  assert.deepEqual((await pool.query("SELECT role FROM users ORDER BY role")).rows, [
    { role: "admin" }, { role: "customer" },
  ]);
});

test("insert failure rolls back and releases the lock", async () => {
  await reset();
  await pool.query("ALTER TABLE users ADD CONSTRAINT test_no_admin CHECK (role <> 'admin')");
  try {
    await assert.rejects(bootstrapAdmin(pool, "owner", testPassword));
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM users")).rows[0].n, 0);
  } finally {
    await pool.query("ALTER TABLE users DROP CONSTRAINT test_no_admin");
  }
  await bootstrapAdmin(pool, "owner", testPassword);
});

test("CLI is opt-in, has safe exit statuses, and never logs passwords or database errors", async () => {
  await reset();
  const env = { ...process.env, BOOTSTRAP_ADMIN_USERNAME: "cli-owner", BOOTSTRAP_ADMIN_PASSWORD: testPassword };
  const run = (extra: Record<string, string> = {}) => spawnSync("bash", ["scripts/bootstrap-admin.sh"], {
    env: { ...env, ...extra }, encoding: "utf8", timeout: 20000,
  });
  const missing = run({ BOOTSTRAP_ADMIN_PASSWORD: "" });
  assert.equal(missing.status, 1);
  const weak = run({ BOOTSTRAP_ADMIN_PASSWORD: "admin123" });
  assert.equal(weak.status, 1);
  const first = run();
  assert.equal(first.status, 0, first.stderr);
  const before = (await pool.query("SELECT * FROM users")).rows;
  const repeated = run();
  assert.equal(repeated.status, 1);
  assert.deepEqual((await pool.query("SELECT * FROM users")).rows, before);
  const databaseFailure = run({ PGDATABASE: "nonexistent_bootstrap_test_database" });
  assert.equal(databaseFailure.status, 1);
  const neonFailure = run({ USE_NEON: "true", DATABASE_URL: "invalid-bootstrap-test-url" });
  assert.equal(neonFailure.status, 1);
  for (const result of [missing, weak, first, repeated, databaseFailure, neonFailure]) {
    assert.doesNotMatch(result.stdout + result.stderr, /Test-Only_Strong-Password-932!|admin123|INSERT INTO|parameters:|nonexistent_bootstrap_test_database/);
    assert.doesNotMatch(result.stdout + result.stderr, /invalid-bootstrap-test-url/);
  }
});
