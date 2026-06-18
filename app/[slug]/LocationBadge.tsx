'use client'
import { useEffect, useState } from 'react'
import { MapPin } from 'lucide-react'

export default function LocationBadge() {
  const [location, setLocation] = useState<string | null>(null)

  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(data => {
        if (data.city) setLocation(`${data.city}, ${data.country_name}`)
      })
      .catch(() => {})
  }, [])

  if (!location) return null

  return (
    <div className="flex items-center gap-1.5 bg-white/20 text-white text-sm px-4 py-2 rounded-full backdrop-blur-sm">
      <MapPin size={14} />
      <span>{location}</span>
    </div>
  )
}
