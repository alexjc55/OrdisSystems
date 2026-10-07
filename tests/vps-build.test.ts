import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync,
  rmSync, symlinkSync, writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));

for (const fail of [false, true]) {
  test(`VPS check ${fail ? "propagates plugin failure" : "builds with the VPS config"} and cleans up without touching live files`, () => {
    // Exercise real Vite in a disposable project, never mutate the real config.
    const fixture = mkdtempSync(path.join(os.tmpdir(), "vps-check fixture-"));
    try {
      for (const directory of ["scripts", "client", "dist/public", "uploads", "temporary output"]) {
        mkdirSync(path.join(fixture, directory), { recursive: true });
      }
      copyFileSync(path.join(root, "scripts/check-vps-build.sh"),
        path.join(fixture, "scripts/check-vps-build.sh"));
      symlinkSync(path.join(root, "node_modules"), path.join(fixture, "node_modules"), "dir");
      writeFileSync(path.join(fixture, "package.json"), '{"type":"module"}');
      writeFileSync(path.join(fixture, "client/index.html"), "<html><body>VPS build fixture</body></html>");
      // The default config must not be used by this command.
      writeFileSync(path.join(fixture, "vite.config.ts"), 'throw new Error("Wrong config");');
      const protectedFiles = ["dist/public/index.html", "dist/index.js", "uploads/store-data", ".env"];
      for (const filename of protectedFiles) {
        writeFileSync(path.join(fixture, filename), `keep ${filename}`);
      }
      writeFileSync(path.join(fixture, "vite.config.vps.ts"), `
        import { defineConfig } from "vite";
        import path from "node:path";
        import { mkdirSync, writeFileSync } from "node:fs";
        export default defineConfig({
          root: path.resolve(import.meta.dirname, "client"),
          build: { outDir: path.resolve(import.meta.dirname, "dist/public"), emptyOutDir: true },
          plugins: [{
            name: "verify-isolated-output",
            configResolved(config) {
              if (!config.build.outDir.startsWith(process.env.TMPDIR + path.sep)) {
                throw new Error("Build output was not redirected");
              }
              const cache = path.join(process.env.TMPDIR, "plugin-cache");
              mkdirSync(cache, { recursive: true });
              writeFileSync(path.join(cache, "artifact"), "temporary plugin cache");
            },
            generateBundle() {
              ${fail ? 'throw new Error("Intentional VPS plugin failure");' : ""}
            }
          }]
        });
      `);
      const env: NodeJS.ProcessEnv & { TMPDIR: string } = {
        ...process.env, TMPDIR: path.join(fixture, "temporary output"),
      };
      delete env.DATABASE_URL;
      delete env.NEON_DATABASE_URL;
      const result = spawnSync("bash", [path.join(fixture, "scripts/check-vps-build.sh")], {
        cwd: os.tmpdir(),
        env,
        encoding: "utf8",
        timeout: 120_000,
      });
      assert.equal(result.error, undefined);
      assert.equal(result.signal, null);
      if (fail) {
        assert.ok(result.status !== null && result.status !== 0);
        assert.match(result.stdout + result.stderr, /Intentional VPS plugin failure/);
      } else {
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.match(result.stdout, /index\.html/);
      }
      assert.deepEqual(readdirSync(env.TMPDIR), []);
      for (const filename of protectedFiles) {
        assert.equal(readFileSync(path.join(fixture, filename), "utf8"), `keep ${filename}`);
      }
      assert.deepEqual(readdirSync(path.join(fixture, "dist")).sort(), ["index.js", "public"]);
      assert.deepEqual(readdirSync(path.join(fixture, "dist/public")), ["index.html"]);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });
}

test("VPS validation is separate from deployment and the default build", () => {
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  assert.equal(pkg.scripts["check:vps"], "bash scripts/check-vps-build.sh");
  assert.ok(!pkg.scripts.build.includes("check:vps"));
  for (const filename of ["deploy.sh", "scripts/post-merge.sh"]) {
    assert.ok(!readFileSync(path.join(root, filename), "utf8").includes("check:vps"));
  }
});
