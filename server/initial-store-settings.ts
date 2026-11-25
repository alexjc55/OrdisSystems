import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { storeSettings } from "@shared/schema";
import type { getDB } from "./db";

type SettingsDatabase = Pick<Awaited<ReturnType<typeof getDB>>, "transaction">;

export function initialStoreName(environment: NodeJS.ProcessEnv = process.env): string {
  // A new store gets its own configured hostname, never another shop's name.
  try {
    const origin = new URL(environment.REPLIT_APP_URL || "");
    if (["https:", "http:"].includes(origin.protocol) && origin.hostname) {
      return origin.hostname.slice(0, 255);
    }
  } catch {}
  return "Ordis";
}

/** Initialize only an absent settings row. Never seed catalog or user records. */
export async function ensureInitialStoreSettings(
  db: SettingsDatabase, environment: NodeJS.ProcessEnv = process.env,
): Promise<boolean> {
  return db.transaction(async tx => {
    await tx.execute(sql`SET LOCAL lock_timeout = '10s'`);
    // Serialize competing startups without adding a schema constraint or migration.
    await tx.execute(sql`LOCK TABLE store_settings IN SHARE ROW EXCLUSIVE MODE`);
    const [existing] = await tx.select({ id: storeSettings.id }).from(storeSettings).limit(1);
    if (existing) return false;
    const name = initialStoreName(environment);
    await tx.insert(storeSettings).values({
      storeName: name,
      authPageTitle: name,
      authPageSubtitle: "",
      authPageFeature1: "",
      authPageFeature2: "",
      authPageFeature3: "",
      workingHours: {},
      paymentMethods: [],
      cancellationReasons: [],
      paymentProviderConfig: { active: "none" },
      feedToken: randomUUID(),
    });
    return true;
  });
}
