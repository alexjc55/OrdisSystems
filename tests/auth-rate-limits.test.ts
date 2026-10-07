import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Server } from "node:http";
import { test, before, after } from "node:test";
import express from "express";
import { mountAuthRateLimits } from "../server/middleware/auth-rate-limits";

let server: Server;
let baseUrl: string;
let registrationCalls = 0;
const app = express();
// Model the application's one reverse proxy. Never use this test app in production.
app.set("trust proxy", 1);
mountAuthRateLimits(app);
app.post("/api/register", (_req, res) => {
  registrationCalls++;
  res.sendStatus(201);
});
app.post("/api/login", (_req, res) => res.sendStatus(401));
app.post("/api/orders/guest", (_req, res) => res.sendStatus(201));
app.post("/api/admin/users", (_req, res) => res.sendStatus(401));

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

function request(path: string, ip: string) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "x-forwarded-for": ip },
  });
}

test("sixth registration is stopped before the account creation handler", async () => {
  const beforeCalls = registrationCalls;
  for (let i = 0; i < 5; i++) {
    assert.equal((await request("/api/register", "192.0.2.1")).status, 201);
  }
  const blocked = await request("/api/register", "192.0.2.1");
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get("retry-after")) > 0);
  assert.equal((await blocked.json()).code, "AUTH_RATE_LIMITED");
  assert.equal(registrationCalls, beforeCalls + 5);
  assert.equal((await request("/api/register", "192.0.2.2")).status, 201);
});

test("invalid login attempts are counted before login and independently of registration", async () => {
  for (let i = 0; i < 10; i++) {
    assert.equal((await request("/api/login", "192.0.2.3")).status, 401);
  }
  assert.equal((await request("/api/login", "192.0.2.3")).status, 429);
  assert.equal((await request("/api/register", "192.0.2.3")).status, 201);
});

test("registration limit does not block guest orders or existing-user login", async () => {
  for (let i = 0; i < 5; i++) {
    assert.equal((await request("/api/register", "192.0.2.4")).status, 201);
  }
  assert.equal((await request("/api/register", "192.0.2.4")).status, 429);
  assert.equal((await request("/api/orders/guest", "192.0.2.4")).status, 201);
  assert.equal((await request("/api/login", "192.0.2.4")).status, 401);
  assert.equal((await request("/api/admin/users", "192.0.2.4")).status, 401);
});

test("changing an untrusted forwarded prefix cannot evade a one-proxy limit", async () => {
  for (let i = 0; i < 5; i++) {
    assert.equal((await request("/api/register", `198.51.100.${i + 1}, 192.0.2.5`)).status, 201);
  }
  assert.equal((await request("/api/register", "198.51.100.99, 192.0.2.5")).status, 429);
});

test("IPv6 addresses within one subnet share a registration limit", async () => {
  for (let i = 1; i <= 5; i++) {
    assert.equal((await request("/api/register", `2001:db8:1234:5600::${i}`)).status, 201);
  }
  assert.equal((await request("/api/register", "2001:db8:1234:5600::99")).status, 429);
});

test("production mounts protection before all auth handlers", () => {
  const source = readFileSync("server/routes/index.ts", "utf8");
  assert.ok(source.indexOf("mountAuthRateLimits(app);") >= 0);
  assert.ok(source.indexOf("mountAuthRateLimits(app);") < source.indexOf("await setupAuth(app);"));
  assert.ok(!source.includes("app.post('/api/login', loginLimiter)"));
});
