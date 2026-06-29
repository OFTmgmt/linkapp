'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRole } from '@/lib/useRole'
import { createClient } from '@/lib/supabase-browser'
import { ArrowLeft, Plus, Trash2, Eye, EyeOff, FolderOpen, UserCheck, KeyRound } from 'lucide-react'

const supabase = createClient()

type User = { id: string; email: string; name: string; role: string; created_at: string }
type Folder = { id: string; name: string; owner_id: string | null; page_count: number }

export default function AdminPage() {
  const router = useRouter()
  const { isAdmin, loading: roleLoading } = useRole()
  const [users, setUsers] = useState<User[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ email: '', password: '', name: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [creating, setCreating] = useState(false)
  const [assigning, setAssigning] = useState<string | null>(null)
  const [resetTarget, setResetTarget] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetSuccess, setResetSuccess] = useState('')
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    if (!roleLoading && !isAdmin) router.push('/dashboard')
  }, [roleLoading, isAdmin])

  useEffect(() => { if (isAdmin) { loadUsers(); loadFolders() } }, [isAdmin])

  async function loadUsers() {
    setLoading(true)
    const res = await fetch('/api/list-users')
    const data = await res.json()
    setUsers(data.users ?? [])
    setLoading(false)
  }

  async function loadFolders() {
    const { data: foldersData } = await supabase.from('folders').select('*').order('created_at')
    const { data: pagesData } = await supabase.from('pages').select('id, folder_id')
    const counts: Record<string, number> = {}
    pagesData?.forEach(p => { counts[p.folder_id] = (counts[p.folder_id] || 0) + 1 })
    setFolders((foldersData || []).map(f => ({ ...f, page_count: counts[f.id] || 0 })))
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
    if (data.error) alert(typeof data.error === 'string' ? data.error : JSON.stringify(data.error))
    else loadUsers()
  }

  async function resetPassword() {
    setResetError(''); setResetSuccess('')
    if (!newPassword || newPassword.length < 8) { setResetError('8 caractères minimum'); return }
    if (!resetTarget) return
    setResetting(true)
    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: resetTarget.id, newPassword }),
    })
    const data = await res.json()
    if (data.error) { setResetError(data.error) }
    else { setResetSuccess('Mot de passe mis à jour !'); setNewPassword('') }
    setResetting(false)
  }

  async function assignFolder(folderId: string, ownerId: string) {
    setAssigning(folderId)
    await supabase.from('folders').update({ owner_id: ownerId }).eq('id', folderId)
    await supabase.from('pages').update({ owner_id: ownerId }).eq('folder_id', folderId)
    await loadFolders()
    setAssigning(null)
  }

  function getOwnerName(ownerId: string | null) {
    if (!ownerId) return 'Non attribué'
    const u = users.find(u => u.id === ownerId)
    return u ? (u.name || u.email) : 'Inconnu'
  }

  if (roleLoading || loading) return <div className="flex items-center justify-center h-screen text-gray-500 dark:text-gray-400">Chargement...</div>
  if (!isAdmin) return null

  const managers = users.filter(u => u.role !== 'admin')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><ArrowLeft size={20} /></button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Gestion des comptes</h1>
        </div>

        {/* Créer un compte manager */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
          <h2 className="font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <Plus size={18} className="text-pink-500" /> Créer un compte manager
          </h2>
          <div className="space-y-3">
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              placeholder="Prénom / Nom"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
            <div className="relative">
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 pr-10 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                placeholder="Mot de passe (8 caractères min)"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
              <button onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
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

        {/* Attribution des dossiers */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
          <h2 className="font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
            <UserCheck size={18} className="text-pink-500" /> Attribution des dossiers
          </h2>
          <p className="text-xs text-gray-400 mb-4">Assigne chaque dossier (et ses pages) à un manager</p>
          {folders.length === 0 ? (
            <p className="text-sm text-gray-300 text-center py-4">Aucun dossier</p>
          ) : (
            <div className="space-y-2">
              {folders.map(folder => (
                <div key={folder.id} className="flex items-center justify-between py-3 px-4 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <div className="flex items-center gap-3">
                    <FolderOpen size={16} className="text-pink-400" />
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white text-sm">{folder.name}</p>
                      <p className="text-xs text-gray-400">{folder.page_count} page{folder.page_count !== 1 ? 's' : ''} · {getOwnerName(folder.owner_id)}</p>
                    </div>
                  </div>
                  <select
                    className="border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    value={folder.owner_id || ''}
                    disabled={assigning === folder.id}
                    onChange={e => assignFolder(folder.id, e.target.value)}
                  >
                    <option value="" disabled>Attribuer à...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.email} ({u.role === 'admin' ? 'Admin' : 'Manager'})
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Liste des comptes */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Comptes existants ({users.length})</h2>
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between py-3 px-4 rounded-lg bg-gray-50 dark:bg-gray-700">
                <div>
                  <p className="font-medium text-gray-800 dark:text-white text-sm">{u.name || u.email}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                  <p className="text-xs text-gray-300">{folders.filter(f => f.owner_id === u.id).length} dossier(s) attribué(s)</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {u.role === 'admin' ? 'Admin' : 'Manager'}
                  </span>
                  <button onClick={() => { setResetTarget(u); setNewPassword(''); setResetError(''); setResetSuccess('') }} className="text-gray-300 hover:text-blue-400 dark:text-gray-500 dark:hover:text-blue-400" title="Changer le mot de passe">
                    <KeyRound size={16} />
                  </button>
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

      {resetTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-lg dark:text-white mb-1">Changer le mot de passe</h3>
            <p className="text-sm text-gray-400 mb-4"><span className="text-gray-700 dark:text-gray-300 font-medium">{resetTarget.name || resetTarget.email}</span></p>
            <div className="relative">
              <input
                type={showNewPw ? 'text' : 'password'}
                placeholder="Nouveau mot de passe (8 min)"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 pr-10 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowNewPw(p => !p)} className="absolute right-3 top-2.5 text-gray-400 dark:text-gray-500">
                {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {resetError && <p className="text-sm text-red-500 mt-2">{resetError}</p>}
            {resetSuccess && <p className="text-sm text-green-600 mt-2">{resetSuccess}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={() => setResetTarget(null)} className="flex-1 border rounded-lg py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600">Fermer</button>
              <button onClick={resetPassword} disabled={resetting} className="flex-1 bg-pink-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-pink-600 disabled:opacity-50">
                {resetting ? 'Mise à jour...' : 'Valider'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
