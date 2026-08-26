import { expect, test, type Page } from "@playwright/test";
import { articlePath } from "./fixtures";

const representativePages = [
  "/",
  "/articles/",
  articlePath("host-pa-gotland-2026-fem-tips-varda-omvagen"),
  articlePath("arets-loppis-favoriter"),
];

async function collectSameOriginUrls(page: Page) {
  return page
    .locator("a[href], img[src], source[src]")
    .evaluateAll((elements) => {
      const currentOrigin = window.location.origin;
      const urls = new Set<string>();

      for (const element of elements) {
        const raw = element.getAttribute("href") ?? element.getAttribute("src");
        if (!raw || raw.startsWith("#")) continue;

        const url = new URL(raw, window.location.href);
        if (url.origin !== currentOrigin) continue;
        url.hash = "";
        urls.add(url.href);
      }

      return [...urls];
    });
}

test("representative pages have no broken same-origin links or assets", async ({
  page,
  request,
}) => {
  const urls = new Set<string>();

  for (const path of representativePages) {
    await page.goto(path);
    for (const url of await collectSameOriginUrls(page)) urls.add(url);
  }

  const results = await Promise.all(
    [...urls].map(async (url) => ({ url, response: await request.get(url) })),
  );

  for (const { url, response } of results) {
    expect(response.status(), url).toBeLessThan(400);
  }
});
