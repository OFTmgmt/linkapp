'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-900">
      <div className="rounded-2xl shadow-sm border p-8 w-full max-w-sm bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
        <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Connexion</h1>
        <p className="text-sm mb-6 text-gray-400">Accédez à votre dashboard</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Email</label>
            <input
              type="email"
              required
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Mot de passe</label>
            <input
              type="password"
              required
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pink-500 text-white py-2.5 rounded-lg font-medium hover:bg-pink-600 disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        <p className="text-center mt-4">
          <a href="/forgot-password" className="text-xs text-gray-400 hover:text-pink-500">Mot de passe oublié ?</a>
        </p>
      </div>
    </div>
  )
}
