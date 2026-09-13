import { expect, test as base } from "@playwright/test";

const youtubeEmbedPattern = "https://www.youtube-nocookie.com/embed/*" as const;
const youtubeEmbedHtml =
  '<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body></body></html>';

export const test = base.extend({
  // This is deliberately an ordinary (non-auto) fixture. Page and context
  // tests request it through Playwright's dependency graph, while request-only
  // and pure tests do not create a browser just to install this route.
  context: async ({ context }, use) => {
    await context.route(youtubeEmbedPattern, async (route) => {
      if (route.request().resourceType() !== "document") {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: youtubeEmbedHtml,
      });
    });
    await use(context);
  },
});

export { expect };
