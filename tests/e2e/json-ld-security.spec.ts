import { expect, test } from "@playwright/test";
import { serializeJsonLd } from "../../src/lib/json";

test("JSON-LD cannot be broken out of by hostile article metadata", async ({
  page,
}) => {
  const hostileHeadline =
    "Example </script><script>window.jsonLdXss = true</script>";
  const jsonLd = serializeJsonLd({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: hostileHeadline,
  });
  const generatedHtml = `<script type="application/ld+json">${jsonLd}</script>`;

  expect(generatedHtml).not.toContain("</script><script>");
  expect(generatedHtml).not.toContain(hostileHeadline);

  await page.setContent(generatedHtml);

  // The hostile value must stay data: only the intended JSON-LD script exists.
  await expect(page.locator("script")).toHaveCount(1);
  expect(
    await page.evaluate(
      () => (window as Window & { jsonLdXss?: boolean }).jsonLdXss,
    ),
  ).toBeUndefined();

  const renderedJson = await page
    .locator('script[type="application/ld+json"]')
    .textContent();
  expect(renderedJson).not.toBeNull();
  expect(renderedJson).toBe(jsonLd);
  expect(JSON.parse(renderedJson ?? "")).toMatchObject({
    headline: hostileHeadline,
  });
});
