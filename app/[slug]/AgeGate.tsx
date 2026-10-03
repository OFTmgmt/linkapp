'use client'
import { useState } from 'react'
import { X } from 'lucide-react'

export default function AgeGate({ onConfirm, onCancel }: { onConfirm: () => void, onCancel?: () => void }) {
  const [animating, setAnimating] = useState(false)

  function handleClick() {
    setAnimating(true)
    // petit délai pour l'animation avant de rediriger
    setTimeout(() => { onConfirm() }, 350)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative">
        {onCancel && (
          <button onClick={onCancel} className="absolute -top-4 -right-4 bg-white rounded-full p-1 text-gray-400 hover:text-gray-600 shadow-md z-10">
            <X size={16} />
          </button>
        )}
        <div className={`bg-white/95 rounded-3xl px-8 py-7 text-center shadow-2xl max-w-xs w-full mx-4 transition-all duration-300 ${animating ? 'scale-95 opacity-70' : 'scale-100 opacity-100'}`}>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500 text-white text-base font-bold mb-3">
            18+
          </div>
          <p className="font-bold text-gray-800 text-lg leading-tight">
            Contenu réservé aux adultes
          </p>
          <p className="text-gray-500 text-sm mt-1.5">
            Vous devez avoir 18 ans ou plus pour accéder à ce contenu.
          </p>
          <button
            onClick={handleClick}
            disabled={animating}
            className="mt-5 w-full bg-red-500 text-white font-semibold rounded-2xl py-3 transition-all duration-200 hover:bg-red-600 active:scale-95 disabled:opacity-70"
          >
            {"J'ai 18 ans ou plus"}
          </button>
        </div>
      </div>
    </div>
  )
}
