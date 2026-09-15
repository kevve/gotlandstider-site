import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const headersPath = new URL("../../public/_headers", import.meta.url);

test("llms.txt is served as UTF-8 plain text", () => {
  const headers = readFileSync(headersPath, "utf8");

  expect(headers).toMatch(
    /(?:^|\n)\/llms\.txt\n[ \t]+Content-Type: text\/plain; charset=utf-8(?:\n|$)/,
  );
});
