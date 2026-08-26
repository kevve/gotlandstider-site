import type { APIRoute } from "astro";
import { getPublishedArticles, serializeArticle } from "../../../lib/content";

export const prerender = true;

export const GET: APIRoute = async () => {
  const articles = await getPublishedArticles();
  return json({ items: articles.map(serializeArticle) });
};

function json(value: unknown): Response {
  return new Response(`${JSON.stringify(value, null, 2)}\n`, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
