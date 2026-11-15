import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fromHtml } from 'hast-util-from-html'
import { visit } from 'unist-util-visit'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const tarball = join(root, `${manifest.name.replace(/^@/, '').replace('/', '-')}-${manifest.version}.tgz`)
const npmCli = process.env.npm_execpath
if (!npmCli) throw new Error('Run this check with npm run smoke:package after npm pack.')
await access(tarball)

const work = await mkdtemp(join(tmpdir(), 'ak-blog-smoke-'))
const consumer = join(work, 'Package consumer')
const content = join(work, 'Content repository')
const output = join(work, 'Static site')
const env = { ...process.env }
delete env.NEXT_PUBLIC_SITE_URL

async function run(args, { cwd = consumer, expectFailure = false, childEnv = env } = {}) {
  const result = await new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, args, { cwd, env: childEnv, stdio: ['ignore', 'pipe', 'pipe'] })
    let log = ''
    for (const stream of [child.stdout, child.stderr]) {
      stream.on('data', (chunk) => {
        log += chunk
        if (!expectFailure) process.stdout.write(chunk)
      })
    }
    child.once('error', reject)
    child.once('close', (code) => resolveRun({ code, log }))
  })
  if (expectFailure) assert.notEqual(result.code, 0, 'An invalid build unexpectedly succeeded')
  else assert.equal(result.code, 0, result.log)
  return result.log
}

async function exists(path) {
  try {
    await access(path)
    return true
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

async function page(route, directory = output) {
  const stem = join(directory, route)
  for (const path of [join(stem, 'index.html'), `${stem}.html`]) {
    if (await exists(path)) return readFile(path, 'utf8')
  }
  throw new Error(`No exported HTML for /${route}`)
}

function elements(html) {
  const nodes = []
  visit(fromHtml(html), 'element', (node) => {
    nodes.push(node)
  })
  return nodes
}

function assertLanguageTarget(html, locale, expected) {
  const link = elements(html).find((node) => node.tagName === 'a' && node.properties.hrefLang === locale)
  assert.equal(link?.properties.href, expected, `Incorrect language target for ${locale}`)
}

function meta(html, name) {
  return elements(html).find((node) => node.tagName === 'meta'
    && (node.properties.property === name || node.properties.name === name))?.properties.content
}

const zhPost = `---
title: 独立内容仓库验证
description: 这篇文章只存在于调用方的内容仓库。
date: '2026-01-02'
category: External
tags: [Consumer, 中文标签]
---

这不是模板自带的示例文章。

## 静态图片

![独立仓库图片](../images/external.svg)

## 阅读与搜索

文章、目录与搜索内容应当来自同一个内容仓库。

## 安全示意图

~~~sketch
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60" aria-label="安全示意图" onload=alert(1) ONCLICK="alert(2)">
  <defs>
    <linearGradient id="shade"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#333"/></linearGradient>
    <clipPath id="cut"><rect width="100" height="60"/></clipPath>
  </defs>
  <script>alert(3)</script>
  <style>svg { background: red }</style>
  <foreignObject><iframe src="https://unsafe.example/"></iframe></foreignObject>
  <use href='j&#x61;vascript:alert(4)'/>
  <use href="https://unsafe.example/shape.svg#shape"/>
  <animate attributeName="href" values="javascript:alert(5)"/>
  <set attributeName="onload" to="alert(6)"/>
  <rect class="ak-node" x="5" y="5" width="35" height="25" fill="url(#shade)" clip-path="url(#cut)" style="fill: red"/>
  <path class="ak-link" d="M40 20 L75 20" marker-end="url(#arrow)"/>
  <text class="ak-text" x="5" y="50">安全示意图</text>
</svg>
~~~
`
const enPost = `---
title: Independent content repository
description: This article exists only in the caller's content repository.
date: '2026-01-02'
category: External
tags: [Consumer, English-only]
---

This is not a bundled template example.

## Static image

![External repository image](../../images/external.svg)
`

try {
  await mkdir(consumer)
  await mkdir(join(content, 'posts', 'en'), { recursive: true })
  await mkdir(join(content, 'images'))
  await writeFile(join(consumer, 'package.json'), JSON.stringify({ name: 'ak-blog-smoke-consumer', private: true, type: 'module' }))
  await writeFile(join(content, 'posts', 'external-story.md'), zhPost)
  await writeFile(join(content, 'posts', 'en', 'external-story.md'), enPost)
  await writeFile(join(content, 'posts', 'draft.md'), `---\ntitle: Private draft\ndescription: Must not be exported\ndate: '2026-01-03'\ntags: []\ndraft: true\n---\nNot published.\n`)
  await writeFile(join(content, 'images', 'external.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32" viewBox="0 0 64 32"><rect width="64" height="32" fill="#333"/></svg>')
  const socialImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
  await writeFile(join(content, 'images', 'social.png'), socialImage)
  await writeFile(join(content, 'site.json'), JSON.stringify({
    title: '内容站点 Content-owned blog',
    suffix: '/ journal',
    author: 'Content author',
    url: 'https://content.example.test/',
    favicon: '/content/images/external.svg',
    socialImage: '/content/images/social.png',
    description: { zh: '来自独立仓库的站点配置。', en: 'Configuration from the content repository.' },
    sameAs: [],
  }))

  await run([npmCli, 'install', tarball, '--omit=dev', '--prefer-offline', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org'])
  const cli = join(consumer, 'node_modules', '@swufefox', 'ak-blog', 'bin', 'ak-blog.mjs')
  const buildArgs = [cli, 'build', '--content', content, '--out', output]
  await run(buildArgs, { childEnv: { ...env, NODE_ENV: 'development' } })

  const home = await readFile(join(output, 'index.html'), 'utf8')
  const englishHome = await page('en')
  const article = await page('posts/external-story')
  const englishArticle = await page('en/posts/external-story')
  assert.match(home, /独立内容仓库验证/)
  assert.match(home, /<title>[^<]*Content-owned blog/)
  assert.match(englishHome, /Independent content repository/)
  assert.match(article, /https:\/\/content\.example\.test\/posts\/external-story/)
  assert.match(englishArticle, /https:\/\/content\.example\.test\/en\/posts\/external-story/)
  assert.match(article, /\/content\/images\/external\.svg/)
  assert.match(await readFile(join(output, 'content', 'images', 'external.svg'), 'utf8'), /viewBox="0 0 64 32"/)
  assert.deepEqual(await readFile(join(output, 'content', 'images', 'social.png')), socialImage)
  const sketch = elements(article).find((node) => node.tagName === 'svg' && node.properties.ariaLabel === '安全示意图')
  assert.ok(sketch, 'The safe SVG drawing was lost')
  const svgNodes = []
  visit(sketch, 'element', (node) => {
    svgNodes.push(node)
    assert.ok(!['script', 'style', 'foreignObject', 'iframe', 'image', 'animate', 'set'].includes(node.tagName), `Unsafe SVG element: ${node.tagName}`)
    for (const [name, value] of Object.entries(node.properties)) {
      assert.ok(!/^on/i.test(name) && name !== 'style', `Unsafe SVG attribute: ${name}`)
      if (/href$/i.test(name)) assert.match(String(value), /^#[^\s]+$/)
      if (typeof value === 'string' && /url\(/i.test(value)) assert.match(value, /^url\(#[^\s)]+\)$/)
    }
  })
  const box = svgNodes.find((node) => node.tagName === 'rect' && node.properties.className?.includes('ak-node'))
  assert.equal(box?.properties.fill, 'url(#shade)')
  assert.equal(box?.properties.clipPath, 'url(#cut)')
  assert.ok(svgNodes.some((node) => node.tagName === 'linearGradient' && node.properties.id === 'shade'))
  assert.ok(svgNodes.some((node) => node.tagName === 'marker' && node.properties.id === 'arrow'))
  assertLanguageTarget(await page('tags/Consumer'), 'en', '/en/tags/Consumer')
  assertLanguageTarget(await page('en/tags/Consumer'), 'zh', '/tags/Consumer')
  assertLanguageTarget(await page('tags/中文标签'), 'en', '/en/tags')
  assertLanguageTarget(await page('en/tags/English-only'), 'zh', '/tags')
  for (const document of [home, englishHome, article, englishArticle]) {
    assert.equal(meta(document, 'og:image'), 'https://content.example.test/content/images/social.png')
    assert.equal(meta(document, 'twitter:image'), 'https://content.example.test/content/images/social.png')
    assert.match(String(meta(document, 'og:image:alt')), /内容站点 Content-owned blog/)
    assert.equal(meta(document, 'og:image:width'), undefined, 'Custom image dimensions must not be guessed')
  }
  assert.match(String(meta(home, 'og:image:alt')), /来自独立仓库的站点配置/)
  assert.match(String(meta(englishHome, 'og:image:alt')), /Configuration from the content repository/)
  assert.match(await readFile(join(output, 'feed.xml'), 'utf8'), /external-story/)
  assert.match(await readFile(join(output, 'en', 'feed.xml'), 'utf8'), /external-story/)
  assert.match(await readFile(join(output, 'sitemap.xml'), 'utf8'), /https:\/\/content\.example\.test/)
  await page('tags/Consumer')
  await page('search')
  const notFoundPage = await readFile(join(output, '404.html'), 'utf8')
  assert.doesNotMatch(notFoundPage, /href="\/(?:en\/)?_not-found(?:\/|")/)
  for (const document of [home, englishHome, article, englishArticle, notFoundPage, await page('tags/Consumer'), await page('en/search')]) {
    assert.match(document, /<link\b(?=[^>]*\brel="icon")(?=[^>]*\bhref="\/content\/images\/external\.svg")[^>]*>/)
    assert.doesNotMatch(document, /<link\b(?=[^>]*\brel="icon")(?=[^>]*\bhref="\/favicon\.svg")[^>]*>/)
  }
  await access(join(output, 'og.png'))
  for (const slug of ['figures', 'getting-started', 'draft']) {
    assert.equal(await exists(join(output, 'posts', `${slug}.html`)), false, `${slug} leaked into the export`)
    assert.equal(await exists(join(output, 'posts', slug, 'index.html')), false, `${slug} leaked into the export`)
  }
  assert.deepEqual((await readdir(content)).sort(), ['images', 'posts', 'site.json'])
  assert.equal(await readFile(join(content, 'posts', 'external-story.md'), 'utf8'), zhPost)

  const unrelated = join(work, 'Existing directory')
  await mkdir(unrelated)
  await writeFile(join(unrelated, 'keep.txt'), 'Keep this file')
  const minimal = join(work, 'Only Chinese content')
  const minimalOutput = join(minimal, 'out')
  await mkdir(join(minimal, 'posts'), { recursive: true })
  await writeFile(join(minimal, 'posts', 'lone.md'), '---\ntitle: 只有一篇中文文章\ndescription: 没有翻译、标签、分类或图片。\ndate: 2026-01-02\ntags: []\n---\n纯内容仓库也能生成完整的静态站。\n')
  const apiCheck = join(consumer, 'api-check.mjs')
  await writeFile(apiCheck, `import assert from 'node:assert/strict'\nimport { buildBlog } from '@swufefox/ak-blog/build'\nconst [contentDir, unrelated, minimal, minimalOutput] = process.argv.slice(2)\nawait assert.rejects(() => buildBlog({ contentDir, outDir: contentDir }))\nawait assert.rejects(() => buildBlog({ contentDir, outDir: unrelated }))\nawait buildBlog({ contentDir: minimal, outDir: minimalOutput })\n`)
  await run([apiCheck, content, unrelated, minimal, minimalOutput])
  assert.equal(await readFile(join(unrelated, 'keep.txt'), 'utf8'), 'Keep this file')
  assert.match(await page('posts/lone', minimalOutput), /只有一篇中文文章/)
  assert.equal(meta(await readFile(join(minimalOutput, 'index.html'), 'utf8'), 'og:image'), 'https://example.com/og.png')
  assert.equal(meta(await page('en', minimalOutput), 'og:image:width'), '1200')
  await page('en', minimalOutput)
  await page('tags', minimalOutput)
  await page('en/tags', minimalOutput)
  assert.doesNotMatch(await readFile(join(minimalOutput, 'en', 'feed.xml'), 'utf8'), /<item>/)
  assert.equal(await exists(join(minimalOutput, 'content', 'images', 'pipeline.svg')), false)
  assert.deepEqual((await readdir(minimal)).sort(), ['out', 'posts'])

  const previousHash = createHash('sha256').update(home).digest('hex')
  await writeFile(join(content, 'posts', 'broken.md'), '---\ndescription: Missing required title\ndate: 2026-01-04\ntags: []\n---\nInvalid article.\n')
  const failure = await run(buildArgs, { expectFailure: true })
  assert.match(failure, /broken\.md/)
  assert.equal(createHash('sha256').update(await readFile(join(output, 'index.html'))).digest('hex'), previousHash)
  console.log('Packed CLI and API verified: bilingual and minimal content, sketch SVG safety, language fallbacks, custom favicon/social images, static routes, drafts, safe targets and failed-rebuild preservation.')
} finally {
  await rm(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
}
