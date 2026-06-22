'use client'
import { Page, Link } from '@/lib/types'
import LocationBadge from './LocationBadge'
import ClickTracker from './ClickTracker'
import PageViewTracker from './PageViewTracker'
import InstagramBrowserBanner from './InstagramBrowserBanner'

export default function PageContent({ page, links }: { page: Page, links: Link[] }) {
  const isGradient = page.background_color.startsWith('linear-gradient')
  const bgStyle = page.background_image
    ? { backgroundImage: `url(${page.background_image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : isGradient
    ? { backgroundImage: page.background_color }
    : { backgroundColor: page.background_color }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12 relative" style={{ ...bgStyle, paddingTop: `${(page.content_offset ?? 0) + 48}px` }}>
      {page.background_image && (
        <div className="absolute inset-0 bg-black" style={{ opacity: (page.bg_overlay ?? 15) / 100 }} />
      )}

      <PageViewTracker pageId={page.id} />
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-4">
        {page.avatar_url && (
          <img src={page.avatar_url} alt={page.title} className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg" />
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
      <InstagramBrowserBanner />
    </div>
  )
}
