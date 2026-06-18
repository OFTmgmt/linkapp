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

  const size = link.btn_size || 'medium'
  const width = link.btn_width || 'full'
  const animation = link.btn_animation || 'none'
  const align = link.btn_align || 'center'

  const sizeClasses: Record<string, string> = {
    small: 'py-2 px-4 text-sm',
    medium: 'py-4 px-6 text-base',
    large: 'py-5 px-8 text-lg',
    xl: 'py-6 px-10 text-xl',
  }
  const animationClasses: Record<string, string> = {
    none: '',
    bounce: 'animate-bounce',
    pulse: 'animate-pulse',
    ping: 'animate-[wiggle_0.8s_ease-in-out_infinite]',
  }
  const widthClass = width === 'full' ? 'w-full' : 'w-auto mx-auto'
  const alignClass = align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center'
  const wrapClass = width === 'full' ? 'w-full' : align === 'left' ? 'flex justify-start' : align === 'right' ? 'flex justify-end' : 'flex justify-center'

  return (
    <>
      <div className={wrapClass}>
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className={`block font-bold transition-all ${widthClass} ${alignClass} ${sizeClasses[size] || sizeClasses.medium} ${animationClasses[animation]}`}
          style={{
            background: page.button_bg || 'rgba(255,255,255,0.2)',
            color: page.button_text_color || '#ffffff',
            borderRadius: page.button_radius || '1rem',
            border: page.button_border || 'none',
            boxShadow: page.button_shadow ? '0 8px 30px rgba(0,0,0,0.4)' : '0 4px 15px rgba(0,0,0,0.2)',
            animationDuration: animation === 'bounce' ? '1.5s' : undefined,
          }}
        >
          {link.label}
        </a>
      </div>

      {showGate && (
        <AgeGate
          onConfirm={handleConfirm}
          onCancel={() => setShowGate(false)}
        />
      )}
    </>
  )
}
