'use client'
import { useState } from 'react'
import { Page, Link } from '@/lib/types'
import AgeGate from './AgeGate'
import LocationBadge from './LocationBadge'
import ClickTracker from './ClickTracker'

export default function PageContent({ page, links }: { page: Page, links: Link[] }) {
  const [confirmed, setConfirmed] = useState(!page.age_gate)

  const isGradient = page.background_color.startsWith('linear-gradient')
  const bgStyle = page.background_image
    ? {
        backgroundImage: `url(${page.background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : isGradient
    ? { backgroundImage: page.background_color }
    : { backgroundColor: page.background_color }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative" style={bgStyle}>
      {page.background_image && <div className="absolute inset-0 bg-black/40" />}
      {!confirmed && <AgeGate onConfirm={() => setConfirmed(true)} />}

      <div className={`relative z-10 w-full max-w-sm flex flex-col items-center gap-4 transition-all duration-500 ${!confirmed ? 'blur-md pointer-events-none' : ''}`}>
        {page.avatar_url && (
          <img src={page.avatar_url} alt={page.title} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg" />
        )}

        <h1 className="text-2xl font-bold text-white drop-shadow">{page.title}</h1>

        {page.bio && <p className="text-white/80 text-center text-sm">{page.bio}</p>}

        {page.show_location && <LocationBadge />}

        <div className="w-full space-y-3 mt-2">
          {links.map(link => (
            <ClickTracker key={link.id} link={link} page={page} />
          ))}
        </div>

        <p className="text-white/40 text-xs mt-6">Powered by LinkApp</p>
      </div>
    </div>
  )
}
