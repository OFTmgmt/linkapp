'use client'
import { useState } from 'react'

export default function AgeGate({ onConfirm }: { onConfirm: () => void }) {
  const [step, setStep] = useState<1 | 2>(1)
  const [animating, setAnimating] = useState(false)

  function handleClick() {
    if (step === 1) {
      setAnimating(true)
      setTimeout(() => {
        setAnimating(false)
        setStep(2)
      }, 400)
    } else {
      setAnimating(true)
      setTimeout(() => {
        onConfirm()
      }, 400)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <button
        onClick={handleClick}
        className={`bg-white/90 rounded-3xl px-8 py-6 text-center shadow-2xl max-w-xs w-full mx-4 transition-all duration-300 ${animating ? 'scale-95 opacity-70' : 'scale-100 opacity-100 hover:scale-105'}`}
      >
        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-500 text-white text-sm font-bold mb-3 transition-all duration-300 ${animating ? 'scale-110' : ''}`}>
          18+
        </div>
        <p className="font-bold text-gray-800 text-lg leading-tight">
          {step === 1 ? 'Êtes-vous majeur ?' : 'Confirmer votre âge'}
        </p>
        <p className="text-gray-400 text-sm mt-1">
          {step === 1 ? 'Cliquez pour entrer' : 'Cliquez à nouveau pour continuer'}
        </p>
        <div className="flex justify-center gap-1 mt-4">
          <div className={`w-2 h-2 rounded-full transition-all duration-300 ${step === 1 ? 'bg-red-400 scale-125' : 'bg-gray-200'}`} />
          <div className={`w-2 h-2 rounded-full transition-all duration-300 ${step === 2 ? 'bg-red-400 scale-125' : 'bg-gray-200'}`} />
        </div>
      </button>
    </div>
  )
}
