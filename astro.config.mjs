import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import config from "./src/config/config.json";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import mermaid from "astro-mermaid";
import theme from './src/config/theme.json'
import mdx from "@astrojs/mdx";
import { codeToHtml } from 'shiki';
import rehypeA11y from './src/lib/rehypeA11y.mjs';

// Output is always 1360×708px (680×354 logical at deviceScaleFactor 2).
const VIEWPORT = { w: 680, h: 354 }

function screenshotHtml({ highlighted, bg, fontSize }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html {
      width: ${VIEWPORT.w}px;
      height: ${VIEWPORT.h}px;
      overflow: hidden;
    }
    body {
      width: ${VIEWPORT.w}px;
      height: ${VIEWPORT.h}px;
      background: ${bg};
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .window {
      border-radius: 12px;
      box-shadow:
        0 2px 4px rgba(0,0,0,0.12),
        0 8px 24px rgba(0,0,0,0.28),
        0 24px 64px rgba(0,0,0,0.32),
        0 0 0 1px rgba(255,255,255,0.08);
      overflow: hidden;
      max-width: calc(${VIEWPORT.w}px - 60px);
    }
    .titlebar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 18px;
      background: rgba(255,255,255,0.06);
    }
    .dot {
      width: 13px; height: 13px;
      border-radius: 50%;
      flex-shrink: 0;
      box-shadow: 0 0 0 0.5px rgba(0,0,0,0.25);
    }
    .dot-red    { background: #ff5f57; }
    .dot-yellow { background: #febc2e; }
    .dot-green  { background: #28c840; }
    .window pre {
      margin: 0 !important;
      padding: 24px 30px 28px !important;
      border-radius: 0 !important;
      overflow-x: auto;
    }
    .window pre code, .window pre span {
      font-family: 'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'Menlo', monospace !important;
      font-size: ${fontSize}px !important;
      line-height: 1.65 !important;
    }
  </style>
</head>
<body>
  <div class="window">
    <div class="titlebar">
      <div class="dot dot-red"></div>
      <div class="dot dot-yellow"></div>
      <div class="dot dot-green"></div>
    </div>
    ${highlighted}
  </div>
</body>
</html>`
}

/** @type {import('vite').Plugin} */
const screenshotPlugin = {
  name: 'screenshot-dev',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url ?? '/', 'http://localhost')
      if (url.pathname !== '/screenshot') return next()

      try {
        const code     = url.searchParams.get('code') ?? ''
        const lang     = url.searchParams.get('lang') || 'plaintext'
        const hlTheme  = url.searchParams.get('theme') || theme.shikiConfig.theme
        const bg       = url.searchParams.get('bg') || 'linear-gradient(135deg, #a8bbc8 0%, #b0c4d0 50%, #9fb8c4 100%)'
        const fontSize = parseInt(url.searchParams.get('fontSize') || '13', 10)

        let highlighted = ''
        if (code) {
          try {
            highlighted = await codeToHtml(code, { lang, theme: hlTheme })
          } catch {
            highlighted = await codeToHtml(code, { lang: 'plaintext', theme: hlTheme })
          }
        }

        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(screenshotHtml({ highlighted, bg, fontSize }))
      } catch (err) {
        next(err)
      }
    })
  }
}

// https://astro.build/config
export default defineConfig({
  site: config.site.base_url ? config.site.base_url : "http://examplesite.com",
  base: config.site.base_path ? config.site.base_path : "/",
  trailingSlash: config.site.trailing_slash ? "always" : "never",
  integrations: [
    sitemap({ filter: (page) => !page.endsWith("/cv") && !page.endsWith("/cv/") }),
    tailwind({
      config: {
        applyBaseStyles: false
      }
    }),
    react(),
    mdx(),
    mermaid({
      theme: "base",
      mermaidConfig: {
        fontFamily: "Mulish",
        themeVariables: {
          background: "#FAFAFA",
          primaryColor: "#FAFAFA",
          primaryTextColor: "#152035",
          primaryBorderColor: "#cbd5e1",
          secondaryColor: "#fff",
          secondaryTextColor: "#333333",
          secondaryBorderColor: "#cbd5e1",
          tertiaryColor: "#fff",
          tertiaryTextColor: "#333333",
          tertiaryBorderColor: "#cbd5e1",
          lineColor: "#a1a5ae",
          textColor: "#152035",
          mainBkg: "#FAFAFA",
          nodeBorder: "#cbd5e1",
          clusterBkg: "#fff",
          clusterBorder: "#cbd5e1",
          titleColor: "#152035",
          edgeLabelBackground: "#fff",
        }
      }
    })
  ],
  vite: {
    plugins: [screenshotPlugin],
  },
  markdown: {
    remarkPlugins: [],
    rehypePlugins: [rehypeA11y],
    shikiConfig: theme.shikiConfig,
    extendDefaultPlugins: true
  },
  redirects: {
    '/page/2': '/posts',
    '/page/3': '/posts',
    '/page/4': '/posts',
    '/page/5': '/posts',
    '/search': '/posts',
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