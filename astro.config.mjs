import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import config from "./src/config/config.json";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import theme from './src/config/theme.json'

import mdx from "@astrojs/mdx";

// https://astro.build/config
export default defineConfig({
  site: config.site.base_url ? config.site.base_url : "http://examplesite.com",
  base: config.site.base_path ? config.site.base_path : "/",
  trailingSlash: config.site.trailing_slash ? "always" : "never",
  integrations: [
    sitemap(),
    tailwind({
      config: {
        applyBaseStyles: false
      }
    }),
    react(),
    mdx()
  ],
  markdown: {
    remarkPlugins: [],
    shikiConfig: theme.shikiConfig,
    extendDefaultPlugins: true
  },
  redirects: {
    '/neo4j/analysing-football-events-neo4j/': '/neo4j/analysing-football-events-neo4j/',
    '/neo4j/importing-wikipedia-data-into-neo4j/': '/posts/importing-wikipedia-data-into-neo4j/',
    '/neo4j/sharding-neo4j-4.0/': '/posts/sharding-neo4j-40/',
    '/posts/sharding-neo4j-4.0/': '/posts/sharding-neo4j-40/',
    '/neo4j/multi-tenancy-neo4j-4.0/': '/posts/multi-tenancy-neo4j-40/',
    '/neo4j/social-feed-cursor-based-pagination/': '/social-feed-cursor-based-pagination/',
    '/neo4j/real-time-ui-vuejs-neo4j-kafka/': '/posts/real-time-ui-vuejs-neo4j-kafka/',
    '/neo4j/calculating-tf-idf-score-cypher/': '/posts/calculating-tf-idf-score-cypher/',
    '/neo4j/importing-google-analytics-to-neo4j-via-bigquery-using-apoc-jdbc/': '/posts/importing-google-analytics-to-neo4j-via-bigquery-using-apoc-jdbc/',
    '/javascript/using-the-neo4j-driver-with-nodejs/': '/posts/using-the-neo4j-driver-with-nodejs/',
    '/neo4j/temporal-native-dates/': '/posts/temporal-native-dates/'
  }
});