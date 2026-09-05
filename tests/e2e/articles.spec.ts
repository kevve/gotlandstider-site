import { expect, test } from "@playwright/test";
import { articlePath, draftArticleSlugs, publicArticleSlugs } from "./fixtures";

test("archive lists every published article once and no drafts", async ({
  page,
}) => {
  await page.goto("/artiklar/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Upptäck mer från Gotland",
  );

  const hrefs = await page
    .locator('main a[href^="/artiklar/"]')
    .evaluateAll((links) =>
      links
        .map((link) => (link as HTMLAnchorElement).getAttribute("href"))
        .filter((href): href is string => Boolean(href)),
    );

  const articleLinks = new Set(hrefs.filter((href) => href !== "/artiklar/"));
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

test("homepage and related story cards use the primary category", async ({
  page,
}) => {
  const response = await page.request.get("/generated/content/articles.json");
  const { items } = (await response.json()) as {
    items: Array<{ slug: string; primaryTag: string; featured: boolean }>;
  };

  const featured = items.find((item) => item.featured);
  expect(featured).toBeDefined();
  await page.goto(articlePath(featured!.slug));
  const relatedCard = page.locator(".article-related .article-card a").first();
  const relatedPath = await relatedCard.getAttribute("href");
  const article = items.find((item) => articlePath(item.slug) === relatedPath);
  expect(article).toBeDefined();

  const relatedTags = relatedCard.locator(".card-badge:visible");
  await expect(relatedTags).toHaveCount(1);
  await expect(relatedTags).toHaveText(article!.primaryTag);
  await expect(
    relatedCard.locator(".card-copy > .card-badge + h3"),
  ).toBeVisible();
  const relatedTagColor = await relatedTags.evaluate(
    (tag) => getComputedStyle(tag).color,
  );

  await page.goto("/");
  const homepageCard = page.locator(`a[href="${relatedPath}"]`);
  await expect(homepageCard.locator(".card-badge")).toHaveText(
    article!.primaryTag,
  );
  await expect(homepageCard.locator(".card-subtitle")).toHaveCSS(
    "color",
    relatedTagColor,
  );
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

  const author = page.locator(".article-author-name");
  await expect(page.locator(".article-intro > :first-child")).toHaveClass(
    "article-tags",
  );
  await expect(author).toHaveText("Gotlandstider");
  await expect(author).toHaveAttribute("href", "/#about");
  await expect(author).toHaveAttribute("rel", "author");
  await expect(page.locator(".article-author img")).toHaveAttribute(
    "src",
    "/content/about-kevinhenrik.webp",
  );
  await expect(page.locator(".article-dates time")).toHaveCount(1);
  await expect(page.locator(".article-dates time")).toHaveAttribute(
    "datetime",
    "2026-08-22",
  );
  await expect(page.locator(".article-published")).toHaveText(
    "Publicerad 22 aug 2026",
  );
  await expect(page.locator(".article-byline > .social-links")).toHaveCount(1);
  await expect(page.locator(".article-intro > .social-links")).toHaveCount(0);

  const twoLineIdentityBox = await page
    .locator(".article-identity")
    .boundingBox();
  const twoLineAvatarBox = await page
    .locator(".article-author img")
    .boundingBox();
  expect(twoLineIdentityBox).not.toBeNull();
  expect(twoLineAvatarBox).not.toBeNull();
  expect(
    Math.abs(twoLineIdentityBox!.height - twoLineAvatarBox!.height),
  ).toBeLessThan(1);

  await page.goto(articlePath("gotlands-kanske-basta-bageri"));
  await expect(page.locator(".article-dates time")).toHaveCount(2);
  await expect(page.locator(".article-dates time").nth(0)).toHaveAttribute(
    "datetime",
    "2026-05-27",
  );
  await expect(page.locator(".article-dates time").nth(1)).toHaveAttribute(
    "datetime",
    "2026-04-13",
  );
  await expect(page.locator(".article-updated")).toHaveText(
    "Uppdaterad 27 maj 2026",
  );
  await expect(page.locator(".article-published")).toHaveText(
    "Publicerad 13 apr 2026",
  );

  const identity = page.locator(".article-identity");
  const avatar = page.locator(".article-author img");
  const identityBox = await identity.boundingBox();
  const avatarBox = await avatar.boundingBox();
  expect(identityBox).not.toBeNull();
  expect(avatarBox).not.toBeNull();
  expect(Math.abs(identityBox!.height - avatarBox!.height)).toBeLessThan(1);

  await page.setViewportSize({ width: 544, height: 900 });
  const rowIdentityBox = await identity.boundingBox();
  const rowSocialsBox = await page
    .locator(".article-byline > .social-links")
    .boundingBox();
  expect(rowIdentityBox).not.toBeNull();
  expect(rowSocialsBox).not.toBeNull();
  expect(
    Math.abs(
      rowIdentityBox!.y +
        rowIdentityBox!.height / 2 -
        (rowSocialsBox!.y + rowSocialsBox!.height / 2),
    ),
  ).toBeLessThan(1);

  await page.setViewportSize({ width: 543, height: 900 });
  const stackedIdentityBox = await identity.boundingBox();
  const stackedSocialsBox = await page
    .locator(".article-byline > .social-links")
    .boundingBox();
  const socialButtons = page.locator(".article-byline > .social-links a");
  const instagramBox = await socialButtons.nth(0).boundingBox();
  const tiktokBox = await socialButtons.nth(1).boundingBox();
  expect(stackedIdentityBox).not.toBeNull();
  expect(stackedSocialsBox).not.toBeNull();
  expect(stackedSocialsBox!.y).toBeGreaterThan(
    stackedIdentityBox!.y + stackedIdentityBox!.height,
  );
  expect(instagramBox).not.toBeNull();
  expect(tiktokBox).not.toBeNull();
  expect(Math.abs(instagramBox!.y - tiktokBox!.y)).toBeLessThan(1);
});

test("article location and qualifier tags wrap together after the primary tag", async ({
  page,
}) => {
  await page.goto(articlePath("host-pa-gotland-2026-fem-tips-varda-omvagen"));

  const primaryTag = page.locator(".article-tags > .primary-tag");
  const tagPair = page.locator(".article-tags > .article-tag-pair");
  await expect(tagPair.locator("span")).toHaveCount(2);

  await page.setViewportSize({ width: 1280, height: 900 });
  const widePrimary = await primaryTag.boundingBox();
  const widePair = await tagPair.boundingBox();
  expect(widePrimary).not.toBeNull();
  expect(widePair).not.toBeNull();
  expect(
    Math.abs(
      widePair!.y +
        widePair!.height / 2 -
        (widePrimary!.y + widePrimary!.height / 2),
    ),
  ).toBeLessThan(1);

  await page.setViewportSize({ width: 320, height: 700 });
  const narrowPrimary = await primaryTag.boundingBox();
  const narrowPair = await tagPair.boundingBox();
  const pairedTagRows = await tagPair
    .locator("span")
    .evaluateAll((tags) => tags.map((tag) => tag.getBoundingClientRect().y));
  expect(narrowPrimary).not.toBeNull();
  expect(narrowPair).not.toBeNull();
  expect(narrowPair!.y).toBeGreaterThan(
    narrowPrimary!.y + narrowPrimary!.height,
  );
  expect(new Set(pairedTagRows).size).toBe(1);
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
