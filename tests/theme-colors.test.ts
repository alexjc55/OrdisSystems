import assert from "node:assert/strict";
import { test } from "node:test";
import { getTableColumns } from "drizzle-orm";
import { themes } from "../shared/schema";

test("every theme string default fits its PostgreSQL varchar column", () => {
  for (const column of Object.values(getTableColumns(themes))) {
    if (typeof column.default !== "string") continue;
    const match = /^varchar\((\d+)\)$/.exec(column.getSQLType());
    if (!match) continue;
    assert.ok(column.default.length <= Number(match[1]),
      `${column.name}: ${column.default.length} characters exceed ${match[1]}`);
  }
});
