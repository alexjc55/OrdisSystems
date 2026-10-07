// Deliberately no HTTP route or automatic scan: one operator-verified payment.
import { parseArgs } from "node:util";

async function main() {
  const { values } = parseArgs({
    options: {
      token: { type: "string" },
      "transaction-code": { type: "string" },
      "grow-confirmation-reference": { type: "string" },
      "verified-non-j5-acknowledged": { type: "boolean" },
    },
  });
  if (!values.token || !values["transaction-code"] ||
      !values["grow-confirmation-reference"] || !values["verified-non-j5-acknowledged"]) {
    throw new Error("Missing verified Grow acknowledgment");
  }
  const database = await import("../server/db");
  try {
    await database.getDB();
    const { storage } = await import("../server/storage");
    await storage.reconcilePendingPaymentApproval(
      values.token, values["transaction-code"], values["grow-confirmation-reference"],
    );
    console.log("Verified Grow acknowledgment recorded. No gateway request, order or email created.");
  } finally {
    await database.pool?.end();
  }
}

main().catch(() => {
  console.error("Reconciliation failed. Check arguments and the exact payment in the store database; no automatic retry.");
  process.exitCode = 1;
});
