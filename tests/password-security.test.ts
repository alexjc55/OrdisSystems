import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import type { Server } from "node:http";
import express from "express";
import bcrypt from "bcryptjs";
import { hashPassword, comparePasswords } from "../server/password-hash";
import { PasswordUpdateConflict, sessionIdentity } from "../server/session-credentials";

if (process.env.PASSWORD_TEST_CLUSTER !== "isolated" ||
    !process.env.PGHOST?.startsWith("/tmp/password-tests.")) {
  throw new Error("Only run via npm run test:passwords (disposable database required)");
}

let pool: any;
let storage: typeof import("../server/storage").storage;
let server: Server;
let baseUrl: string;
let releaseHeldRequest: (() => void) | undefined;
let heldRequestStarted: (() => void) | undefined;
const oldPassword = "старый-password-123";
const newPassword = "новый-password-456";

before(async () => {
  ({ pool } = await import("../server/db"));
  // Wait for db initialization, then explicitly create the actual store table.
  const { getPool } = await import("../server/db");
  pool = await getPool();
  await pool.query(`CREATE TABLE "session" (
    sid varchar PRIMARY KEY, sess json NOT NULL, expire timestamp NOT NULL
  )`);
  ({ storage } = await import("../server/storage"));
  const { setupAuth, isAuthenticated } = await import("../server/auth");
  const { default: authRoutes } = await import("../server/routes/auth.routes");
  const { default: adminUsers } = await import("../server/routes/admin/users.routes");
  const { requireAdminForUserWrites } = await import("../server/middleware/user-security");
  const app = express();
  app.use(express.json());
  setupAuth(app);
  app.use("/api/admin/users", requireAdminForUserWrites);
  app.use("/api", authRoutes);
  app.use("/api", adminUsers);
  app.post("/test/hold", isAuthenticated, async (req: any, res) => {
    heldRequestStarted?.();
    await new Promise<void>(resolve => { releaseHeldRequest = resolve; });
    req.session.testMutation = true; // Simulate an old request recreating its row.
    await new Promise<void>((resolve, reject) => {
      req.session.save((error: Error | null) => error ? reject(error) : resolve());
    });
    res.sendStatus(200);
  });
  await new Promise<void>(resolve => { server = app.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  releaseHeldRequest?.();
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
  }
  await pool?.end();
});

async function request(path: string, body?: unknown, cookie?: string) {
  return fetch(`${baseUrl}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(cookie ? { cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function fixture(id: string, format: "scrypt" | "bcrypt" = "scrypt", role = "customer") {
  const password = format === "bcrypt"
    ? await bcrypt.hash(oldPassword, 10) : await hashPassword(oldPassword);
  await pool.query(
    "INSERT INTO users (id,username,password,role,email) VALUES ($1,$1,$2,$3,$4)",
    [id, password, role, `${id}@example.invalid`],
  );
  return password;
}

async function login(username: string, password = oldPassword) {
  const response = await request("/api/login", { username, password });
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  return cookie;
}

async function sessionCount(id: string) {
  return (await pool.query(`SELECT count(*)::int AS n FROM "session"
    WHERE sess->'passport'->>'user' = $1 OR sess->'passport'->'user'->>'id' = $1`, [id])).rows[0].n;
}

test("scrypt and legacy bcrypt verify correctly; malformed hashes fail safely", async () => {
  for (const hash of [await hashPassword(oldPassword), await bcrypt.hash(oldPassword, 10)]) {
    assert.equal(await comparePasswords(oldPassword, hash), true);
    assert.equal(await comparePasswords("wrong", hash), false);
  }
  for (const hash of ["", "plaintext", "abcd.salt", "a".repeat(128), "$2b$10$bad",
    `${"ab".repeat(64)}.${"cd".repeat(16)}.extra`, `${"ab".repeat(64)}.${"z".repeat(32)}`]) {
    assert.equal(await comparePasswords(oldPassword, hash), false);
  }
  assert.equal(await comparePasswords({} as any, await hashPassword(oldPassword)), false);
  const long = "x".repeat(72);
  assert.equal(await comparePasswords(`${long}suffix`, await bcrypt.hash(long, 10)), false);
  assert.equal(await comparePasswords("x".repeat(200), await hashPassword("x".repeat(200))), true);
});

test("self-service change works for both formats and revokes only the affected user's sessions", async () => {
  await fixture("unaffected");
  const unaffectedCookie = await login("unaffected");
  await pool.query(`INSERT INTO sessions (sid,sess,expire) VALUES ('unused-table', $1, now()+interval '1 day')`,
    [JSON.stringify({ passport: { user: "change-scrypt" } })]);
  for (const format of ["scrypt", "bcrypt"] as const) {
    const id = `change-${format}`;
    await fixture(id, format);
    const first = await login(id);
    const second = await login(id);
    await pool.query(`INSERT INTO "session" (sid,sess,expire) VALUES ($1,$2,now()+interval '1 day')`,
      [`legacy-${id}`, JSON.stringify({ passport: { user: id } })]);
    assert.equal(await sessionCount(id), 3);
    const before = (await storage.getUser(id))!.password;
    for (const body of [
      { currentPassword: "wrong", newPassword },
      { currentPassword: {}, newPassword },
      { currentPassword: oldPassword, newPassword: {} },
      { currentPassword: oldPassword, newPassword: "short" },
    ]) {
      assert.equal((await request("/api/auth/change-password", body, first)).status, 400);
      assert.equal((await storage.getUser(id))!.password, before);
      assert.equal(await sessionCount(id), 3);
    }
    assert.equal((await request("/api/auth/change-password",
      { currentPassword: oldPassword, newPassword }, first)).status, 200);
    assert.equal(await sessionCount(id), 0);
    for (const cookie of [first, second]) {
      assert.equal((await request("/api/auth/user", undefined, cookie)).status, 401);
    }
    assert.equal((await request("/api/login", { username: id, password: oldPassword })).status, 401);
    await login(id, newPassword);
    assert.match((await storage.getUser(id))!.password, /^[0-9a-f]{128}\.[0-9a-f]{32}$/);
  }
  assert.equal((await request("/api/auth/user", undefined, unaffectedCookie)).status, 200);
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM sessions")).rows[0].n, 1);
});

test("reset tokens are expiring, single-use, and rotation invalidates access", async () => {
  await fixture("reset", "bcrypt");
  const cookie = await login("reset");
  const { token } = await storage.createPasswordResetToken("reset@example.invalid");
  assert.match(token, /^[0-9a-f]{64}$/);
  assert.equal((await request("/api/auth/reset-password", { token, newPassword }, cookie)).status, 200);
  assert.equal(await sessionCount("reset"), 0);
  assert.equal((await request("/api/auth/user", undefined, cookie)).status, 401);
  assert.equal((await request("/api/auth/reset-password", { token, newPassword: oldPassword })).status, 400);
  const user = (await storage.getUser("reset"))!;
  assert.equal(user.passwordResetToken, null);
  assert.equal(user.passwordResetExpires, null);
  await login("reset", newPassword);
  for (const expires of [null, new Date(Date.now() - 1000)]) {
    await pool.query("UPDATE users SET password_reset_token='expired',password_reset_expires=$1 WHERE id='reset'", [expires]);
    assert.equal((await request("/api/auth/reset-password", { token: "expired", newPassword: oldPassword })).status, 400);
    assert.equal((await storage.getUser("reset"))!.password, user.password);
  }
});

test("concurrent reset attempts have exactly one winner; stale password checks cannot overwrite", async () => {
  const previous = await fixture("concurrent");
  const { token } = await storage.createPasswordResetToken("concurrent@example.invalid");
  const responses = await Promise.all([
    request("/api/auth/reset-password", { token, newPassword }),
    request("/api/auth/reset-password", { token, newPassword: "another-password" }),
  ]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 400]);
  await assert.rejects(storage.updatePassword("concurrent", await hashPassword(oldPassword),
    { expectedPassword: previous }), PasswordUpdateConflict);
});

test("admin-created users can log in; admin reset preserves the administrator and other users", async () => {
  await fixture("owner", "scrypt", "admin");
  const ownerCookie = await login("owner");
  assert.equal((await request("/api/admin/users", {
    username: "created-by-admin", password: oldPassword, role: "customer",
  }, ownerCookie)).status, 201);
  const createdCookie = await login("created-by-admin");
  const created = (await storage.getUserByUsername("created-by-admin"))!;
  assert.match(created.password, /^[0-9a-f]{128}\.[0-9a-f]{32}$/);
  await storage.createPasswordResetToken("reset@example.invalid");
  for (const role of ["customer", "worker"]) {
    await fixture(`cannot-reset-${role}`, "scrypt", role);
    const cookie = await login(`cannot-reset-${role}`);
    assert.equal((await request(`/api/admin/users/${created.id}/set-password`,
      { password: newPassword }, cookie)).status, 403);
  }
  assert.equal((await request(`/api/admin/users/${created.id}/set-password`,
    { password: newPassword })).status, 401);
  assert.equal((await request(`/api/admin/users/${created.id}/set-password`,
    { password: newPassword }, ownerCookie)).status, 200);
  assert.equal((await request("/api/auth/user", undefined, createdCookie)).status, 401);
  assert.equal((await request("/api/auth/user", undefined, ownerCookie)).status, 200);
  await login("created-by-admin", newPassword);
  assert.equal((await request("/api/admin/users/missing/set-password",
    { password: newPassword }, ownerCookie)).status, 404);
  assert.equal((await request("/api/admin/users/owner/set-password",
    { password: newPassword }, ownerCookie)).status, 200);
  assert.equal((await request("/api/auth/user", undefined, ownerCookie)).status, 401);
  await login("owner", newPassword);
});

test("session deletion failure rolls back both the password and reset-token consumption", async () => {
  await fixture("rollback");
  const cookie = await login("rollback");
  const { token } = await storage.createPasswordResetToken("rollback@example.invalid");
  const beforeUser = await storage.getUser("rollback");
  await pool.query(`CREATE FUNCTION reject_test_delete() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'simulated session deletion failure'; END $$`);
  await pool.query(`CREATE TRIGGER reject_test_delete BEFORE DELETE ON "session"
    FOR EACH ROW EXECUTE FUNCTION reject_test_delete()`);
  try {
    assert.equal((await request("/api/auth/reset-password", { token, newPassword })).status, 500);
    assert.deepEqual(await storage.getUser("rollback"), beforeUser);
    assert.equal((await request("/api/auth/user", undefined, cookie)).status, 200);
  } finally {
    await pool.query(`DROP TRIGGER reject_test_delete ON "session"`);
  }
});

test("a missing actual session table fails closed rather than clearing the unrelated plural table", async () => {
  await fixture("missing-session-table");
  const beforeUser = await storage.getUser("missing-session-table");
  await pool.query(`ALTER TABLE "session" RENAME TO temporarily_missing_session`);
  try {
    await assert.rejects(storage.updatePassword("missing-session-table", await hashPassword(newPassword)));
    assert.deepEqual(await storage.getUser("missing-session-table"), beforeUser);
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM sessions")).rows[0].n, 1);
  } finally {
    await pool.query(`ALTER TABLE temporarily_missing_session RENAME TO "session"`);
  }
});

test("an in-flight legacy request cannot restore access after a password change", async () => {
  await fixture("in-flight");
  const cookie = await login("in-flight");
  // Convert one real signed-cookie session into the pre-upgrade serialized format.
  await pool.query(`UPDATE "session" SET sess = json_build_object(
    'cookie',sess->'cookie','passport',json_build_object('user','in-flight'))
    WHERE sess->'passport'->'user'->>'id'='in-flight'`);
  const started = new Promise<void>(resolve => { heldRequestStarted = resolve; });
  const held = request("/test/hold", {}, cookie);
  await started;
  const oldHash = (await storage.getUser("in-flight"))!.password;
  await storage.updatePassword("in-flight", await hashPassword(newPassword));
  releaseHeldRequest!();
  assert.equal((await held).status, 200);
  assert.equal(await sessionCount("in-flight"), 1); // Row recreated, but version is stale.
  assert.equal((await request("/api/auth/user", undefined, cookie)).status, 401);
  await login("in-flight", newPassword);
  const oldIdentity = sessionIdentity({ id: "in-flight", password: oldHash });
  assert.notEqual(oldIdentity.passwordVersion,
    sessionIdentity((await storage.getUser("in-flight"))!).passwordVersion);
});

test("a legacy session loaded just before rotation cannot adopt the new password version", async () => {
  await fixture("legacy-race");
  const cookie = await login("legacy-race");
  await pool.query(`UPDATE "session" SET sess = json_build_object(
    'cookie',sess->'cookie','passport',json_build_object('user','legacy-race'))
    WHERE sess->'passport'->'user'->>'id'='legacy-race'`);
  const original = storage.getUserForLegacySession.bind(storage);
  let release!: () => void;
  let started!: () => void;
  const entered = new Promise<void>(resolve => { started = resolve; });
  storage.getUserForLegacySession = async (...args) => {
    started();
    await new Promise<void>(resolve => { release = resolve; });
    return original(...args);
  };
  try {
    const pending = request("/api/auth/user", undefined, cookie);
    await entered;
    await storage.updatePassword("legacy-race", await hashPassword(newPassword));
    release();
    assert.equal((await pending).status, 401);
  } finally {
    storage.getUserForLegacySession = original;
    release?.();
  }
  await login("legacy-race", newPassword);
});
