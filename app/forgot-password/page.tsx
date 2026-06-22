'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#f9fafb', colorScheme: 'light' }}>
      <div className="rounded-2xl shadow-sm border p-8 w-full max-w-sm" style={{ backgroundColor: '#ffffff', borderColor: '#f3f4f6', color: '#111827' }}>
        <button onClick={() => router.push('/login')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-6">
          <ArrowLeft size={16} /> Retour
        </button>
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#111827' }}>Mot de passe oublié</h1>
        {sent ? (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Un lien de réinitialisation a été envoyé à <strong>{email}</strong>.</p>
            <p className="text-xs text-gray-400">Vérifie tes spams si tu ne vois rien dans 2 minutes.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <input
              type="email"
              required
              placeholder="Ton email"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              style={{ color: '#111827', backgroundColor: '#ffffff', colorScheme: 'light', borderColor: '#e5e7eb' }}
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pink-500 text-white py-2.5 rounded-lg font-medium hover:bg-pink-600 disabled:opacity-50"
            >
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
