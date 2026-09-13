import { defineConfig } from "@playwright/test";
import { loadEnv } from "vite";
import base from "./playwright.config";
import { reportSettings } from "./playwright.reports";

// Match Astro's production env loading for local runs; CI supplies its secret
// directly. Missing trusted credentials are a failure, never an empty suite.
const env = loadEnv("production", process.cwd(), "");
for (const name of [
  "SANITY_API_READ_TOKEN",
  "PUBLIC_SANITY_PROJECT_ID",
  "PUBLIC_SANITY_DATASET",
]) {
  if (process.env[name] === undefined && env[name])
    process.env[name] = env[name];
}
if (!process.env.SANITY_API_READ_TOKEN) {
  throw new Error("Sanity integration requires SANITY_API_READ_TOKEN.");
}
if (process.env.CONTENT_SOURCE !== "sanity") {
  throw new Error("Use npm run test:sanity or npm run test:sanity:full.");
}

const fullSuite = process.env.SANITY_FULL_SUITE === "1";
export default defineConfig({
  ...base,
  testDir: "./tests",
  testMatch: [
    "**/sanity/live-integration.spec.ts",
    ...(fullSuite
      ? [
          "**/sanity/full-sanity.spec.ts",
          "**/e2e/homepage.spec.ts",
          "**/e2e/json-ld-security.spec.ts",
        ]
      : []),
  ],
  testIgnore: [],
  ...reportSettings(fullSuite ? "sanity-full" : "sanity"),
});
