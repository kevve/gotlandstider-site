import sanity from "@sanity/astro";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { loadEnv } from "vite";

const isGitHubPreview = process.env.DEPLOY_TARGET === "github-pages-preview";
const env = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");
const projectId = env.PUBLIC_SANITY_PROJECT_ID || "th4gij3b";
const dataset = env.PUBLIC_SANITY_DATASET || "production";

export default defineConfig({
  output: "static",
  site: isGitHubPreview
    ? "https://kevve.github.io"
    : "https://www.gotlandstider.se",
  base: isGitHubPreview ? "/gotlandstider-site" : "/",
  trailingSlash: "always",
  integrations: [
    sanity({
      projectId,
      dataset,
      apiVersion: "2026-08-26",
      useCdn: false,
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
