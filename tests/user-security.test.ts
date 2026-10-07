import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test, before, after } from "node:test";
import type { Server } from "node:http";
import express from "express";
import {
  validateProfileUpdates,
  requireAdminForUserWrites,
} from "../server/middleware/user-security";

let server: Server;
let baseUrl: string;
let writes = 0;
const app = express();
app.use(express.json());
// Test-only identity injection; no real accounts, sessions, or database writes.
app.use((req: any, _res, next) => {
  const role = req.get("x-test-role");
  req.isAuthenticated = () => !!role;
  req.user = role ? { id: "test-user", role, username: "admin" } : undefined;
  next();
});
app.patch("/api/profile", (req, res, next) => {
  if (!req.isAuthenticated()) {
    res.sendStatus(401);
    return;
  }
  next();
}, validateProfileUpdates, (req, res) => {
  writes++;
  res.json(req.body);
});
app.use("/api/admin/users", requireAdminForUserWrites);
app.all("/api/admin/users", (_req, res) => res.sendStatus(204));
app.all("/api/admin/users/:id", (_req, res) => res.sendStatus(204));
app.all("/api/admin/users/:id/role", (_req, res) => res.sendStatus(204));
app.all("/api/admin/users/:id/set-password", (_req, res) => res.sendStatus(204));

before(async () => {
  await new Promise<void>(resolve => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${address.port}`;
});
after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  });
});

async function request(path: string, method: string, role?: string, body?: unknown) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(role ? { "x-test-role": role } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

test("privileged or unknown profile fields are rejected before writing", async () => {
  const beforeWrites = writes;
  for (const field of [
    "role", "id", "password", "passwordResetToken", "passwordResetExpires",
    "username", "email", "createdAt", "loyaltyPoints", "__proto__", "constructor",
  ]) {
    for (const role of ["customer", "worker", "admin"]) {
      const response = await request("/api/profile", "PATCH", role, {
        firstName: "Allowed name",
        [field]: "admin",
      });
      assert.equal(response.status, 400, `${role}: ${field}`);
    }
  }
  assert.equal(writes, beforeWrites);
});

test("invalid profile bodies are rejected", async () => {
  for (const body of [{}, [], { phone: 123 }, { firstName: {} }, { lastName: [] }]) {
    assert.equal((await request("/api/profile", "PATCH", "customer", body)).status, 400);
  }
});

test("ordinary profile edits still work", async () => {
  const body = {
    firstName: "Test", lastName: "Customer", phone: "0500000000",
    profileImageUrl: "", defaultAddress: null,
  };
  const response = await request("/api/profile", "PATCH", "customer", body);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), body);
  assert.equal((await request("/api/profile", "PATCH", undefined, body)).status, 401);
});

test("only admins can create, edit, delete, promote or reset passwords", async () => {
  for (const [method, path] of [
    ["POST", "/api/admin/users"],
    ["PUT", "/api/admin/users/test"],
    ["PATCH", "/api/admin/users/test"],
    ["DELETE", "/api/admin/users/test"],
    ["PATCH", "/api/admin/users/test/role"],
    ["POST", "/api/admin/users/test/set-password"],
  ]) {
    for (const [role, status] of [
      [undefined, 401], ["customer", 403], ["worker", 403], ["admin", 204],
    ] as const) {
      assert.equal((await request(path, method, role)).status, status, `${method} ${path}: ${role}`);
    }
  }
});

test("read requests pass through to the existing router authorization", async () => {
  for (const method of ["GET", "HEAD"]) {
    assert.equal((await request("/api/admin/users", method, "worker")).status, 204);
  }
});

test("production routes mount both protections in the required order", () => {
  const routes = readFileSync("server/routes/index.ts", "utf8");
  const guard = routes.indexOf("app.use('/api/admin/users', requireAdminForUserWrites)");
  assert.ok(guard >= 0);
  for (const target of [
    'app.use(systemRoutes)', 'app.use("/api", authRoutes)', 'app.use("/api", adminUserRoutes)',
  ]) {
    assert.ok(guard < routes.indexOf(target), `guard must precede ${target}`);
  }
  const profile = readFileSync("server/routes/profile.routes.ts", "utf8");
  assert.ok(profile.includes(
    "router.patch('/profile', isAuthenticated, validateProfileUpdates,"
  ));
});
