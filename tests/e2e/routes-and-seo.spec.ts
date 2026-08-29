import { expect, test } from "@playwright/test";
import { articlePath, draftArticleSlugs, publicArticleSlugs } from "./fixtures";

test("all 16 public article routes build and draft routes stay private", async ({
  request,
}) => {
  const publicResponses = await Promise.all(
    publicArticleSlugs.map((slug) => request.get(articlePath(slug))),
  );
  for (const response of publicResponses) {
    expect(response.status(), response.url()).toBe(200);
  }

  const draftResponses = await Promise.all(
    draftArticleSlugs.map((slug) => request.get(articlePath(slug))),
  );
  for (const response of draftResponses) {
    expect(response.status(), response.url()).toBe(404);
  }
});

for (const testCase of [
  {
    path: "/",
    canonical: "https://www.gotlandstider.se/",
    hasStructuredData: true,
  },
  {
    path: "/articles/",
    canonical: "https://www.gotlandstider.se/articles/",
    hasStructuredData: false,
  },
  {
    path: articlePath("host-pa-gotland-2026-fem-tips-varda-omvagen"),
    canonical:
      "https://www.gotlandstider.se/articles/host-pa-gotland-2026-fem-tips-varda-omvagen/",
    hasStructuredData: true,
  },
]) {
  test(`${testCase.path} has the essential Swedish SEO contract`, async ({
    page,
  }) => {
    await page.goto(testCase.path);

    await expect(page.locator("html")).toHaveAttribute("lang", "sv");
    await expect(page).toHaveTitle(/Gotlandstider/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /^.{20,}$/,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      testCase.canonical,
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      /\S+/,
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      "content",
      testCase.canonical,
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      /summary/,
    );

    const structuredData = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    expect(structuredData.length).toBe(testCase.hasStructuredData ? 1 : 0);
    for (const json of structuredData)
      expect(() => JSON.parse(json)).not.toThrow();
  });
}

test("content feeds and discovery resources remain public", async ({
  request,
}) => {
  const articles = await request.get("/generated/content/articles.json");
  expect(articles.status()).toBe(200);
  expect(articles.headers()["content-type"]).toContain("application/json");
  const articlePayload = await articles.json();
  expect(articlePayload.items.length).toBeGreaterThan(0);
  if (process.env.CONTENT_SOURCE !== "sanity")
    expect(articlePayload.items).toHaveLength(16);
  expect(
    articlePayload.items.every((item: { draft: boolean }) => !item.draft),
  ).toBe(true);
  expect(
    articlePayload.items.every(
      (item: {
        coverImage: string;
        heroImage?: unknown;
        video?: { thumbnail?: unknown };
      }) =>
        typeof item.coverImage === "string" &&
        item.heroImage === undefined &&
        (!item.video || item.video.thumbnail === undefined),
    ),
  ).toBe(true);

  for (const path of [
    "/generated/content/featured.json",
    "/generated/content/homepage.json",
    "/.well-known/api-catalog",
    "/agent/openapi.json",
    "/agent/site.jsonld",
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    const body = await response.text();
    expect(() => JSON.parse(body), path).not.toThrow();
  }

  expect((await request.get("/agent/docs/")).status()).toBe(200);
});

test("sitemap and robots expose the production URL inventory", async ({
  request,
}) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect(xml).toContain("<urlset");
  for (const slug of publicArticleSlugs) {
    expect(xml).toContain(`https://www.gotlandstider.se${articlePath(slug)}`);
  }
  for (const slug of draftArticleSlugs) {
    expect(xml).not.toContain(articlePath(slug));
  }

  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain(
    "Sitemap: https://www.gotlandstider.se/sitemap.xml",
  );
});
