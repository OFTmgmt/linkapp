'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('8 caractères minimum'); return }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false) }
    else { setDone(true); setTimeout(() => router.push('/dashboard'), 2000) }
  }

  const inputClass = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600 placeholder-gray-400"

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-900">
      <div className="rounded-2xl shadow-sm border p-8 w-full max-w-sm bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
        <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Nouveau mot de passe</h1>
        {done ? (
          <p className="text-sm text-green-500 mt-4">Mot de passe mis à jour. Redirection...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Nouveau mot de passe"
                className={`${inputClass} pr-10`}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-2.5 text-gray-400">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="Confirmer le mot de passe"
              className={inputClass}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pink-500 text-white py-2.5 rounded-lg font-medium hover:bg-pink-600 disabled:opacity-50"
            >
              {loading ? 'Mise à jour...' : 'Changer le mot de passe'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
