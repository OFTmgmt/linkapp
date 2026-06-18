'use client'
import { useState } from 'react'
import { Link, Page } from '@/lib/types'
import AgeGate from './AgeGate'

export default function ClickTracker({ link, page }: { link: Link, page: Page }) {
  const [showGate, setShowGate] = useState(false)

  function getMeta() {
    const ua = navigator.userAgent
    const device = /tablet|ipad/i.test(ua) ? 'tablet' : /mobile|iphone|android/i.test(ua) ? 'mobile' : 'desktop'
    const ref = document.referrer
    const referrer = !ref ? 'direct' : ref.includes('instagram') ? 'instagram' : ref.includes('facebook') || ref.includes('fb.com') ? 'facebook' : ref.includes('tiktok') ? 'tiktok' : 'other'
    return { device, referrer }
  }

  function trackClick() {
    const meta = getMeta()
    fetch('/api/track-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link_id: link.id, page_title: page.title, page_slug: page.slug, ...meta }),
    })
  }

  async function handleClick(e: React.MouseEvent) {
    if (page.age_gate) {
      e.preventDefault()
      setShowGate(true)
    } else {
      trackClick()
    }
  }

  async function handleConfirm() {
    setShowGate(false)
    window.open(link.url, '_blank')
    trackClick()
  }

  return (
    <>
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="block w-full text-center font-semibold py-4 px-6 transition-all"
        style={{
          background: page.button_bg || 'rgba(255,255,255,0.2)',
          color: page.button_text_color || '#ffffff',
          borderRadius: page.button_radius || '1rem',
          border: page.button_border || 'none',
          boxShadow: page.button_shadow ? '0 4px 15px rgba(0,0,0,0.3)' : 'none',
        }}
      >
        {link.label}
      </a>

      {showGate && (
        <AgeGate
          onConfirm={handleConfirm}
          onCancel={() => setShowGate(false)}
        />
      )}
    </>
  )
}
