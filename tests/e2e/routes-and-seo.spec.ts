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
    canonical: "https://gotlandstider.se/",
    hasStructuredData: true,
  },
  {
    path: "/articles/",
    canonical: "https://gotlandstider.se/articles/",
    hasStructuredData: false,
  },
  {
    path: articlePath("host-pa-gotland-2026-fem-tips-varda-omvagen"),
    canonical:
      "https://gotlandstider.se/articles/host-pa-gotland-2026-fem-tips-varda-omvagen/",
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
    await expect(
      page.locator('link[rel="icon"][type="image/x-icon"]'),
    ).toHaveAttribute("href", "/favicon.ico");
    await expect(
      page.locator('link[rel="icon"][type="image/svg+xml"]'),
    ).toHaveAttribute("sizes", "any");
    await expect(
      page.locator('link[rel="icon"][type="image/svg+xml"]'),
    ).toHaveAttribute("href", "/favicon-v2.svg");
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      "href",
      "/apple-touch-icon.png",
    );
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      "sizes",
      "180x180",
    );

    const structuredData = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    expect(structuredData.length).toBe(testCase.hasStructuredData ? 1 : 0);
    for (const json of structuredData) {
      expect(() => JSON.parse(json)).not.toThrow();
      expect(json).toContain(
        "https://gotlandstider.se/gotlandstider-logo-512.png",
      );
    }
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

  for (const path of [
    "/favicon.ico",
    "/favicon-v2.svg",
    "/apple-touch-icon.png",
    "/gotlandstider-logo-512.png",
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()["content-type"], path).toMatch(/^image\//);
  }
});

test("sitemap and robots expose the production URL inventory", async ({
  request,
}) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect(xml).toContain("<urlset");
  const articles = await request.get("/generated/content/articles.json");
  const articlePayload = (await articles.json()) as {
    items: Array<{ updatedAt: string }>;
  };
  const latestArticleUpdate = articlePayload.items.reduce(
    (latest, article) =>
      article.updatedAt > latest ? article.updatedAt : latest,
    "2026-01-01",
  );
  for (const url of [
    "https://gotlandstider.se/",
    "https://gotlandstider.se/articles/",
  ]) {
    expect(xml).toContain(
      `<loc>${url}</loc>\n      <lastmod>${latestArticleUpdate}</lastmod>`,
    );
  }
  for (const slug of publicArticleSlugs) {
    expect(xml).toContain(`https://gotlandstider.se${articlePath(slug)}`);
  }
  for (const slug of draftArticleSlugs) {
    expect(xml).not.toContain(articlePath(slug));
  }

  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain(
    "Sitemap: https://gotlandstider.se/sitemap.xml",
  );
});
