import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'

import { defaultLocale, siteConfig } from '@/site.config'

export const dynamic = 'force-static'

const notoSansCjk = await readFile(join(process.cwd(), 'src/assets/fonts/NotoSansCJKsc-Regular.otf'))
const hostname = new URL(siteConfig.url).hostname
const titleSize = siteConfig.title.length > 28 ? 54 : siteConfig.title.length > 16 ? 68 : 82
const description = siteConfig.description[defaultLocale]

export async function GET() {
  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden', background: '#0f0f10', color: '#f8f8f5', fontFamily: 'Noto Sans CJK' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '78%', padding: '54px 52px 48px 64px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 24, color: '#b5b5b0' }}>{siteConfig.suffix}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 300, overflow: 'hidden' }}>
            <div style={{ fontSize: titleSize, lineHeight: 1.12, fontWeight: 700, letterSpacing: -1, overflow: 'hidden', maxHeight: 200 }}>{siteConfig.title}</div>
            <div style={{ display: 'flex', width: 150, height: 8, marginTop: 20, background: '#ffd800' }} />
            <div style={{ marginTop: 20, fontSize: 24, lineHeight: 1.4, color: '#b5b5b0', overflow: 'hidden', maxHeight: 100 }}>{description}</div>
          </div>
          <div style={{ fontSize: 18, color: '#9c9c9c' }}>{hostname}</div>
        </div>
        <div style={{ display: 'flex', width: '22%', background: '#ffd800' }} />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'Noto Sans CJK', data: notoSansCjk, style: 'normal', weight: 400 }],
    },
  )
}
