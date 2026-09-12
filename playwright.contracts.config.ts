import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
import { reportSettings } from "./playwright.reports";

export default defineConfig({
  ...base,
  testDir: "./tests",
  testMatch: ["**/contracts/**/*.spec.ts", "**/e2e/canonical-video.spec.ts"],
  testIgnore: [],
  webServer: undefined,
  ...reportSettings("contracts"),
});
