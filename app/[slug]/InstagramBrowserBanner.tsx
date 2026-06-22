'use client'
import { useEffect, useState } from 'react'

export default function InstagramBrowserBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent
    if (/Instagram/i.test(ua)) setShow(true)
  }, [])

  if (!show) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-4 flex items-start gap-3 max-w-sm mx-auto border border-gray-100">
        <span className="text-2xl flex-shrink-0">🌐</span>
        <div className="flex-1">
          <p className="font-semibold text-gray-900 text-sm">Open in your browser</p>
          <p className="text-gray-500 text-xs mt-0.5">
            Tap <strong>···</strong> then <strong>"Open in external browser"</strong> for the best experience
          </p>
        </div>
        <button onClick={() => setShow(false)} className="text-gray-300 hover:text-gray-500 text-lg leading-none flex-shrink-0">✕</button>
      </div>
    </div>
  )
}
