'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { Folder, Page } from '@/lib/types'
import { validateSlug, validateTitle, validateFolderName, sanitizeSlug } from '@/lib/validation'
import { useRole } from '@/lib/useRole'
import { Plus, FolderOpen, Link, Copy, ExternalLink, Trash2, LogOut, Settings, BarChart2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

const supabase = createClient()

export default function Dashboard() {
  const router = useRouter()
  const { isAdmin } = useRole()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }
  const [folders, setFolders] = useState<Folder[]>([])
  const [pages, setPages] = useState<Page[]>([])
  const [clickCounts, setClickCounts] = useState<Record<string, number>>({})
  const [newFolderName, setNewFolderName] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [showNewPage, setShowNewPage] = useState(false)
  const [newPage, setNewPage] = useState({ title: '', slug: '', background_color: '#ff6eb4' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: foldersData } = await supabase.from('folders').select('*').order('created_at')
    const { data: pagesData } = await supabase.from('pages').select('*').order('created_at')
    setFolders(foldersData || [])
    setPages(pagesData || [])

    if (pagesData && pagesData.length > 0) {
      const pageIds = pagesData.map(p => p.id)
      const { data: linksData } = await supabase.from('links').select('id, page_id').in('page_id', pageIds)
      if (linksData && linksData.length > 0) {
        const linkIds = linksData.map(l => l.id)
        const { data: clicksData } = await supabase.from('clicks').select('link_id').in('link_id', linkIds)
        const counts: Record<string, number> = {}
        pagesData.forEach(p => { counts[p.id] = 0 })
        clicksData?.forEach(c => {
          const link = linksData.find(l => l.id === c.link_id)
          if (link) counts[link.page_id] = (counts[link.page_id] || 0) + 1
        })
        setClickCounts(counts)
      }
    }
    setLoading(false)
  }

  async function createFolder() {
    const err = validateFolderName(newFolderName)
    if (err) { setErrors({ folder: err }); return }
    setErrors({})
    await supabase.from('folders').insert({ name: newFolderName.trim() })
    setNewFolderName('')
    loadData()
  }

  async function createPage() {
    const newErrors: Record<string, string> = {}
    const titleErr = validateTitle(newPage.title)
    const slugErr = validateSlug(sanitizeSlug(newPage.slug))
    if (titleErr) newErrors.pageTitle = titleErr
    if (slugErr) newErrors.pageSlug = slugErr
    if (!selectedFolder) newErrors.pageSlug = newErrors.pageSlug || 'Dossier requis'
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    setErrors({})
    await supabase.from('pages').insert({
      folder_id: selectedFolder,
      title: newPage.title.trim(),
      slug: sanitizeSlug(newPage.slug),
      background_color: newPage.background_color,
    })
    setNewPage({ title: '', slug: '', background_color: '#ff6eb4' })
    setShowNewPage(false)
    loadData()
  }

  async function duplicatePage(page: Page) {
    const newSlug = `${page.slug}-copy-${Date.now()}`
    const { data: newPageData } = await supabase.from('pages').insert({
      folder_id: page.folder_id,
      title: `${page.title} (copie)`,
      slug: newSlug,
      bio: page.bio,
      avatar_url: page.avatar_url,
      background_color: page.background_color,
    }).select().single()

    if (newPageData) {
      const { data: links } = await supabase.from('links').select('*').eq('page_id', page.id)
      if (links && links.length > 0) {
        await supabase.from('links').insert(links.map(l => ({
          page_id: newPageData.id,
          label: l.label,
          url: l.url,
          icon: l.icon,
          position: l.position,
        })))
      }
    }
    loadData()
  }

  async function deletePage(id: string) {
    if (!confirm('Supprimer cette page ?')) return
    await supabase.from('pages').delete().eq('id', id)
    loadData()
  }

  async function deleteFolder(id: string) {
    if (!confirm('Supprimer ce dossier et toutes ses pages ?')) return
    await supabase.from('folders').delete().eq('id', id)
    loadData()
  }

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">Chargement...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <img src="/logo.svg" alt="My Links Page" className="h-8" />
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <button onClick={() => router.push('/dashboard/analytics')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 ml-auto mr-2">
            <BarChart2 size={16} /> Stats
          </button>
          {isAdmin && (
            <button onClick={() => router.push('/dashboard/admin')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 mr-2">
              <Settings size={16} /> Admin
            </button>
          )}
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 mr-4">
            <LogOut size={16} /> Déconnexion
          </button>
          <div className="flex gap-2">
            <div className="flex flex-col gap-1">
              <input
                className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 ${errors.folder ? 'border-red-400' : ''}`}
                placeholder="Nom du dossier..."
                value={newFolderName}
                onChange={e => { setNewFolderName(e.target.value); setErrors({}) }}
                onKeyDown={e => e.key === 'Enter' && createFolder()}
              />
              {errors.folder && <p className="text-xs text-red-500">{errors.folder}</p>}
            </div>
            <button
              onClick={createFolder}
              className="bg-pink-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-pink-600 flex items-center gap-2"
            >
              <Plus size={16} /> Dossier
            </button>
          </div>
        </div>

        {folders.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <FolderOpen size={48} className="mx-auto mb-4 opacity-30" />
            <p>Crée ton premier dossier pour commencer</p>
          </div>
        )}

        <div className="space-y-6">
          {folders.map(folder => {
            const folderPages = pages.filter(p => p.folder_id === folder.id)
            return (
              <div key={folder.id} className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <FolderOpen size={20} className="text-pink-400" />
                    <h2 className="font-semibold text-gray-800">{folder.name}</h2>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{folderPages.length} page{folderPages.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setSelectedFolder(folder.id); setShowNewPage(true) }}
                      className="text-sm bg-pink-50 text-pink-600 px-3 py-1.5 rounded-lg hover:bg-pink-100 flex items-center gap-1"
                    >
                      <Plus size={14} /> Page
                    </button>
                    <button onClick={() => deleteFolder(folder.id)} className="text-gray-300 hover:text-red-400 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {folderPages.length === 0 ? (
                  <div className="px-6 py-8 text-center text-gray-300 text-sm">Aucune page dans ce dossier</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {folderPages.map(page => (
                      <div key={page.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: page.background_color }} />
                          <div>
                            <p className="font-medium text-gray-800">{page.title}</p>
                            <p className="text-xs text-gray-400">/{page.slug}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-500">
                            <span className="font-semibold text-gray-800">{clickCounts[page.id] || 0}</span> clics
                          </span>
                          <div className="flex items-center gap-1">
                            <a href={`/${page.slug}`} target="_blank" className="text-gray-300 hover:text-pink-500 p-1.5" title="Voir">
                              <ExternalLink size={16} />
                            </a>
                            <a href={`/dashboard/edit/${page.id}`} className="text-gray-300 hover:text-blue-500 p-1.5" title="Modifier">
                              <Link size={16} />
                            </a>
                            <button onClick={() => duplicatePage(page)} className="text-gray-300 hover:text-green-500 p-1.5" title="Dupliquer">
                              <Copy size={16} />
                            </button>
                            <button onClick={() => deletePage(page.id)} className="text-gray-300 hover:text-red-400 p-1.5" title="Supprimer">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {showNewPage && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-lg mb-4">Nouvelle page</h3>
            <div className="space-y-3">
              <div>
                <input
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 ${errors.pageTitle ? 'border-red-400' : ''}`}
                  placeholder="Titre (ex: Aliyah)"
                  value={newPage.title}
                  onChange={e => { setNewPage({ ...newPage, title: e.target.value }); setErrors(p => ({ ...p, pageTitle: '' })) }}
                />
                {errors.pageTitle && <p className="text-xs text-red-500 mt-1">{errors.pageTitle}</p>}
              </div>
              <div>
                <input
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 ${errors.pageSlug ? 'border-red-400' : ''}`}
                  placeholder="Slug (ex: aliyah59)"
                  value={newPage.slug}
                  onChange={e => { setNewPage({ ...newPage, slug: sanitizeSlug(e.target.value) }); setErrors(p => ({ ...p, pageSlug: '' })) }}
                />
                {errors.pageSlug && <p className="text-xs text-red-500 mt-1">{errors.pageSlug}</p>}
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600">Couleur fond :</label>
                <input
                  type="color"
                  value={newPage.background_color}
                  onChange={e => setNewPage({ ...newPage, background_color: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border-0"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewPage(false)}
                className="flex-1 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={createPage}
                className="flex-1 bg-pink-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-pink-600"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
