import type { APIRoute } from "astro";
import { getPublishedArticles } from "../lib/content";
import { renderLlmsTxt } from "../lib/llms";

export const prerender = true;

export const GET: APIRoute = async () => {
  const articles = await getPublishedArticles();

  return new Response(renderLlmsTxt(articles), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
