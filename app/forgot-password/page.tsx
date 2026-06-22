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
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-900">
      <div className="rounded-2xl shadow-sm border p-8 w-full max-w-sm bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
        <button onClick={() => router.push('/login')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 mb-6">
          <ArrowLeft size={16} /> Retour
        </button>
        <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Mot de passe oublié</h1>
        {sent ? (
          <div className="mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Un lien de réinitialisation a été envoyé à <strong>{email}</strong>.</p>
            <p className="text-xs text-gray-400">Vérifie tes spams si tu ne vois rien dans 2 minutes.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <input
              type="email"
              required
              placeholder="Ton email"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600 placeholder-gray-400"
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
