import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { getViteConfig } from "astro/config";
import { createServer, type ViteDevServer } from "vite";

let vite: ViteDevServer | undefined;

/** Load an .astro module through Astro's Vite integration for container tests. */
export async function renderAstroComponent(
  modulePath: string,
  props: Record<string, unknown>,
  options: { params?: Record<string, string>; url?: string } = {},
): Promise<string> {
  // The controlled rendering cases don't need a Sanity client. Markdown keeps
  // Astro config valid while Vite compiles the real component tree.
  process.env.CONTENT_SOURCE = "markdown";
  const server = await getViteServer();
  const module = await server.ssrLoadModule(modulePath);
  const container = await AstroContainer.create();

  return container.renderToString(module.default, {
    props,
    ...(options.params ? { params: options.params } : {}),
    ...(options.url ? { request: new Request(options.url) } : {}),
  });
}

export async function closeAstroContainerServer(): Promise<void> {
  await vite?.close();
  vite = undefined;
}

async function getViteServer(): Promise<ViteDevServer> {
  if (!vite) {
    const config = await getViteConfig(
      {
        appType: "custom",
        logLevel: "error",
        server: {
          middlewareMode: true,
          hmr: false,
          watch: null,
          ws: false,
        },
      },
      { root: process.cwd() },
    )({ command: "serve", mode: "test" });
    vite = await createServer({ ...config, configFile: false });
  }
  return vite;
}
