import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

const isGitHubPreview = process.env.DEPLOY_TARGET === "github-pages-preview";

export default defineConfig({
  output: "static",
  site: isGitHubPreview
    ? "https://kevve.github.io"
    : "https://www.gotlandstider.se",
  base: isGitHubPreview ? "/gotlandstider-site" : "/",
  trailingSlash: "always",
  vite: {
    plugins: [tailwindcss()],
  },
});
