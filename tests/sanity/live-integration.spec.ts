import { expect, test } from "@playwright/test";
import GithubSlugger from "github-slugger";
import { CATEGORIES, categoryPath } from "../../src/lib/categories";
import { articlePath } from "../../src/lib/content";
import { getRawSanityInventory, type RawSanityInventory } from "./live-source";

let inventory: RawSanityInventory;

test.beforeAll(async () => {
  inventory = await getRawSanityInventory();
  expect(inventory.published.length).toBeGreaterThan(0);
});

test("generated article inventory and routes match independent published Sanity records", async ({
  request,
}) => {
  const feed = await request.get("/generated/content/articles.json");
  expect(feed.status()).toBe(200);
  const payload = (await feed.json()) as {
    items: Array<{
      slug: string;
      draft: boolean;
      coverImage: string;
    }>;
  };
  const rawSlugs = inventory.published.map((article) => article.slug);

  expect(payload.items.map((article) => article.slug)).toEqual(rawSlugs);
  expect(payload.items.every((article) => !article.draft)).toBe(true);
  for (const rawArticle of inventory.published) {
    const rendered = payload.items.find(
      (article) => article.slug === rawArticle.slug,
    );
    expect(rendered).toBeDefined();
    expect(rendered!.coverImage).toBe(
      rawArticle.coverImage ??
        `https://i.ytimg.com/vi/${rawArticle.video?.youtubeVideoId}/hqdefault.jpg`,
    );
  }

  const responses = await Promise.all(
    inventory.published.map((article) =>
      request.get(articlePath(article.slug)),
    ),
  );
  for (const response of responses)
    expect(response.status(), response.url()).toBe(200);

  const draftResponses = await Promise.all(
    inventory.draftIds.map((id) =>
      request.get(articlePath(id.replace(/^drafts\./, ""))),
    ),
  );
  for (const response of draftResponses)
    expect(response.status(), response.url()).toBe(404);
});

test("category pages preserve raw Sanity membership and empty-category noindex behavior", async ({
  page,
}) => {
  for (const category of CATEGORIES) {
    const expected = inventory.published
      .filter((article) => article.primaryTag === category.tag)
      .map((article) => articlePath(article.slug));
    await page.goto(categoryPath(category.slug));

    const actual = await page
      .locator('[data-category-page] a[href^="/artiklar/"]')
      .evaluateAll((links) =>
        links
          .map((link) => (link as HTMLAnchorElement).getAttribute("href"))
          .filter((href): href is string => Boolean(href)),
      );
    expect(actual).toEqual(expected);
    if (expected.length === 0) {
      await expect(page.locator("[data-category-empty]")).toBeVisible();
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        "noindex, follow",
      );
    } else {
      await expect(page.locator("[data-category-empty]")).toHaveCount(0);
      await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    }
  }
});

test("representative live article renders raw headings, links, canonical data, cover and video", async ({
  page,
}) => {
  const article = inventory.published.find((candidate) =>
    portableTextContract(candidate.body),
  );
  expect(
    article,
    "A published article with a Portable Text heading and link is required",
  ).toBeDefined();
  const contract = portableTextContract(article!.body)!;

  await page.goto(articlePath(article!.slug));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    article!.title,
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `https://gotlandstider.se${articlePath(article!.slug)}`,
  );
  for (const heading of contract.headings) {
    await expect(page.locator(`#${heading.id}`)).toHaveText(heading.text);
  }
  const renderedHrefs = await page
    .locator(".article-body a")
    .evaluateAll((links) =>
      links.map((link) => (link as HTMLAnchorElement).href),
    );
  for (const href of contract.hrefs) {
    expect(renderedHrefs).toContain(href);
  }

  if (article!.coverImage)
    await expect(page.locator(".article-media img")).toHaveAttribute(
      "src",
      article!.coverImage,
    );
  const video = inventory.published.find((candidate) => candidate.video);
  expect(
    video,
    "A published video article is required for the privacy-player contract",
  ).toBeDefined();
  await page.goto(articlePath(video!.slug));
  await expect(page.locator("iframe")).toHaveAttribute(
    "src",
    `https://www.youtube-nocookie.com/embed/${video!.video!.youtubeVideoId}`,
  );
});

test("sitemap and llms inventory exclude raw noindex articles and drafts", async ({
  request,
}) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  const llms = await (await request.get("/llms.txt")).text();
  for (const article of inventory.published) {
    const path = articlePath(article.slug);
    expect(sitemap.includes(path)).toBe(!article.noIndex);
    expect(llms.includes(path)).toBe(!article.noIndex);
  }
  for (const id of inventory.draftIds) {
    const path = articlePath(id.replace(/^drafts\./, ""));
    expect(sitemap).not.toContain(path);
    expect(llms).not.toContain(path);
  }
});

function portableTextContract(body: unknown[]) {
  const slugger = new GithubSlugger();
  const headings: Array<{ id: string; text: string }> = [];
  const hrefs: string[] = [];
  for (const value of body) {
    if (!isRecord(value) || value._type !== "block") continue;
    const children = Array.isArray(value.children) ? value.children : [];
    const text = children
      .filter(isRecord)
      .map((child) => (typeof child.text === "string" ? child.text : ""))
      .join("");
    if ((value.style === "h2" || value.style === "h3") && text)
      headings.push({ id: slugger.slug(text), text });
    const definitions = Array.isArray(value.markDefs)
      ? value.markDefs.filter(isRecord)
      : [];
    for (const definition of definitions)
      if (typeof definition.href === "string") hrefs.push(definition.href);
  }
  return headings.length > 0 && hrefs.length > 0
    ? { headings, hrefs }
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
