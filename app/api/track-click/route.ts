import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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
  instagram: '📸', facebook: '👥', tiktok: '🎵', twitter: '🐦',
  direct: '🔗', other: '🌐',
}

async function sendDiscordNotification(
  link_id: string, page_title: string, page_slug: string,
  referrer: string, device: string, country: string | null, city: string | null
) {
  const { data: linkData } = await supabase
    .from('links').select('page_id').eq('id', link_id).single()
  let pageWebhook: string | null = null
  if (linkData?.page_id) {
    const { data: pageData } = await supabase
      .from('pages').select('discord_webhook').eq('id', linkData.page_id).single()
    pageWebhook = pageData?.discord_webhook ?? null
  }

  const webhook = pageWebhook || process.env.DISCORD_WEBHOOK_URL
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
          { name: `${source} Source`, value: referrer ?? 'direct', inline: true },
          { name: `${deviceEmoji} Appareil`, value: device ?? 'unknown', inline: true },
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'My Links Page' },
      }]
    })
  })
}

export async function POST(request: NextRequest) {
  const { link_id, page_title, page_slug, referrer, device } = await request.json()

  // Read geo from Vercel headers — instant, no external API, no rate limit
  const countryCode = request.headers.get('x-vercel-ip-country')
  const country = countryCode ? (COUNTRY_NAMES[countryCode] ?? countryCode) : null
  const rawCity = request.headers.get('x-vercel-ip-city')
  const city = rawCity ? decodeURIComponent(rawCity) : null

  // Insert click — critical, must complete before returning response
  const { error } = await supabase.from('clicks').insert({ link_id, referrer, device, country, city })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  // Discord notification — fire without awaiting so response is immediate
  sendDiscordNotification(link_id, page_title, page_slug, referrer, device, country, city).catch(() => {})

  return NextResponse.json({ ok: true })
}
