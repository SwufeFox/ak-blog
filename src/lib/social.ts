import { siteConfig, type Locale } from '@/site.config'

const base = siteConfig.url.replace(/\/$/, '')

export function getSocialImage(locale: Locale) {
  const title = `${siteConfig.title} ${siteConfig.suffix}`.trim()
  const alt = `${title} — ${siteConfig.description[locale]}`
  if (siteConfig.socialImage) {
    const url = /^https?:\/\//i.test(siteConfig.socialImage)
      ? siteConfig.socialImage
      : `${base}${siteConfig.socialImage}`
    return { url, alt }
  }

  return {
    url: `${base}/og.png`,
    width: 1200,
    height: 630,
    alt,
  }
}
