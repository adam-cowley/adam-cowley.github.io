import puppeteer from 'puppeteer'
import fs from 'fs'
import os from 'os'
import path from 'path'

const DEFAULT_SERVER = 'http://localhost:4321'

function parseArgs(args) {
  const result = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2)
      result[key] = args[i + 1]
      i++
    }
  }
  return result
}

function findChrome() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH

  const systemChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  if (fs.existsSync(systemChrome)) return systemChrome

  const homes = [os.homedir(), process.env.HOME, process.env.USERPROFILE].filter(Boolean)
  const platforms = ['chrome-mac-arm64', 'chrome-mac-x64', 'chrome-linux-x64']

  for (const home of homes) {
    const cacheDir = path.join(home, '.cache/puppeteer/chrome')
    if (!fs.existsSync(cacheDir)) continue
    for (const version of fs.readdirSync(cacheDir).sort().reverse()) {
      for (const platform of platforms) {
        for (const exe of [
          path.join(cacheDir, version, platform, 'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
          path.join(cacheDir, version, platform, 'chrome'),
        ]) {
          if (fs.existsSync(exe)) return exe
        }
      }
    }
  }
}

// deviceScaleFactor 2 → 680×354 logical = 1360×708 physical pixels.
const VIEWPORT = { width: 680, height: 354, deviceScaleFactor: 2 }

async function generateScreenshot({ code, lang, theme, bg, fontSize, output, server }) {
  const params = new URLSearchParams({ code })
  if (lang)     params.set('lang', lang)
  if (theme)    params.set('theme', theme)
  if (bg)       params.set('bg', bg)
  if (fontSize) params.set('fontSize', String(fontSize))

  const base = (server || DEFAULT_SERVER).replace(/\/$/, '')
  const url  = `${base}/screenshot?${params}`

  const outputPath = output || `code-screenshot-${Date.now()}.png`
  const isJpeg     = /\.(jpg|jpeg)$/i.test(outputPath)

  const executablePath = findChrome()

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport(VIEWPORT)
    await page.goto(url, { waitUntil: 'networkidle0' })

    if (!await page.$('.window')) {
      throw new Error(`No .window found — is the dev server running at ${base}?`)
    }

    const dir = path.dirname(outputPath)
    if (dir && dir !== '.' && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    await page.screenshot({
      path: outputPath,
      type: isJpeg ? 'jpeg' : 'png',
      quality: isJpeg ? 95 : undefined,
    })
  } finally {
    await browser.close()
  }

  console.log(`Screenshot saved: ${outputPath}`)
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args = parseArgs(process.argv.slice(2))

if (args.help !== undefined) {
  console.log(`
Usage: node scripts/generate-screenshot.js [options]

Requires the Astro dev server to be running (npm run dev).

Options:
  --code     "..."    Inline code string
  --file     <path>   Read code from a file
  --lang     <lang>   Language for syntax highlighting (e.g. javascript, cypher, python)
  --output   <path>   Output image path (.png or .jpg)  [default: code-screenshot-<ts>.png]
  --theme    <theme>  Shiki theme name        [default: from theme.json]
  --bg       <css>    Custom CSS background value
  --fontSize <px>     Code font size          [default: 13]
  --server   <url>    Dev server base URL     [default: ${DEFAULT_SERVER}]

Examples:
  node scripts/generate-screenshot.js --file src/snippets/query.cypher --lang cypher --output public/images/posts/my-post/query.png
  node scripts/generate-screenshot.js --code "const x = 1" --lang javascript --output public/images/posts/my-post/code.png
  echo "SELECT 1" | node scripts/generate-screenshot.js --lang sql --output public/images/posts/query.png
  `)
  process.exit(0)
}

let code = ''

if (args.code) {
  code = args.code.trim()
} else if (args.file) {
  const filePath = path.resolve(args.file)
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    process.exit(1)
  }
  code = fs.readFileSync(filePath, 'utf-8').trim()
} else {
  code = fs.readFileSync('/dev/stdin', 'utf-8').trim()
}

if (!code) {
  console.error('No code provided. Use --code, --file, or pipe via stdin. Run with --help for usage.')
  process.exit(1)
}

await generateScreenshot({
  code,
  lang:     args.lang,
  theme:    args.theme,
  bg:       args.bg,
  fontSize: args.fontSize,
  output:   args.output,
  server:   args.server,
})
