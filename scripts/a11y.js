// Accessibility audit: runs axe-core (incl. colour contrast) against the built
// site in both light and dark themes.  Usage: npm run build && npm run test:a11y
import puppeteer from 'puppeteer'
import { createRequire } from 'module'
import fs from 'fs'
import http from 'http'
import path from 'path'

const require = createRequire(import.meta.url)
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const DIST = path.resolve('dist')
const THEMES = ['light', 'dark']
const MAX_PAGES = Number(process.env.A11Y_MAX_PAGES || 40)

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' }

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)])
}

// Always cover the key templates, then sample the rest of the posts.
function pickPages() {
  const all = walk(DIST).filter(f => f.endsWith('index.html') || f.endsWith('404.html'))
    .map(f => '/' + path.relative(DIST, f).replace(/index\.html$/, ''))
  const posts = all.filter(u => u.startsWith('/posts/') && u !== '/posts/')
  const rest = all.filter(u => !posts.includes(u))
  return [...rest, ...posts].slice(0, MAX_PAGES)
}

const server = http.createServer((req, res) => {
  let file = path.join(DIST, decodeURIComponent(req.url.split('?')[0]))
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end('not found') }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
})

if (!fs.existsSync(DIST)) { console.error('No dist/ — run `npm run build` first.'); process.exit(2) }
await new Promise(r => server.listen(0, r))
const base = `http://localhost:${server.address().port}`
const pages = pickPages()
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
let failures = 0

try {
  for (const theme of THEMES) {
    for (const url of pages) {
      // Redirect stubs (meta refresh) have no content to audit.
      if (/http-equiv="refresh"/i.test(fs.readFileSync(path.join(DIST, url, url.endsWith('.html') ? '' : 'index.html'), 'utf8').slice(0, 2000))) continue
      const page = await browser.newPage()
      await page.evaluateOnNewDocument(t => { try { localStorage.setItem('ac-theme', t) } catch {} }, theme)
      // reduced motion skips the page-enter fade, which would skew contrast readings
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }, { name: 'prefers-reduced-motion', value: 'reduce' }])
      await page.goto(base + url, { waitUntil: 'load', timeout: 60000 })
      await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme)
      await page.evaluate(axeSource)
      const { violations } = await page.evaluate(() =>
        // eslint-disable-next-line no-undef
        axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] }))
      for (const v of violations) {
        failures++
        console.log(`\n✖ [${theme}] ${url} — ${v.id} (${v.impact}): ${v.help}`)
        for (const n of v.nodes.slice(0, 3)) console.log(`    ${n.target.join(' ')}\n    ${n.failureSummary.split('\n').slice(0, 2).join(' ')}`)
      }
      await page.close()
    }
  }
} finally {
  await browser.close()
  server.close()
}

console.log(`\n${pages.length} pages × ${THEMES.length} themes: ${failures} violation(s)`)
process.exit(failures ? 1 : 0)
