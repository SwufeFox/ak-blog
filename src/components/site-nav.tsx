 'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSyncExternalStore } from 'react'
import { AkMobileMenu } from '@swufefox/ak-ui-react'

import { homePath, searchPath, tagPath, tagsPath } from '@/lib/urls'
import { siteConfig, type Locale } from '@/site.config'

export interface NavLabels {
  home: string
  tags: string
  search: string
  about: string
  menu: string
  close: string
  language: string
}

interface Props {
  locale: Locale
  labels: NavLabels
  aboutUrl?: string
  otherLocale: Locale
  otherLocaleName: string
  otherTerms: string[]
  languageHref?: string
}

function noopSubscribe(): () => void {
  return () => {}
}

function switchTarget(pathname: string, from: Locale, to: Locale, otherTerms: string[]): string {
  const segments = pathname.split('/').filter(Boolean)
  if (segments[0] === from) segments.shift()
  if (segments[0] === 'tags' && segments.length === 2) {
    let term: string
    try {
      term = decodeURIComponent(segments[1])
    } catch {
      return tagsPath(to)
    }
    return otherTerms.includes(term) ? tagPath(to, term) : tagsPath(to)
  }
  const rest = segments.length > 0 ? `/${segments.join('/')}` : '/'
  if (to === siteConfig.defaultLocale) return rest
  return `/${to}${rest === '/' ? '' : rest}`
}

export function SiteNav({ locale, labels, aboutUrl, otherLocale, otherLocaleName, otherTerms, languageHref }: Props) {
  // ak-ui numbers its menu instances with a module level counter, so the ids it
  // renders on the server never match the ones the browser produces. The menu
  // is therefore mounted after hydration, where the counter is the only one.
  const pathname = usePathname()
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false)
  const computedLanguageHref = languageHref ?? switchTarget(pathname, locale, otherLocale, otherTerms)

  const isTags = pathname.includes('/tags')
  const isSearch = pathname.includes('/search')
  const isPost = pathname.includes('/posts/')

  const links = (
    <>
      <Link href={tagsPath(locale)} aria-current={isTags ? 'page' : undefined}>
        {labels.tags}
      </Link>
      <Link href={searchPath(locale)} aria-current={isSearch ? 'page' : undefined}>
        {labels.search}
      </Link>
      {aboutUrl ? (
        <a href={aboutUrl} rel="me">
          {labels.about}
          <span aria-hidden="true"> ↗</span>
        </a>
      ) : null}
    </>
  )

  return (
    <>
      <nav className="site-nav" aria-label={labels.menu}>
        {links}
        {!isPost ? (
          <Link
            href={computedLanguageHref}
            hrefLang={otherLocale}
            lang={otherLocale}
            aria-label={labels.language}
          >
            {otherLocaleName}
          </Link>
        ) : null}
      </nav>
      {mounted ? (
        <AkMobileMenu label={labels.menu} closeLabel={labels.close}>
          <Link href={homePath(locale)} aria-current={pathname === homePath(locale) ? 'page' : undefined}>
            {labels.home}
          </Link>
          {links}
          {!isPost ? (
            <Link
              href={computedLanguageHref}
              hrefLang={otherLocale}
              lang={otherLocale}
            >
              {otherLocaleName}
            </Link>
          ) : null}
        </AkMobileMenu>
      ) : null}
    </>
  )
}
