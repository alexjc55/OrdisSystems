import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const buildFiles = [
  "vite.config.ts",
  "vite.config.vps.ts",
  "vite-plugin-sw-version.ts",
  "drizzle.config.ts",
  "tailwind.config.ts",
];

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

test("build configuration roots have their own strict check wired into npm run check", () => {
  const build = config("tsconfig.build.json");
  assert.deepEqual(build.fileNames.sort(), buildFiles.map(name => path.join(root, name)).sort());
  assert.equal(build.options.incremental, false);
  for (const name of ["tsconfig.json", "tsconfig.tests.json"]) {
    const other = config(name);
    assert.ok(build.fileNames.every(filename => !other.fileNames.includes(filename)));
  }
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  assert.equal(pkg.scripts["check:build"], "tsc -p tsconfig.build.json");
  assert.equal(pkg.scripts.check, "npm run check:app && npm run check:tests && npm run check:build");
});

test("check:build is static without database settings and rejects errors in every build root", () => {
  // Use isolated copies: never modify real build configurations or their side-effectful files.
  const fixtureDir = mkdtempSync(path.join(root, ".typecheck-build-"));
  try {
    const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
    writeFileSync(path.join(fixtureDir, "package.json"), JSON.stringify({
      type: "module",
      scripts: { "check:build": pkg.scripts["check:build"] },
    }));
    writeFileSync(path.join(fixtureDir, "tsconfig.build.json"), JSON.stringify({
      extends: path.join(root, "tsconfig.build.json"),
      files: buildFiles,
      include: [],
    }));
    for (const name of buildFiles) {
      writeFileSync(path.join(fixtureDir, name),
        readFileSync(path.join(root, name), "utf8") +
        '\nthrow new Error("Build configurations must never execute during type checking");\n');
    }
    const env = { ...process.env };
    delete env.DATABASE_URL;
    delete env.NEON_DATABASE_URL;
    const run = () => spawnSync("npm", ["run", "check:build", "--", "--pretty", "false"], {
      cwd: fixtureDir,
      env,
      encoding: "utf8",
      timeout: 120_000,
    });
    const valid = run();
    assert.equal(valid.error, undefined);
    assert.equal(valid.signal, null);
    assert.equal(valid.status, 0, valid.stdout + valid.stderr);

    for (const name of buildFiles) {
      const filename = path.join(fixtureDir, name);
      writeFileSync(filename, readFileSync(filename, "utf8") +
        "\nexport const buildTypecheckInvalid: string = 123;\n");
    }
    const invalid = run();
    assert.equal(invalid.error, undefined);
    assert.equal(invalid.signal, null);
    assert.ok(invalid.status !== null && invalid.status !== 0);
    const output = invalid.stdout + invalid.stderr;
    for (const name of buildFiles) {
      assert.match(output, new RegExp(`${name.replaceAll(".", "\\.")}\\(\\d+,14\\): error TS2322`));
    }
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
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
