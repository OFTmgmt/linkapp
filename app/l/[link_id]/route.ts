import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', FR: 'France', GB: 'United Kingdom', CA: 'Canada',
  DE: 'Germany', MA: 'Morocco', BE: 'Belgium', CH: 'Switzerland',
  ES: 'Spain', IT: 'Italy', AU: 'Australia', BR: 'Brazil',
  MX: 'Mexico', NL: 'Netherlands', SE: 'Sweden', DZ: 'Algeria',
  TN: 'Tunisia', SN: 'Senegal', CM: 'Cameroon', CI: "Côte d'Ivoire",
  NG: 'Nigeria', GH: 'Ghana', PT: 'Portugal', RO: 'Romania',
  PL: 'Poland', RU: 'Russia', JP: 'Japan', KR: 'South Korea',
  IN: 'India', AE: 'United Arab Emirates', SA: 'Saudi Arabia',
}

const FLAG: Record<string, string> = {
  'United States': '🇺🇸', 'France': '🇫🇷', 'United Kingdom': '🇬🇧',
  'Canada': '🇨🇦', 'Germany': '🇩🇪', 'Morocco': '🇲🇦', 'Belgium': '🇧🇪',
  'Switzerland': '🇨🇭', 'Spain': '🇪🇸', 'Italy': '🇮🇹', 'Australia': '🇦🇺',
  'Brazil': '🇧🇷', 'Mexico': '🇲🇽', 'Netherlands': '🇳🇱', 'Sweden': '🇸🇪',
}

const SOURCE_EMOJI: Record<string, string> = {
  instagram: '📸', facebook: '👥', tiktok: '🎵', twitter: '🐦', direct: '🔗', other: '🌐',
}

// Known crawlers/scanners — do NOT redirect or record click for these
const BOT_UA = /facebookexternalhit|facebot|Googlebot|bingbot|Twitterbot|Slackbot|LinkedInBot|WhatsApp|Snapchat|Applebot|YandexBot|DuckDuckBot|baiduspider|AdsBot|meta-externalagent|PetalBot|Bytespider|SemrushBot|AhrefsBot|MJ12bot|DotBot|crawler|spider|python-requests|libwww|curl|wget|node-fetch|axios|scrapy/i

async function notifyDiscord(
  link_id: string, page_id: string,
  page_title: string, page_slug: string,
  referrer: string, device: string, country: string | null, city: string | null
) {
  const { data: pageData } = await supabase
    .from('pages').select('discord_webhook').eq('id', page_id).single()
  const webhook = pageData?.discord_webhook || process.env.DISCORD_WEBHOOK_URL
  if (!webhook) return

  const flag = country ? (FLAG[country] ?? '🌍') : '🌍'
  const source = SOURCE_EMOJI[referrer] ?? '🌐'
  const deviceEmoji = device === 'mobile' ? '📱' : device === 'tablet' ? '🖥️' : '💻'
  const location = city ? `${city}, ${country}` : country ?? 'Inconnu'

  await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [{
        color: 0xec4899,
        description: `**Clic sur [${page_title}](https://my-links-page.com/${page_slug})**`,
        fields: [
          { name: '📍 Localisation', value: `${flag} ${location}`, inline: true },
          { name: `${source} Source`, value: referrer, inline: true },
          { name: `${deviceEmoji} Appareil`, value: device, inline: true },
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'My Links Page' },
      }]
    })
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ link_id: string }> }
) {
  const ua = request.headers.get('user-agent') ?? ''

  // Block bots: return neutral page, no click recorded, no redirect revealed
  if (BOT_UA.test(ua)) {
    return new Response('<!DOCTYPE html><html><head><meta charset="utf-8"><title>My Links</title></head><body></body></html>', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  }

  const { link_id } = await params
  const { data: link } = await supabase
    .from('links')
    .select('url, page_id, pages(title, slug)')
    .eq('id', link_id)
    .single()

  if (!link) {
    return new Response('', { status: 404 })
  }

  const device = /tablet|ipad/i.test(ua) ? 'tablet' : /mobile|iphone|android/i.test(ua) ? 'mobile' : 'desktop'

  const ref = request.headers.get('referer') ?? ''
  const referrer = !ref ? 'direct'
    : ref.includes('instagram') ? 'instagram'
    : ref.includes('facebook') || ref.includes('fb.com') ? 'facebook'
    : ref.includes('tiktok') ? 'tiktok'
    : ref.includes('twitter') || ref.includes('x.com') ? 'twitter'
    : 'other'

  const countryCode = request.headers.get('x-vercel-ip-country')
  const country = countryCode ? (COUNTRY_NAMES[countryCode] ?? countryCode) : null
  const rawCity = request.headers.get('x-vercel-ip-city')
  const city = rawCity ? decodeURIComponent(rawCity) : null

  await supabase.from('clicks').insert({ link_id, referrer, device, country, city })

  const page = link.pages as unknown as { title: string; slug: string }
  if (page) {
    notifyDiscord(link_id, link.page_id, page.title, page.slug, referrer, device, country, city).catch(() => {})
  }

  const dest = link.url
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Chargement...</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:linear-gradient(135deg,#ff6eb4 0%,#a855f7 100%);display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:-apple-system,sans-serif}.box{text-align:center;color:#fff}.spinner{width:44px;height:44px;border:3px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 20px}@keyframes spin{to{transform:rotate(360deg)}}p{font-size:15px;opacity:.85;font-weight:500}</style></head><body><div class="box"><div class="spinner"></div><p>Chargement...</p></div><script>window.location.replace(${JSON.stringify(dest)})</script></body></html>`
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
