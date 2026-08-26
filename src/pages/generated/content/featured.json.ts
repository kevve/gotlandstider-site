import type { APIRoute } from "astro";
import { getFeaturedArticle, serializeArticle } from "../../../lib/content";

export const prerender = true;

export const GET: APIRoute = async () => {
  const featured = await getFeaturedArticle();
  return json({ articles: [serializeArticle(featured)] });
};

function json(value: unknown): Response {
  return new Response(`${JSON.stringify(value, null, 2)}\n`, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
