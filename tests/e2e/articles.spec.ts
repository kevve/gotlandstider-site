import { expect, test } from "@playwright/test";
import { articlePath, draftArticleSlugs, publicArticleSlugs } from "./fixtures";

test("archive lists every published article once and no drafts", async ({
  page,
}) => {
  await page.goto("/articles/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Upptäck mer från Gotland",
  );

  const hrefs = await page
    .locator('main a[href^="/articles/"]')
    .evaluateAll((links) =>
      links
        .map((link) => (link as HTMLAnchorElement).getAttribute("href"))
        .filter((href): href is string => Boolean(href)),
    );

  const articleLinks = new Set(hrefs.filter((href) => href !== "/articles/"));
  const publishedArticles = await page.request.get(
    "/generated/content/articles.json",
  );
  const articlePayload = (await publishedArticles.json()) as {
    items: Array<{ slug: string }>;
  };

  expect([...articleLinks].sort()).toEqual(
    articlePayload.items.map((article) => articlePath(article.slug)).sort(),
  );

  for (const slug of draftArticleSlugs) {
    expect(articleLinks).not.toContain(articlePath(slug));
  }
});

test("home archive shows its all-articles link only below the cards on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.locator(".archive-heading > a")).toBeHidden();
  await expect(page.locator(".mobile-archive-link")).toBeVisible();
});

test("article bodies begin directly below their intros on desktop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });

  for (const slug of publicArticleSlugs) {
    await page.goto(articlePath(slug));

    const intro = await page.locator(".article-intro").boundingBox();
    const body = await page.locator(".article-body").boundingBox();
    const media = await page.locator(".article-media").boundingBox();
    const related = await page.locator(".article-related").boundingBox();

    expect(intro, slug).not.toBeNull();
    expect(body, slug).not.toBeNull();
    expect(media, slug).not.toBeNull();
    expect(related, slug).not.toBeNull();
    expect(body!.y, slug).toBeGreaterThanOrEqual(intro!.y + intro!.height);
    expect(body!.y, slug).toBeLessThan(intro!.y + intro!.height + 48);
    expect(related!.y, slug).toBeGreaterThanOrEqual(media!.y + media!.height);
    expect(related!.y, slug).toBeLessThan(media!.y + media!.height + 48);
  }
});

test("article related stories remain below the body on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(articlePath("host-pa-gotland-2026-fem-tips-varda-omvagen"));

  const body = await page.locator(".article-body").boundingBox();
  const related = await page.locator(".article-related").boundingBox();

  expect(body).not.toBeNull();
  expect(related).not.toBeNull();
  expect(related!.y).toBeGreaterThanOrEqual(body!.y + body!.height);
});

test("related story cards keep a rounded clipping boundary while hovered", async ({
  page,
}) => {
  await page.goto(articlePath("host-pa-gotland-2026-fem-tips-varda-omvagen"));

  const card = page.locator(".article-related .article-card").first();
  await card.hover();

  await expect(card).toHaveCSS("border-radius", "17.6px");
  await expect(card).toHaveCSS("overflow", "hidden");
});

test("YouTube article renders its heading and privacy-friendly embed", async ({
  page,
}) => {
  await page.goto(articlePath("host-pa-gotland-2026-fem-tips-varda-omvagen"));

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Höst på Gotland 2026: fem tips värda omvägen",
  );
  await expect(page.locator("#så-får-du-ut-mer-av-höstdagen")).toHaveText(
    "Så får du ut mer av höstdagen",
  );
  await expect(page.locator('iframe[src*="youtube"]')).toHaveCount(1);
});

test("article bylines expose the visible author and machine-readable dates", async ({
  page,
}) => {
  await page.goto(articlePath("host-pa-gotland-2026-fem-tips-varda-omvagen"));

  const author = page.locator(".article-author");
  await expect(page.locator(".article-intro > :first-child")).toHaveClass(
    "article-tags",
  );
  await expect(author).toContainText("Av");
  await expect(author).toContainText("Gotlandstider");
  await expect(author).toHaveAttribute("href", "/#about");
  await expect(author).toHaveAttribute("rel", "author");
  await expect(author.locator("img")).toHaveAttribute(
    "src",
    "/content/about-kevinhenrik.webp",
  );
  await expect(page.locator(".article-dates time")).toHaveCount(1);
  await expect(page.locator(".article-dates time")).toHaveAttribute(
    "datetime",
    "2026-08-22",
  );
  await expect(page.locator(".article-byline > .social-links")).toHaveCount(1);
  await expect(page.locator(".article-intro > .social-links")).toHaveCount(0);

  await page.goto(articlePath("gotlands-kanske-basta-bageri"));
  await expect(page.locator(".article-dates time")).toHaveCount(2);
  await expect(page.locator(".article-dates time").nth(0)).toHaveAttribute(
    "datetime",
    "2026-04-13",
  );
  await expect(page.locator(".article-dates time").nth(1)).toHaveAttribute(
    "datetime",
    "2026-05-27",
  );
});

test("migrated article renders its canonical YouTube video", async ({
  page,
}) => {
  await page.goto(articlePath("arets-loppis-favoriter"));

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Årets loppis-favoriter",
  );
  await expect(page.locator("video")).toHaveCount(0);
  await expect(page.locator("iframe")).toHaveAttribute(
    "src",
    "https://www.youtube-nocookie.com/embed/ZKvaPamLcjs",
  );
});
