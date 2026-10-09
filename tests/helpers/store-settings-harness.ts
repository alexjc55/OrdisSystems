import { build } from "esbuild";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PaymentProviderName } from "../../shared/payment-provider-availability";

export type Availability = Record<PaymentProviderName, boolean>;

export const fixtureLogoUrls = [
  "https://pay.hyp.co.il/yaadpay/7.0/Images/paybyqr/logo_hyp_large.svg",
  "https://grow.business/wp-content/uploads/2023/06/grow-logo-white.svg",
  "https://allpay.to/favicon.ico",
];

// Deliberately invented credentials. Non-default values and unknown fields make
// destructive reconstruction of *any* provider's configuration detectable.
export const paymentConfigFixture = {
  active: "hyp",
  fixtureMetadata: { keep: "opaque-config-field" },
  hyp: {
    masof: "fixture-hyp-terminal", key: "fixture-hyp-key", passP: "fixture-hyp-password",
    testMode: false, j5Enabled: true, j5BufferPercent: 17, sendEmail: true,
    fixtureExtra: "keep-hyp",
  },
  grow: {
    userId: "fixture-grow-user", apiKey: "fixture-grow-key", pageCode: "fixture-grow-page",
    testMode: false, j5Enabled: true, j5BufferPercent: 23, maxInstallments: 4,
    createInvoice: true, fixtureExtra: "keep-grow",
  },
  allpay: {
    login: "fixture-allpay-login", apiKey: "fixture-allpay-key", testMode: true,
    j5Enabled: true, j5BufferPercent: 29, maxInstallments: 6, createInvoice: true,
    fixtureExtra: "keep-allpay",
  },
  payme: {
    sellerPaymeId: "fixture-payme-seller", testMode: false, j5Enabled: true,
    j5BufferPercent: 19, fixtureExtra: "keep-payme",
  },
};

export async function createStoreSettingsHarness() {
  const sourcePath = resolve("client/src/pages/admin-dashboard.tsx");
  const bundle = await build({
    stdin: {
      contents: `
        import React from "react";
        import {createRoot} from "react-dom/client";
        import {useQuery, useMutation, QueryClientProvider} from "@tanstack/react-query";
        import {StoreSettingsForm} from "./client/src/pages/admin-dashboard";
        import {queryClient, apiRequest} from "./client/src/lib/queryClient";
        import i18n from "./client/src/lib/i18n";
        const language = new URLSearchParams(location.search).get("lang");
        await i18n.changeLanguage(language);
        function Harness() {
          const settings = useQuery({queryKey:["/api/settings"]});
          const config = useQuery({queryKey:["/api/config"]});
          const save = useMutation({
            mutationFn: data => apiRequest("PUT", "/api/settings", data),
            onSuccess: data => queryClient.setQueryData(["/api/settings"], data)
          });
          window.fixtureReady = !!settings.data && !!config.data;
          window.fixtureSaving = save.isPending;
          window.fixtureSaveError = save.error?.message || null;
          return settings.data && config.data
            ? <StoreSettingsForm storeSettings={settings.data}
                onSubmit={data => save.mutate(data)} isLoading={save.isPending}
                testEmailMutation={{mutate: () => {throw new Error("Unexpected email")}}}/>
            : null;
        }
        createRoot(document.getElementById("root")).render(
          <QueryClientProvider client={queryClient}><Harness/></QueryClientProvider>);
      `,
      resolveDir: process.cwd(), loader: "tsx",
    },
    bundle: true, write: false, format: "esm", platform: "browser", jsx: "automatic",
    define: {
      "process.env.NODE_ENV": '"test"',
      "import.meta.env": JSON.stringify({ DEV: false, PROD: false, MODE: "test", BASE_URL: "/" }),
    },
    // Existing duplicate translation keys are unrelated to this regression.
    logOverride: { "duplicate-object-key": "silent" },
    alias: {
      "@": resolve("client/src"), "@shared": resolve("shared"), "@assets": resolve("attached_assets"),
    },
    loader: { ".css": "empty" },
    plugins: [{
      name: "export-real-form-only-in-test-bundle",
      setup(builder) {
        builder.onLoad({ filter: /admin-dashboard\.tsx$/ }, args => {
          if (args.path !== sourcePath) throw new Error("Unexpected admin source path");
          const source = readFileSync(args.path, "utf8");
          if (!source.includes("function StoreSettingsForm(")) throw new Error("StoreSettingsForm moved");
          return {
            // No copied JSX, schema, serializer, hooks or authentication changes.
            contents: `${source}\nexport { StoreSettingsForm };`,
            loader: "tsx", resolveDir: resolve("client/src/pages"),
          };
        });
      },
    }],
  });
  let settings: Record<string, any> = {};
  let flags: Availability = { hyp: false, grow: false, allpay: false, payme: false };
  const saves: Record<string, any>[] = [];
  const unexpectedRequests: string[] = [];
  const server = createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url!, "http://fixture.test").pathname;
      res.setHeader("content-type", "application/json");
      if (req.method === "GET" && pathname === "/bundle.js") {
        res.setHeader("content-type", "text/javascript");
        res.end(bundle.outputFiles[0].text);
      } else if (req.method === "GET" && pathname === "/") {
        res.setHeader("content-type", "text/html");
        res.end(`<!doctype html><html><body><div id="root"></div>
          <script>localStorage.setItem('language', new URLSearchParams(location.search).get('lang'));</script>
          <script type="module" src="/bundle.js"></script></body></html>`);
      } else if (req.method === "GET" && pathname === "/favicon.ico") {
        res.writeHead(204); res.end();
      } else if (req.method === "GET" && pathname === "/api/config") {
        res.end(JSON.stringify({ paymentProviders: flags }));
      } else if (req.method === "GET" && pathname === "/api/settings") {
        res.end(JSON.stringify(settings));
      } else if (req.method === "PUT" && pathname === "/api/settings") {
        let body = "";
        for await (const chunk of req) body += chunk.toString();
        const payload = JSON.parse(body);
        saves.push(payload);
        // Model the existing route's merge-on-omission contract, not its auth or
        // provider validation (those are covered by server regression tests).
        settings = { ...settings, ...payload };
        res.end(JSON.stringify(settings));
      } else {
        unexpectedRequests.push(`${req.method} ${pathname}`);
        res.writeHead(500); res.end('{"message":"Unexpected fixture request"}');
      }
    } catch (error) {
      unexpectedRequests.push(String(error));
      res.writeHead(500); res.end('{"message":"Fixture request failed"}');
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return {
    origin: `http://127.0.0.1:${(server.address() as { port: number }).port}`,
    saves, unexpectedRequests,
    get settings() { return settings; },
    setFlags(value: Availability) { flags = value; },
    reset(language: string, active: PaymentProviderName, availability: Availability) {
      flags = availability;
      saves.length = 0;
      settings = {
        id: 1, storeName: "Fixture store", storeNameEn: "Fixture store",
        storeNameHe: "Fixture store", storeNameAr: "Fixture store",
        defaultLanguage: language, enabledLanguages: ["ru", "en", "he", "ar"],
        paymentMethods: [],
        paymentProviderConfig: { ...structuredClone(paymentConfigFixture), active },
      };
    },
    close: () => new Promise<void>((resolveClose, reject) => {
      server.close(error => error ? reject(error) : resolveClose());
      server.closeAllConnections();
    }),
  };
}
