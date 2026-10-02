import { getCollection, type CollectionEntry } from "astro:content";
import home from "@config/home.json";
import { humanize, slugify } from "@lib/utils/textConverter";

export type PostEntry = CollectionEntry<"posts">;

/** Flat, render-ready view of a post. Components take this, never raw entries. */
export interface PostView {
  slug: string;
  href: string;
  title: string;
  description: string;
  date: Date;
  dateLabel: string;
  minutes: number;
  topic: string;
  topicSlug: string;
  categories: string[];
  tags: string[];
  image?: string;
  pinned: boolean;
}

const labels = home.categoryLabels as Record<string, string>;

/** "genai" -> "GenAI", "some-thing" -> "Some thing" */
export const topicLabel = (key: string) => {
  const slug = slugify(key) ?? key;
  if (labels[slug]) return labels[slug];
  const text = humanize(key) ?? key;
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const dateLabel = (d: Date) =>
  d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });

const strip = (md: string) =>
  md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*_`>|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const toView = (post: PostEntry): PostView => {
  const { data } = post;
  const date = data.date ?? new Date(0);
  const text = strip(post.body ?? "");
  const description =
    data.description ??
    (text.length > 160 ? text.slice(0, 157).trimEnd() + "…" : text);
  const topic = data.categories[0] ?? "others";

  return {
    slug: post.slug,
    href: `/posts/${post.slug}`,
    title: data.title,
    description,
    date,
    dateLabel: dateLabel(date),
    minutes: Math.max(1, Math.round(text.split(" ").length / 230)),
    topic: topicLabel(topic),
    topicSlug: slugify(topic) ?? topic,
    categories: data.categories,
    tags: data.tags,
    image: data.image,
    pinned: !!data.pinned,
  };
};

/** All published posts, newest first. */
export async function getPosts(): Promise<PostView[]> {
  const entries = await getCollection("posts", ({ data }) => !data.draft);
  return entries
    .map(toView)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function getPostEntries(): Promise<PostEntry[]> {
  return getCollection("posts", ({ data }) => !data.draft);
}

/** Unique taxonomy values with the posts that carry them, biggest first. */
export function groupBy(posts: PostView[], key: "categories" | "tags") {
  const map = new Map<string, { slug: string; label: string; posts: PostView[] }>();
  for (const post of posts) {
    for (const raw of post[key]) {
      const slug = slugify(raw);
      if (!slug) continue;
      const entry = map.get(slug) ?? { slug, label: topicLabel(raw), posts: [] };
      entry.posts.push(post);
      map.set(slug, entry);
    }
  }
  return [...map.values()].sort(
    (a, b) => b.posts.length - a.posts.length || a.label.localeCompare(b.label)
  );
}
