import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));

function config(name: string) {
  const filename = path.join(root, name);
  const read = ts.readConfigFile(filename, ts.sys.readFile);
  assert.equal(read.error, undefined);
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, root);
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.options.strict, true);
  assert.equal(parsed.options.noEmit, true);
  return parsed;
}

test("app and test/script roots are checked independently with strict types", () => {
  const app = config("tsconfig.json");
  const tests = config("tsconfig.tests.json");
  const isTooling = (filename: string) => {
    const relative = path.relative(root, filename).split(path.sep).join("/");
    return /^(tests|scripts)\//.test(relative) || /\.test\.tsx?$/.test(relative);
  };
  assert.ok(app.fileNames.length > 0);
  assert.ok(app.fileNames.every(filename => !isTooling(filename)));
  assert.ok(tests.fileNames.every(isTooling));
  assert.ok(tests.fileNames.includes(path.join(root, "tests/user-security.test.ts")));
  assert.ok(tests.fileNames.includes(path.join(root, "scripts/bootstrap-admin.ts")));
  assert.equal(tests.options.incremental, false);
});

test("check:tests exits nonzero for type errors in both tests and scripts", () => {
  // TypeScript's glob expansion ignores hidden directories.
  const testDir = mkdtempSync(path.join(root, "tests/typecheck-fixture-"));
  const scriptDir = mkdtempSync(path.join(root, "scripts/typecheck-fixture-"));
  try {
    const testFile = path.join(testDir, "invalid.test.ts");
    const scriptFile = path.join(scriptDir, "invalid.ts");
    for (const filename of [testFile, scriptFile]) {
      writeFileSync(filename, 'export const invalid: string = 123;\n');
    }
    const app = config("tsconfig.json");
    assert.ok(!app.fileNames.includes(testFile));
    assert.ok(!app.fileNames.includes(scriptFile));
    const tooling = config("tsconfig.tests.json");
    assert.ok(tooling.fileNames.includes(testFile));
    assert.ok(tooling.fileNames.includes(scriptFile));

    const result = spawnSync("npm", ["run", "check:tests", "--", "--pretty", "false"], {
      cwd: root,
      encoding: "utf8",
      timeout: 120_000,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.ok(result.status !== null && result.status !== 0);
    const output = result.stdout + result.stderr;
    for (const filename of [testFile, scriptFile]) {
      assert.ok(output.includes(`${path.relative(root, filename)}(1,14): error TS2322`), output);
    }
  } finally {
    rmSync(testDir, { recursive: true, force: true });
    rmSync(scriptDir, { recursive: true, force: true });
  }
});
