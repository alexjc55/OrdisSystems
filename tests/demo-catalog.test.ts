import assert from "node:assert/strict";
import { test } from "node:test";
import { isDemoCatalogEnabled } from "../server/lib/demo-catalog";

test("demo catalog remains enabled when the setting is absent", () => {
  assert.equal(isDemoCatalogEnabled({}), true);
});

for (const value of ["true", "1", " TRUE "]) {
  test(`explicit enabled value ${JSON.stringify(value)}`, () => {
    assert.equal(isDemoCatalogEnabled({ SEED_DEMO_CATALOG: value }), true);
  });
}

for (const value of ["false", "0", " FALSE "]) {
  test(`explicit disabled value ${JSON.stringify(value)}`, () => {
    assert.equal(isDemoCatalogEnabled({ SEED_DEMO_CATALOG: value }), false);
  });
}

for (const value of ["", "yes", "no", "secret-looking-invalid-input"]) {
  test(`invalid setting ${JSON.stringify(value)} fails without echoing its value`, () => {
    assert.throws(
      () => isDemoCatalogEnabled({ SEED_DEMO_CATALOG: value }),
      { message: "SEED_DEMO_CATALOG must be true, false, 1 or 0" },
    );
  });
}
