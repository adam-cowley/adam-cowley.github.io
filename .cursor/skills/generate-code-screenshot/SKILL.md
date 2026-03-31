---
name: generate-code-screenshot
description: Generates a carbon.now.sh-style code screenshot (1306×804px) from a selected code snippet and saves it to public/images/posts/. Use when the user selects code and wants to create a screenshot image, says "screenshot this", "generate an image of this code", or provides a filename to save a code image to.
---

# Generate Code Screenshot

Creates a styled code screenshot matching the blog's existing images (1360×708px, one-dark-pro theme, Fira Code font).

## Requirements

- Astro dev server must be running (`npm run dev`)
- The selected code and a destination filename are needed

## Steps

1. **Identify the code** — use the user's selected text or the code they've provided.

2. **Determine the language** — infer from file context, syntax, or ask if unclear. Common values: `javascript`, `typescript`, `cypher`, `python`, `sql`, `bash`, `json`.

3. **Determine the output path** — the user will usually provide a filename. Always save under `public/images/posts/`. If they give a bare filename like `my-snippet.png`, use `public/images/posts/my-snippet.png`. If they give a subfolder path, preserve it.

4. **Run the script** using the Shell tool:

```bash
node scripts/generate-screenshot.js \
  --code "<escaped code>" \
  --lang <language> \
  --output public/images/posts/<filename>
```

For multi-line code, use a heredoc to avoid quoting issues:

```bash
node scripts/generate-screenshot.js \
  --file /tmp/screenshot-code.tmp \
  --lang <language> \
  --output public/images/posts/<filename>
```

Writing the code to `/tmp/screenshot-code.tmp` first via the Write tool, then using `--file`.

5. **Confirm** the output path to the user so they can reference it in their markdown.

## Options

| Flag | Default | Notes |
|------|---------|-------|
| `--lang` | `plaintext` | Shiki language identifier |
| `--theme` | `one-dark-pro` | Any Shiki theme name |
| `--fontSize` | `13` | px — increase for shorter snippets |
| `--server` | `http://localhost:4321` | If dev server runs on a different port |

## Example invocations

```bash
# Short inline code
node scripts/generate-screenshot.js \
  --code "const x = await db.run(query)" \
  --lang javascript \
  --output public/images/posts/my-post/inline.png

# Multi-line via temp file (preferred for anything >1 line)
node scripts/generate-screenshot.js \
  --file /tmp/screenshot-code.tmp \
  --lang cypher \
  --output public/images/posts/my-post/query.png
```
