import { expect, test } from "@playwright/test";
import { articlePath, draftArticleSlugs, publicArticleSlugs } from "./fixtures";

test("archive lists every public article once and no drafts", async ({
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
  expect([...articleLinks].sort()).toEqual(
    publicArticleSlugs.map(articlePath).sort(),
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

test("article body begins directly below the intro on desktop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(articlePath("host-pa-gotland-2026-fem-tips-varda-omvagen"));

  const intro = await page.locator(".article-intro").boundingBox();
  const body = await page.locator(".article-body").boundingBox();

  expect(intro).not.toBeNull();
  expect(body).not.toBeNull();
  expect(body!.y).toBeGreaterThanOrEqual(intro!.y + intro!.height);
  expect(body!.y).toBeLessThan(intro!.y + intro!.height + 48);
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

test("legacy local-video article keeps both compatible source formats", async ({
  page,
}) => {
  await page.goto(articlePath("arets-loppis-favoriter"));

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Årets loppis-favoriter",
  );
  await expect(page.locator("video")).toHaveCount(1);
  await expect(page.locator('video source[type="video/webm"]')).toHaveAttribute(
    "src",
    /story-loppisar-gotland\.webm$/,
  );
  await expect(page.locator('video source[type="video/mp4"]')).toHaveAttribute(
    "src",
    /story-loppisar-gotland\.mp4$/,
  );
});
