import type { Metadata } from 'next'
import '@swufefox/ak-ui-react/style.css'
import 'katex/dist/katex.min.css'
import '@/styles/components.css'
import '@/styles/globals.css'

import { AkGridBackdrop } from '@swufefox/ak-ui-react'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { otherLocale, ui } from '@/lib/i18n'
import { getCategoryCounts, getTags } from '@/lib/posts'
import { getSocialImage } from '@/lib/social'
import { THEME_COLORS, THEME_STORAGE_KEY } from '@/lib/theme'
import { homePath } from '@/lib/urls'
import { siteConfig, type Locale } from '@/site.config'

/** Runs before paint so the page never flashes the wrong colour scheme or chrome. */
const themeScript = `(function(){var root=document.documentElement;var colors=${JSON.stringify(THEME_COLORS)};function paint(t){root.dataset.akTheme=t;var m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement('meta');m.name='theme-color';document.head.appendChild(m)}m.content=colors[t]||colors.archive}try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='archive'||t==='light'){paint('archive');return}if(t==='terminal'||t==='dark'){paint('terminal');return}}catch(e){}paint('archive')})()`

export function SiteHead() {
  return (
    <>
      <meta name="theme-color" content={THEME_COLORS.archive} />
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
    </>
  )
}

export function getLayoutMetadata(locale: Locale): Metadata {
  const socialImage = getSocialImage(locale)

  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: `${siteConfig.title} ${siteConfig.suffix}`,
      template: `%s · ${siteConfig.title}`,
    },
    description: siteConfig.description[locale],
    applicationName: siteConfig.title,
    authors: [{ name: siteConfig.author }],
    creator: siteConfig.author,
    alternates: {
      canonical: homePath(locale),
      languages: Object.fromEntries(
        siteConfig.locales.map((entry) => [entry, homePath(entry)]),
      ),
    },
    openGraph: {
      type: 'website',
      siteName: siteConfig.title,
      title: `${siteConfig.title} ${siteConfig.suffix}`,
      description: siteConfig.description[locale],
      locale,
      images: [socialImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${siteConfig.title} ${siteConfig.suffix}`,
      description: siteConfig.description[locale],
      images: [socialImage],
    },
    robots: { index: true, follow: true },
    icons: { icon: siteConfig.favicon },
  }
}

export default async function SiteShell({
  children,
  locale: resolved,
  languageHref,
}: {
  children: React.ReactNode
  locale: Locale
  languageHref?: string
}) {
  const copy = ui(resolved)
  const target = otherLocale(resolved)
  const [tags, categories] = await Promise.all([getTags(target), getCategoryCounts(target)])
  const otherTerms = [...new Set([...tags.map((tag) => tag.name), ...categories.map((category) => category.name)])]

  return (
    <div className="site-canvas">
      <AkGridBackdrop variant="grid" className="site-canvas__grid" aria-hidden="true" />
      <div className="shell">
        <a className="skip" href="#main">
          {copy.skip}
        </a>
        <SiteHeader locale={resolved} otherLocale={target} otherTerms={otherTerms} languageHref={languageHref} />
        <main id="main">{children}</main>
        <SiteFooter locale={resolved} />
      </div>
    </div>
  )
}
