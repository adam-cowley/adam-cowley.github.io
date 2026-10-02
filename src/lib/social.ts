import social from "@config/social.json";
import home from "@config/home.json";

export interface SocialLink {
  name: string;
  href: string;
}

const urls = social as Record<string, string>;

export const socialLinks: SocialLink[] = home.social
  .map(({ name, key }) => ({ name, href: urls[key] }))
  .filter((l) => !!l.href);
