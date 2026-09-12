import GithubSlugger from "github-slugger";
import type { APIRequestContext } from "@playwright/test";
import { CATEGORIES, categoryPath } from "../../src/lib/categories";
import { LEGACY_ARTICLE_SLUG_MAP } from "../../src/lib/redirects";
import { expect, test } from "../e2e/browser-fixture";
import { articlePath } from "../e2e/fixtures";
import { attr, decodeEntities, elements, parse, text } from "../support/html";
import {
  getRawSanityInventory,
  type RawSanityArticle,
  type RawSanityInventory,
} from "./live-source";

let inventory: RawSanityInventory;
const absolute = (path: string) =>
  new URL(path, "https://gotlandstider.se").href;
const cover = (article: RawSanityArticle) =>
  article.coverImage ||
  `https://i.ytimg.com/vi/${article.video!.youtubeVideoId}/hqdefault.jpg`;
const embed = (article: RawSanityArticle) =>
  `https://www.youtube-nocookie.com/embed/${article.video!.youtubeVideoId}`;

test.beforeAll(async () => {
  inventory = await getRawSanityInventory();
  expect(inventory.published.length).toBeGreaterThan(0);
  expect(new Set(inventory.published.map((article) => article.slug)).size).toBe(
    inventory.published.length,
  );
  for (const article of inventory.published) {
    expect(article._id).not.toMatch(/^(drafts|versions)\./);
    expect(article.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(article.coverImage || article.video?.youtubeVideoId).toBeTruthy();
  }
});

test("all three feeds preserve independent Sanity inventory, cover, location and video projections", async ({
  request,
}) => {
  const articles = await json<{ items: FeedArticle[] }>(
    request,
    "/generated/content/articles.json",
  );
  expect(articles.items.map((article) => article.slug)).toEqual(
    inventory.published.map((article) => article.slug),
  );
  for (const raw of inventory.published) {
    const actual = articles.items.find((article) => article.slug === raw.slug)!;
    expect(actual).toMatchObject({
      title: raw.title,
      slug: raw.slug,
      excerpt: raw.excerpt,
      publishedAt: raw.publishedAt,
      updatedAt: raw.updatedAt,
      primaryTag: raw.primaryTag,
      qualifierTag: raw.qualifierTag,
      featured: raw.featured ?? false,
      draft: false,
      coverImage: cover(raw),
      locations: raw.locations,
      urlPath: articlePath(raw.slug),
    });
    expect(actual).not.toHaveProperty("heroImage");
    expect(actual.video).toEqual(raw.video ?? undefined);
    if (actual.video) expect(actual.video).not.toHaveProperty("thumbnail");
  }
  const rawFeatured = inventory.published.filter((article) => article.featured);
  expect(rawFeatured).toHaveLength(1);
  const featured = await json<{ articles: FeedArticle[] }>(
    request,
    "/generated/content/featured.json",
  );
  expect(featured.articles).toEqual(
    articles.items.filter((article) => article.featured),
  );
  const raw = rawFeatured[0];
  expect(raw.video).not.toBeNull();
  const homepage = await json<{
    featuredVideo: Record<string, unknown>;
    archiveCandidates: Array<{
      slug: string;
      cardImage: string;
      badge: string;
    }>;
  }>(request, "/generated/content/homepage.json");
  expect(homepage.featuredVideo).toMatchObject({
    slug: raw.slug,
    title: raw.title,
    excerpt: raw.excerpt,
    thumbnail: cover(raw),
    youtubeVideoId: raw.video!.youtubeVideoId,
    uploadDate: raw.video!.uploadDate,
    socialLinks: raw.video!.socialLinks,
    featured: true,
    draft: false,
    urlPath: articlePath(raw.slug),
  });
  const expectedArchive = inventory.published.filter(
    (article) => !article.featured,
  );
  expect(homepage.archiveCandidates.map((article) => article.slug)).toEqual(
    expectedArchive.map((article) => article.slug),
  );
  for (const article of expectedArchive) {
    expect(
      homepage.archiveCandidates.find((item) => item.slug === article.slug),
    ).toMatchObject({
      cardImage: cover(article),
      badge: article.primaryTag,
    });
  }
});

test("every published route preserves canonical, JSON-LD and media contracts while draft-only routes stay private", async ({
  request,
}) => {
  // Include redirect targets once even if they also occur in the live inventory.
  const paths = new Set([
    ...inventory.published.map((article) => articlePath(article.slug)),
    ...Object.values(LEGACY_ARTICLE_SLUG_MAP).map(articlePath),
  ]);
  for (const path of paths) {
    const document = parse(await resource(request, path));
    const article = inventory.published.find(
      (item) => articlePath(item.slug) === path,
    );
    expect(
      article,
      `${path} must also be in the raw published inventory`,
    ).toBeDefined();
    const raw = article!;
    expect(elements(document, "h1").map(text)).toEqual([raw.title]);
    expect(
      elements(document, "link")
        .filter((node) => attr(node, "rel") === "canonical")
        .map((node) => attr(node, "href")),
    ).toEqual([absolute(path)]);
    const meta = elements(document, "meta");
    expect(
      meta
        .find((node) => attr(node, "property") === "og:image")
        ?.attrs.find((item) => item.name === "content")?.value,
    ).toBe(absolute(raw.seo.image || cover(raw)));
    const robots = meta
      .filter((node) => attr(node, "name") === "robots")
      .map((node) => attr(node, "content"));
    expect(robots).toEqual(raw.noIndex ? ["noindex, follow"] : []);
    const scripts = elements(document, "script").filter(
      (node) => attr(node, "type") === "application/ld+json",
    );
    expect(scripts).toHaveLength(1);
    const graph = JSON.parse(text(scripts[0]))["@graph"] as Array<
      Record<string, unknown>
    >;
    expect(graph.filter((node) => node["@type"] === "Article")).toEqual([
      expect.objectContaining({
        headline: raw.title,
        description: raw.excerpt,
        datePublished: raw.publishedAt,
        dateModified: raw.updatedAt,
        mainEntityOfPage: absolute(path),
        image: absolute(raw.seo.image || cover(raw)),
      }),
    ]);
    const videos = graph.filter((node) => node["@type"] === "VideoObject");
    const frames = elements(document, "iframe");
    if (raw.video) {
      expect(frames.map((node) => attr(node, "src"))).toEqual([embed(raw)]);
      expect(videos).toEqual([
        expect.objectContaining({
          embedUrl: embed(raw),
          uploadDate: raw.video.uploadDate,
          thumbnailUrl: absolute(cover(raw)),
        }),
      ]);
      expect(videos[0]).not.toHaveProperty("contentUrl");
    } else {
      expect(frames).toHaveLength(0);
      expect(videos).toHaveLength(0);
      expect(
        elements(document, "img").some(
          (node) => attr(node, "src") === cover(raw),
        ),
      ).toBe(true);
    }
  }
  const privatePaths = new Set(
    inventory.drafts
      .filter(
        (draft) =>
          draft.slug &&
          !inventory.published.some((article) => article.slug === draft.slug),
      )
      .map((draft) => articlePath(draft.slug!)),
  );
  // Retain mapped legacy paths and unchanged legacy slugs; neither is emitted.
  for (const slug of [
    ...Object.keys(LEGACY_ARTICLE_SLUG_MAP),
    ...inventory.published.map((article) => article.slug),
  ])
    privatePaths.add(`/articles/${slug}/`);
  for (const path of privatePaths)
    expect((await request.get(path)).status(), path).toBe(404);
});

test("archive and category cards match raw inventory including uniqueness and empty-category SEO", async ({
  request,
}) => {
  for (const item of [
    { path: "/artiklar/", articles: inventory.published, category: false },
    ...CATEGORIES.map((category) => ({
      path: categoryPath(category.slug),
      articles: inventory.published.filter(
        (article) => article.primaryTag === category.tag,
      ),
      category: true,
    })),
  ]) {
    const document = parse(await resource(request, item.path));
    const cards = elements(document).filter((node) =>
      (attr(node, "class") || "").split(/\s+/).includes("article-card"),
    );
    const links = cards.flatMap((card) =>
      elements(card, "a").map((link) => attr(link, "href")),
    );
    expect(links, item.path).toEqual(
      item.articles.map((article) => articlePath(article.slug)),
    );
    expect(new Set(links).size).toBe(links.length);
    expect(
      elements(document, "link")
        .filter((node) => attr(node, "rel") === "canonical")
        .map((node) => attr(node, "href")),
    ).toEqual([absolute(item.path)]);
    const empty = item.category && item.articles.length === 0;
    expect(
      elements(document).some(
        (node) => attr(node, "data-category-empty") !== undefined,
      ),
    ).toBe(empty);
    expect(
      elements(document, "meta")
        .filter((node) => attr(node, "name") === "robots")
        .map((node) => attr(node, "content")),
    ).toEqual(empty ? ["noindex, follow"] : []);
    for (let index = 0; index < cards.length; index++) {
      expect(attr(cards[index], "data-primary-tag")).toBe(
        item.articles[index].primaryTag,
      );
      expect(
        elements(cards[index], "img").map((node) => attr(node, "src")),
      ).toContain(cover(item.articles[index]));
    }
  }
});

test("representative Sanity article renders Portable Text, source headings and links in the browser", async ({
  page,
}) => {
  const article = inventory.published.find(
    (item) => item.video && Array.isArray(item.body) && item.body.length > 0,
  );
  expect(
    article,
    "The featured-video source must include a rendered article body",
  ).toBeDefined();
  await page.goto(articlePath(article!.slug));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    article!.title,
  );
  const body = page.locator(".article-body");
  await expect(body).toBeVisible();
  await expect(body).not.toHaveText("");
  const contract = portableTextContract(article!.body);
  expect(contract.paragraphs.length).toBeGreaterThan(0);
  for (const paragraph of contract.paragraphs)
    await expect(body).toContainText(paragraph);
  for (const heading of contract.headings)
    await expect(body.locator(`[id=${JSON.stringify(heading.id)}]`)).toHaveText(
      heading.text,
    );
  for (const href of contract.hrefs)
    await expect(
      body.locator(`a[href=${JSON.stringify(href)}]`).first(),
    ).toBeAttached();
  await expect(page.locator(".article-media iframe")).toHaveAttribute(
    "src",
    embed(article!),
  );
});

test("sitemap, video metadata and discovery resources match the independent indexable inventory", async ({
  request,
}) => {
  const sitemap = await resource(request, "/sitemap.xml");
  expect(sitemap).toContain("<urlset");
  const entries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(
    (match) => match[1],
  );
  const indexable = inventory.published.filter((article) => !article.noIndex);
  const populatedCategories = CATEGORIES.filter((category) =>
    inventory.published.some((article) => article.primaryTag === category.tag),
  );
  const expectedUrls = [
    "/",
    "/artiklar/",
    "/kategorier/",
    ...populatedCategories.map((category) => categoryPath(category.slug)),
    ...indexable.map((article) => articlePath(article.slug)),
  ].map(absolute);
  expect(entries.map((entry) => xmlText(entry, "loc")).sort()).toEqual(
    expectedUrls.sort(),
  );
  for (const article of indexable) {
    const entry = entries.find(
      (entry) => xmlText(entry, "loc") === absolute(articlePath(article.slug)),
    )!;
    expect(xmlText(entry, "lastmod")).toBe(article.sitemapLastModified);
    if (article.video) {
      expect(xmlText(entry, "video:player_loc")).toBe(embed(article));
      expect(xmlText(entry, "video:publication_date")).toBe(
        article.video.uploadDate,
      );
      expect(xmlText(entry, "video:thumbnail_loc")).toBe(
        absolute(cover(article)),
      );
      expect(entry).not.toContain("<video:content_loc>");
    } else expect(entry).not.toContain("<video:video>");
  }
  const latest = indexable
    .map((article) => article.sitemapLastModified)
    .sort()
    .at(-1);
  expect(latest).toBeDefined();
  for (const path of ["/", "/artiklar/"])
    expect(
      xmlText(
        entries.find((entry) => xmlText(entry, "loc") === absolute(path))!,
        "lastmod",
      ),
    ).toBe(latest);
  const llms = await resource(request, "/llms.txt");
  const articleUrls = [
    ...llms.matchAll(
      /\]\((https:\/\/gotlandstider\.se\/artiklar\/[^/)]+\/)\)/g,
    ),
  ].map((match) => match[1]);
  expect(articleUrls.sort()).toEqual(
    indexable.map((article) => absolute(articlePath(article.slug))).sort(),
  );
  expect(await resource(request, "/robots.txt")).toContain(
    "Sitemap: https://gotlandstider.se/sitemap.xml",
  );
  for (const path of [
    "/.well-known/api-catalog",
    "/agent/openapi.json",
    "/agent/site.jsonld",
  ])
    JSON.parse(await resource(request, path));
  await resource(request, "/agent/docs/");
  await resource(request, "/kategorier/");
});

async function resource(
  request: APIRequestContext,
  path: string,
): Promise<string> {
  const response = await request.get(path);
  expect(response.status(), path).toBe(200);
  return response.text();
}
async function json<T>(request: APIRequestContext, path: string): Promise<T> {
  const response = await request.get(path);
  expect(response.status(), path).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/json");
  return response.json() as Promise<T>;
}
function xmlText(entry: string, name: string): string | undefined {
  const value = entry.match(
    new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`),
  )?.[1];
  return value === undefined ? undefined : decodeEntities(value);
}
interface FeedArticle {
  slug: string;
  featured: boolean;
  video?: { youtubeVideoId: string; uploadDate: string };
}
function portableTextContract(body: unknown[]) {
  const slugger = new GithubSlugger();
  const headings: Array<{ id: string; text: string }> = [];
  const hrefs: string[] = [];
  const paragraphs: string[] = [];
  for (const value of body) {
    if (!record(value) || value._type !== "block") continue;
    const children = Array.isArray(value.children)
      ? value.children.filter(record)
      : [];
    const content = children
      .map((child) => (typeof child.text === "string" ? child.text : ""))
      .join("");
    if (content.trim()) paragraphs.push(content);
    if (value.style === "h2" || value.style === "h3")
      headings.push({ id: slugger.slug(content), text: content });
    const usedMarks = new Set(
      children.flatMap((child) =>
        Array.isArray(child.marks) ? child.marks : [],
      ),
    );
    for (const mark of Array.isArray(value.markDefs)
      ? value.markDefs.filter(record)
      : [])
      if (usedMarks.has(mark._key) && typeof mark.href === "string")
        hrefs.push(mark.href);
  }
  return { headings, hrefs, paragraphs };
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
