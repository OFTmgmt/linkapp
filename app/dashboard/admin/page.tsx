'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRole } from '@/lib/useRole'
import { ArrowLeft, Plus, Trash2, Eye, EyeOff } from 'lucide-react'

type User = { id: string; email: string; name: string; role: string; created_at: string }

export default function AdminPage() {
  const router = useRouter()
  const { isAdmin, loading: roleLoading } = useRole()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ email: '', password: '', name: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!roleLoading && !isAdmin) router.push('/dashboard')
  }, [roleLoading, isAdmin])

  useEffect(() => { if (isAdmin) loadUsers() }, [isAdmin])

  async function loadUsers() {
    setLoading(true)
    const res = await fetch('/api/list-users')
    const data = await res.json()
    setUsers(data.users ?? [])
    setLoading(false)
  }

  async function createUser() {
    setError(''); setSuccess('')
    if (!form.email || !form.password || !form.name) { setError('Tous les champs sont requis'); return }
    if (form.password.length < 8) { setError('Mot de passe trop court (8 min)'); return }
    setCreating(true)
    const res = await fetch('/api/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (data.error) { setError(data.error) }
    else { setSuccess(`Compte créé : ${data.email}`); setForm({ email: '', password: '', name: '' }); loadUsers() }
    setCreating(false)
  }

  async function deleteUser(userId: string, email: string) {
    if (!confirm(`Supprimer le compte ${email} ?`)) return
    const res = await fetch('/api/delete-user', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    const data = await res.json()
    if (data.error) alert(data.error)
    else loadUsers()
  }

  if (roleLoading || loading) return <div className="flex items-center justify-center h-screen text-gray-500">Chargement...</div>
  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></button>
          <h1 className="text-xl font-bold text-gray-900">Gestion des comptes</h1>
        </div>

        {/* Créer un compte manager */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Plus size={18} className="text-pink-500" /> Créer un compte manager
          </h2>
          <div className="space-y-3">
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              placeholder="Prénom / Nom"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
            <div className="relative">
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 pr-10"
                placeholder="Mot de passe (8 caractères min)"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
              <button onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}
            <button
              onClick={createUser}
              disabled={creating}
              className="w-full bg-pink-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-pink-600 disabled:opacity-50"
            >
              {creating ? 'Création...' : 'Créer le compte'}
            </button>
          </div>
        </div>

        {/* Liste des comptes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Comptes existants ({users.length})</h2>
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between py-3 px-4 rounded-lg bg-gray-50">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{u.name || u.email}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {u.role === 'admin' ? 'Admin' : 'Manager'}
                  </span>
                  {u.role !== 'admin' && (
                    <button onClick={() => deleteUser(u.id, u.email)} className="text-gray-300 hover:text-red-400">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
