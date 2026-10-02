import rss from "@astrojs/rss";
import config from "@config/config.json";
import { getPostEntries } from "@lib/posts";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const posts = (await getPostEntries()).sort(
    (a, b) => (b.data.date?.getTime() ?? 0) - (a.data.date?.getTime() ?? 0)
  );
  return rss({
    title: "Adam Cowley",
    description: config.metadata.meta_description,
    site: context.site ?? config.site.base_url,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.date,
      link: `/posts/${p.slug}`,
    })),
  });
}
