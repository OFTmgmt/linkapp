import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

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

export async function POST(request: Request) {
  const { link_id, page_title, page_slug, referrer, device, country, city } = await request.json()

  await supabase.from('clicks').insert({ link_id, referrer, device, country, city })

  const webhook = process.env.DISCORD_WEBHOOK_URL
  if (webhook) {
    const flag = FLAG[country] ?? '🌍'
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

  return NextResponse.json({ ok: true })
}
