'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'

function getDevice(): string {
  const ua = navigator.userAgent
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet'
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile'
  return 'desktop'
}

function getReferrerSource(): string {
  const ref = document.referrer
  if (!ref) return 'direct'
  if (ref.includes('instagram.com')) return 'instagram'
  if (ref.includes('facebook.com') || ref.includes('fb.com')) return 'facebook'
  if (ref.includes('tiktok.com')) return 'tiktok'
  if (ref.includes('twitter.com') || ref.includes('x.com')) return 'twitter'
  if (ref.includes('snapchat.com')) return 'snapchat'
  return 'other'
}

export default function PageViewTracker({ pageId }: { pageId: string }) {
  useEffect(() => {
    async function track() {
      const supabase = createClient()
      const device = getDevice()
      const referrer = getReferrerSource()

      // Use Vercel's built-in geo API (no rate limit, no external call)
      let country = null
      let city = null
      try {
        const res = await fetch('/api/geo')
        if (res.ok) {
          const geo = await res.json()
          country = geo.country ?? null
          city = geo.city ?? null
        }
      } catch {}

      await supabase.from('page_views').insert({ page_id: pageId, referrer, device, country, city })
    }
    track()
  }, [pageId])

  return null
}
