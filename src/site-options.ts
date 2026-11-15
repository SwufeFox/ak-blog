export interface SiteOptions {
  title?: string
  suffix?: string
  description?: Partial<Record<'zh' | 'en', string>>
  url?: string
  favicon?: string
  socialImage?: string
  author?: string
  email?: string
  about?: string
  repo?: string
  sameAs?: string[]
  postsOnHome?: number
  license?: { name?: string; url?: string }
}

const textFields: Record<string, true> = {
  title: true,
  suffix: true,
  url: true,
  favicon: true,
  socialImage: true,
  author: true,
  email: true,
  about: true,
  repo: true,
}

function object(value: unknown, source: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${source}: expected a JSON object`)
  }
  return value as Record<string, unknown>
}

function text(value: unknown, source: string): void {
  if (typeof value !== 'string') throw new Error(`${source}: expected a string`)
}

function textRecord(value: unknown, keys: readonly string[], source: string): void {
  for (const [key, entry] of Object.entries(object(value, source))) {
    if (!keys.includes(key)) throw new Error(`${source}: unknown field "${key}"`)
    text(entry, `${source}.${key}`)
  }
}

/** Validate the content repository's optional site.json without importing Node APIs. */
export function validateSiteOptions(value: unknown, source: string): SiteOptions {
  const options = object(value, source)
  for (const [key, entry] of Object.entries(options)) {
    if (textFields[key] === true) {
      text(entry, `${source}.${key}`)
      continue
    }
    switch (key) {
      case 'description':
        textRecord(entry, ['zh', 'en'], `${source}.description`)
        break
      case 'license':
        textRecord(entry, ['name', 'url'], `${source}.license`)
        break
      case 'sameAs':
        if (!Array.isArray(entry) || entry.some((item) => typeof item !== 'string')) {
          throw new Error(`${source}.sameAs: expected an array of strings`)
        }
        break
      case 'postsOnHome':
        if (typeof entry !== 'number' || !Number.isInteger(entry) || entry < 0) {
          throw new Error(`${source}.postsOnHome: expected a non-negative integer`)
        }
        break
      default:
        throw new Error(`${source}: unknown field "${key}"`)
    }
  }

  const result = { ...options } as SiteOptions
  if (result.url !== undefined) {
    let url: URL
    try {
      url = new URL(result.url)
    } catch {
      throw new Error(`${source}.url: expected an absolute HTTP(S) origin`)
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
      throw new Error(`${source}.url: expected an HTTP(S) origin without a path, query, fragment or credentials`)
    }
    result.url = url.origin
  }
  for (const field of ['favicon', 'socialImage'] as const) {
    const value = result[field]
    if (value === undefined) continue
    try {
      const image = new URL(value, 'https://example.com')
      if (!/^(?:\/(?![\\/])|https?:\/\/)/i.test(value)
        || !['http:', 'https:'].includes(image.protocol) || image.username || image.password
        || value.includes('\\')) {
        throw new Error('Invalid image URL')
      }
    } catch {
      throw new Error(`${source}.${field}: expected a root-relative path or absolute HTTP(S) URL`)
    }
  }
  return result
}
