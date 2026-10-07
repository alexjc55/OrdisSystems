import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import type { Server as HttpServer } from "node:http";
import net, { type Socket } from "node:net";
import express from "express";
import sgMail from "@sendgrid/mail";
import { passwordResetEmail, passwordResetOrigin } from "../server/password-reset-email";

if (process.env.PASSWORD_TEST_CLUSTER !== "isolated" ||
    !process.env.PGHOST?.startsWith("/tmp/password-tests.")) {
  throw new Error("Only run via npm run test:passwords (disposable database required)");
}

let pool: any;
let storage: typeof import("../server/storage").storage;
let emailService: typeof import("../server/email-service").emailService;
let httpServer: HttpServer;
let smtpServer: net.Server;
let baseUrl: string;
let smtpPort: number;
let mode: "accept" | "reject-recipient" | "reject-data" = "accept";
const messages: string[] = [];
const recipients: string[] = [];
const sockets = new Set<Socket>();
const origin = "https://delivery-store.example";

// A real local SMTP fixture exercises Nodemailer's wire delivery and rejection.
before(async () => {
  delete process.env.REPLIT_APP_URL;
  delete process.env.SENDGRID_API_KEY;
  process.env.ALLOWED_ORIGINS = origin;
  const { getPool } = await import("../server/db");
  pool = await getPool();
  ({ storage } = await import("../server/storage"));
  ({ emailService } = await import("../server/email-service"));
  smtpServer = net.createServer(socket => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.setEncoding("utf8");
    socket.write("220 fixture ESMTP\r\n");
    let buffer = "";
    let data: string[] | undefined;
    socket.on("data", chunk => {
      buffer += chunk;
      while (buffer.includes("\r\n")) {
        const end = buffer.indexOf("\r\n");
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (data) {
          if (line !== ".") {
            data.push(line.replace(/^\.\./, "."));
            continue;
          }
          const message = data.join("\r\n");
          messages.push(message);
          data = undefined;
          // Include the secret in the provider's error to prove logs redact it.
          const token = decodeQuotedPrintable(message).match(/token=([a-f0-9]{64})/)?.[1];
          socket.write(mode === "reject-data"
            ? `550 rejected credential link ${token}\r\n` : "250 queued\r\n");
        } else if (/^(EHLO|HELO)/i.test(line)) {
          socket.write("250 fixture\r\n");
        } else if (/^RCPT TO:/i.test(line)) {
          recipients.push(line);
          socket.write(mode === "reject-recipient" ? "550 recipient rejected\r\n" : "250 OK\r\n");
        } else if (line === "DATA") {
          data = [];
          socket.write("354 send data\r\n");
        } else if (line === "QUIT") {
          socket.end("221 bye\r\n");
        } else {
          socket.write("250 OK\r\n");
        }
      }
    });
  });
  await new Promise<void>(resolve => smtpServer.listen(0, "127.0.0.1", resolve));
  const smtpAddress = smtpServer.address();
  assert.ok(smtpAddress && typeof smtpAddress !== "string");
  smtpPort = smtpAddress.port;
  await storage.updateStoreSettings({
    storeName: "Delivery Store", defaultLanguage: "en",
    orderNotificationFromEmail: "verified@delivery-store.example",
    orderNotificationFromName: "Delivery Store",
    smtpHost: "127.0.0.1", smtpPort, useSendgrid: false,
    // Recovery must not depend on whether order alerts are enabled.
    emailNotificationsEnabled: false,
  });
  await pool.query(`INSERT INTO users (id, username, email, password, role)
    VALUES ('mail-customer','mail-customer','mail-customer@example.invalid','unchanged-hash','customer')`);
  await pool.query(`CREATE TABLE IF NOT EXISTS "session" (
    sid varchar PRIMARY KEY, sess json NOT NULL, expire timestamp NOT NULL
  )`);
  await pool.query(`INSERT INTO "session" (sid,sess,expire)
    VALUES ('mail-session','{"passport":{"user":"mail-customer"}}',now()+interval '1 day')`);
  const { default: router } = await import("../server/routes/auth.routes");
  const app = express();
  app.use(express.json());
  app.use("/api", router);
  await new Promise<void>(resolve => { httpServer = app.listen(0, "127.0.0.1", resolve); });
  const address = httpServer.address();
  assert.ok(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  for (const socket of sockets) socket.destroy();
  if (smtpServer) await new Promise<void>(resolve => smtpServer.close(() => resolve()));
  if (httpServer) {
    await new Promise<void>(resolve => {
      httpServer.close(() => resolve());
      httpServer.closeAllConnections();
    });
  }
  await pool?.end();
});

function decodeQuotedPrintable(value: string) {
  return value.replace(/=\r\n/g, "").replace(/=([0-9A-F]{2})/g,
    (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

async function forgot(email: unknown = "mail-customer@example.invalid") {
  const response = await fetch(`${baseUrl}/api/auth/forgot-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Host: "attacker.example",
      Origin: "https://attacker.example",
      "X-Forwarded-Host": "attacker.example",
      "X-Forwarded-Proto": "http",
    },
    body: JSON.stringify({ email }),
  });
  return { status: response.status, body: await response.json() };
}

async function assertCredentialsAndSessionsUnchanged() {
  const user = await storage.getUser("mail-customer");
  assert.equal(user?.password, "unchanged-hash");
  assert.equal(user?.role, "customer");
  assert.equal((await pool.query(`SELECT count(*)::int AS n FROM "session"
    WHERE sid='mail-session'`)).rows[0].n, 1);
}

test("SMTP delivers a single-use recovery link from the existing store sender, ignoring forged headers", async () => {
  const unknown = await forgot("missing@example.invalid");
  const count = messages.length;
  const existing = await forgot();
  assert.deepEqual(existing, unknown);
  assert.equal(existing.status, 200);
  assert.equal(messages.length, count + 1);
  const wireMessage = decodeQuotedPrintable(messages.at(-1)!);
  const user = (await storage.getUser("mail-customer"))!;
  assert.ok(user.passwordResetToken);
  assert.ok(user.passwordResetExpires!.getTime() > Date.now());
  assert.ok(wireMessage.includes(`${origin}/reset-password?token=${user.passwordResetToken}`));
  assert.ok(wireMessage.includes("verified@delivery-store.example"));
  assert.ok(wireMessage.includes("mail-customer@example.invalid"));
  assert.ok(wireMessage.includes("text/plain") && wireMessage.includes("text/html"));
  assert.ok(!wireMessage.includes("attacker.example"));
  assert.equal((await storage.validatePasswordResetToken(user.passwordResetToken)).isValid, true);
  assert.ok(!JSON.stringify(existing).includes(user.passwordResetToken));
  const noMail = await forgot("another-missing@example.invalid");
  assert.deepEqual(noMail, existing);
  assert.equal(messages.length, count + 1);
  await assertCredentialsAndSessionsUnchanged();
});

test("SMTP failure gives the same response, clears only the failed token, and logs no credential", async t => {
  const logs: string[] = [];
  t.mock.method(console, "error", (...args: unknown[]) => logs.push(args.join(" ")));
  t.mock.method(console, "log", (...args: unknown[]) => logs.push(args.join(" ")));
  const unknown = await forgot("missing@example.invalid");
  for (const failure of ["reject-data", "reject-recipient"] as const) {
    mode = failure;
    assert.deepEqual(await forgot(), unknown);
    const tokenInRejectedEmail = decodeQuotedPrintable(messages.at(-1)!).match(/token=([a-f0-9]{64})/)?.[1];
    assert.equal((await storage.getUser("mail-customer"))!.passwordResetToken, null);
    if (tokenInRejectedEmail) assert.ok(!logs.join("\n").includes(tokenInRejectedEmail));
    await assertCredentialsAndSessionsUnchanged();
  }
  assert.ok(logs.some(line => line.includes("could not be delivered")));
  mode = "accept";
  assert.deepEqual(await forgot(), unknown);
  assert.ok((await storage.getUser("mail-customer"))!.passwordResetToken);
});

test("false delivery result is handled like a thrown mail error", async t => {
  t.mock.method(emailService, "sendEmail", async () => false);
  assert.deepEqual(await forgot(), await forgot("missing@example.invalid"));
  assert.equal((await storage.getUser("mail-customer"))!.passwordResetToken, null);
  await assertCredentialsAndSessionsUnchanged();
});

test("failure cleanup cannot erase a newer concurrently delivered token", async t => {
  let newerToken = "";
  t.mock.method(emailService, "sendEmail", async () => {
    ({ token: newerToken } = await storage.createPasswordResetToken("mail-customer@example.invalid"));
    throw new Error("simulated failure");
  });
  assert.deepEqual(await forgot(), await forgot("missing@example.invalid"));
  assert.equal((await storage.getUser("mail-customer"))!.passwordResetToken, newerToken);
});

test("missing trusted URL or sender fails privately without creating a token or sending mail", async t => {
  let sent = 0;
  t.mock.method(emailService, "sendEmail", async () => { sent++; return true; });
  const beforeToken = (await storage.getUser("mail-customer"))!.passwordResetToken;
  process.env.REPLIT_APP_URL = "http://insecure.example";
  try {
    assert.deepEqual(await forgot(), await forgot("missing@example.invalid"));
    assert.equal((await storage.getUser("mail-customer"))!.passwordResetToken, beforeToken);
  } finally {
    delete process.env.REPLIT_APP_URL;
  }
  await storage.updateStoreSettings({ orderNotificationFromEmail: "" });
  try {
    assert.deepEqual(await forgot(), await forgot("missing@example.invalid"));
    assert.equal((await storage.getUser("mail-customer"))!.passwordResetToken, beforeToken);
  } finally {
    await storage.updateStoreSettings({ orderNotificationFromEmail: "verified@delivery-store.example" });
  }
  assert.equal(sent, 0);
});

test("SendGrid uses the same store configuration, disables tracking, and falls back to SMTP safely", async t => {
  await storage.updateStoreSettings({ useSendgrid: true, sendgridApiKey: "SG.fixture.not-a-real-key" });
  t.mock.method(sgMail, "setApiKey", () => {});
  let captured: any;
  t.mock.method(sgMail, "send", async (message: unknown) => { captured = message; return []; });
  try {
    const count = messages.length;
    assert.deepEqual(await forgot(), await forgot("missing@example.invalid"));
    assert.equal(messages.length, count);
    assert.equal(captured.to, "mail-customer@example.invalid");
    assert.equal(captured.from.email, "verified@delivery-store.example");
    assert.deepEqual(captured.trackingSettings, {
      clickTracking: { enable: false, enableText: false }, openTracking: { enable: false },
    });
    const token = (await storage.getUser("mail-customer"))!.passwordResetToken;
    assert.ok(captured.text.includes(token));
    const logs: string[] = [];
    t.mock.method(console, "error", (...args: unknown[]) => logs.push(args.join(" ")));
    t.mock.method(sgMail, "send", async (message: any) => { throw new Error(message.text); });
    assert.deepEqual(await forgot(), await forgot("missing@example.invalid"));
    assert.equal(messages.length, count + 1);
    const fallbackToken = (await storage.getUser("mail-customer"))!.passwordResetToken!;
    assert.ok(!logs.join("\n").includes(fallbackToken));
  } finally {
    await storage.updateStoreSettings({ useSendgrid: false, sendgridApiKey: null });
  }
});

test("recovery email covers all four languages and escapes store HTML", async () => {
  const settings = (await storage.getStoreSettings())!;
  for (const lang of ["ru", "en", "he", "ar"]) {
    const email = passwordResetEmail({ ...settings, defaultLanguage: lang,
      storeName: '<img src=x onerror="alert(1)">' }, "test@example.invalid", "test-token", origin);
    assert.ok(email.text.includes(`${origin}/reset-password?token=test-token`));
    assert.ok(email.html.includes(`lang="${lang}"`));
    assert.ok(email.html.includes(`dir="${["he", "ar"].includes(lang) ? "rtl" : "ltr"}"`));
    assert.ok(!email.html.includes("<img"));
    assert.ok(email.html.includes("&lt;img"));
  }
});

test("only configured HTTPS origins can receive reset links", () => {
  assert.equal(passwordResetOrigin({ REPLIT_APP_URL: `${origin}/` }), origin);
  assert.equal(passwordResetOrigin({ ALLOWED_ORIGINS: `http://localhost:3000,${origin}` }), origin);
  for (const value of ["http://example.com", "javascript:alert(1)", "//example.com",
    "https://user:pass@example.com", "https://example.com/redirect", "https://example.com/?to=evil",
    "https://example.com/#fragment", "https://example.com\n"]) {
    assert.throws(() => passwordResetOrigin({ REPLIT_APP_URL: value, ALLOWED_ORIGINS: origin }));
  }
  assert.throws(() => passwordResetOrigin({ NODE_ENV: "production", REPLIT_DEV_DOMAIN: "dev.example" }));
  assert.equal(passwordResetOrigin({ NODE_ENV: "development", REPLIT_DEV_DOMAIN: "dev.example" }),
    "https://dev.example");
});

test("invalid input is rejected without contacting mail providers", async () => {
  const count = recipients.length;
  for (const email of [null, {}, "", 7]) assert.equal((await forgot(email)).status, 400);
  assert.equal(recipients.length, count);
});

test("the emailed token resets the password once and leaves other users' sessions intact", async () => {
  mode = "accept";
  await forgot();
  const link = decodeQuotedPrintable(messages.at(-1)!).match(/https:\/\/delivery-store\.example\/reset-password\?token=[a-f0-9]{64}/)?.[0];
  assert.ok(link);
  const token = new URL(link).searchParams.get("token");
  const beforeOthers = (await pool.query(`SELECT sid FROM "session"
    WHERE sid <> 'mail-session' ORDER BY sid`)).rows;
  const reset = () => fetch(`${baseUrl}/api/auth/reset-password`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword: "recovered-password-123" }),
  });
  assert.equal((await reset()).status, 200);
  assert.equal((await reset()).status, 400);
  const { comparePasswords } = await import("../server/password-hash");
  const user = (await storage.getUser("mail-customer"))!;
  assert.equal(await comparePasswords("recovered-password-123", user.password), true);
  assert.equal(user.passwordResetToken, null);
  assert.equal((await pool.query(`SELECT count(*)::int AS n FROM "session"
    WHERE sid='mail-session'`)).rows[0].n, 0);
  assert.deepEqual((await pool.query(`SELECT sid FROM "session"
    WHERE sid <> 'mail-session' ORDER BY sid`)).rows, beforeOthers);
});
