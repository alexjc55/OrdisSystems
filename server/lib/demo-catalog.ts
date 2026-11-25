/** Existing installations retain demo seeding unless explicitly disabled. */
export function isDemoCatalogEnabled(environment: NodeJS.ProcessEnv = process.env): boolean {
  const value = environment.SEED_DEMO_CATALOG;
  if (value === undefined) return true;
  switch (value.trim().toLowerCase()) {
    case "true":
    case "1": return true;
    case "false":
    case "0": return false;
    default: throw new Error("SEED_DEMO_CATALOG must be true, false, 1 or 0");
  }
}
