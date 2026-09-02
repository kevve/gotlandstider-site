import sanity from "@sanity/astro";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { loadEnv } from "vite";

const isGitHubPreview = process.env.DEPLOY_TARGET === "github-pages-preview";
const env = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");
const projectId = env.PUBLIC_SANITY_PROJECT_ID || "th4gij3b";
const dataset = env.PUBLIC_SANITY_DATASET || "production";
const sanityReadToken = env.SANITY_API_READ_TOKEN;
const contentSource =
  process.env.CONTENT_SOURCE || env.CONTENT_SOURCE || "sanity";

if (!new Set(["sanity", "markdown"]).has(contentSource)) {
  throw new Error(
    `Unsupported CONTENT_SOURCE=${contentSource}. Use "sanity" or "markdown".`,
  );
}

if (contentSource === "sanity" && !sanityReadToken) {
  throw new Error(
    "CONTENT_SOURCE=sanity requires the server-only SANITY_API_READ_TOKEN environment variable.",
  );
}

export default defineConfig({
  output: "static",
  site: isGitHubPreview
    ? "https://kevve.github.io"
    : "https://gotlandstider.se",
  base: isGitHubPreview ? "/gotlandstider-site" : "/",
  trailingSlash: "always",
  integrations: [
    sanity({
      projectId,
      dataset,
      apiVersion: "2026-08-26",
      useCdn: false,
      perspective: "published",
      ...(sanityReadToken ? { token: sanityReadToken } : {}),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
