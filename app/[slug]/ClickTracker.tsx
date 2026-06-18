'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Link, Page } from '@/lib/types'
import AgeGate from './AgeGate'

export default function ClickTracker({ link, page }: { link: Link, page: Page }) {
  const [showGate, setShowGate] = useState(false)

  async function handleClick(e: React.MouseEvent) {
    if (page.age_gate) {
      e.preventDefault()
      setShowGate(true)
    } else {
      await supabase.from('clicks').insert({ link_id: link.id })
    }
  }

  async function handleConfirm() {
    await supabase.from('clicks').insert({ link_id: link.id })
    setShowGate(false)
    window.open(link.url, '_blank')
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
