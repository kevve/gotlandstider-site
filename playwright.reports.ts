import type { PlaywrightTestConfig } from "@playwright/test";

export function reportSettings(
  name: string,
): Pick<PlaywrightTestConfig, "reporter" | "outputDir"> {
  return {
    reporter: process.env.CI
      ? [
          [
            "html",
            { outputFolder: `playwright-report/${name}`, open: "never" },
          ],
          ["json", { outputFile: `playwright-report/${name}.json` }],
        ]
      : "list",
    outputDir: `test-results/${name}`,
  };
}
