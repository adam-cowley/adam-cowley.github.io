---
title: "Converting HTML to PDF with Node.js like it is 2023"
date: 2023-08-11T10:00:00+00:00
description: Today I Learned - How to convert HTML to PDF with 4 lines of javascript.
image: "/images/posts/til-html-to-pdf-nodejs.png"
categories:
- til
tags:
- javascript
- node.js
---

Today I was looking for a quick solution to convert the course summaries on [GraphAcademy](https://graphacademy.neo4j.com) into PDF so users can take their learning with them.

Page 1 of Google was full of packages that hadn't been updated in two years.  Maybe they don't need to be updated?  Or maybe they're just redundant?

Either way, installing any of the popular packages mentioned in the top 5 or so search results gave me a set of `npm audit` errors.  But, then I got lucky.


It turns out, you can convert any webpage into a PDF with just four lines of code using [Puppeteer](https://pptr.dev/).  Puppeteer fires up a headless instance of Chrome which you can then control using code.  As a bonus, it is actively maintained too.

To install [Puppeteer](https://www.npmjs.com/package/puppeteer), run:

```sh
npm install --save puppeteer
```

Then, it takes just four lines of code (with an extra few for readability).

```js
const browser = await puppeteer.launch({ headless: 'new' }) // <1>
const page = await browser.newPage() // <2>
await page.goto( // <3>
    `http://localhost:3001/${course}/summary`,
    { waitUntil: 'networkidle0' }
)
const buffer = await page.pdf({ format: 'A4', landscape: true }) // <4>
```

1. Launch a new Chrome browser in headless mode
2. Open a new blank page
3. Head to the URL you want to convert to a PDF.  The `networkidle0` option waits for the page to be completely loaded before performing the next action.
4. Use [the `.pdf()` method](https://pptr.dev/api/puppeteer.page.pdf) to convert the page into a PDF.  I chose A4 paper size and to take the PDF in Landscape mode.

The `.pdf()` method returns a `Buffer` that you can save to the file system using `fs.writeFileSync()`.

```js
await writeFileSync(pathToFile, buffer, {})
```

It also works for screenshots, just replace the `.pdf()` call with [`.screenshot()`](https://pptr.dev/api/puppeteer.page.screenshot):

```js
await page.screenshot({
    fullPage: true,
    type: 'png',
    path: '/optional/path/to/save/to.png'
})
```


One package, no out of date dependencies!

I hope this post gets picked up by search engines, so it'll save others time too.


----

**Was this tip useful? Let me know on [Twitter](https://twitter.com/adamcowley) or [LinkedIn](https://linkedin.com/in/adamcowley).**
