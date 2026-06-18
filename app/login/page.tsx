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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#f9fafb' }}>
      <div className="rounded-2xl shadow-sm border p-8 w-full max-w-sm" style={{ backgroundColor: '#ffffff', borderColor: '#f3f4f6' }}>
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#111827' }}>Connexion</h1>
        <p className="text-sm mb-6" style={{ color: '#9ca3af' }}>Accédez à votre dashboard</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 font-medium">Email</label>
            <input
              type="email"
              required
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" style={{ color: '#111827', backgroundColor: '#ffffff', colorScheme: 'light' }}
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 font-medium">Mot de passe</label>
            <input
              type="password"
              required
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" style={{ color: '#111827', backgroundColor: '#ffffff', colorScheme: 'light' }}
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
      </div>
    </div>
  )
}
