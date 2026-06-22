'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { Folder, Page } from '@/lib/types'
import { validateSlug, validateTitle, validateFolderName, sanitizeSlug } from '@/lib/validation'
import { useRole } from '@/lib/useRole'
import { Plus, FolderOpen, Paintbrush, Copy, ExternalLink, Trash2, LogOut, Settings, BarChart2, LineChart, Download, Link, Pencil, Check, X, FolderInput } from 'lucide-react'
import { useRouter } from 'next/navigation'

const supabase = createClient()

export default function Dashboard() {
  const router = useRouter()
  const { isAdmin, userId, loading: roleLoading } = useRole()

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
  const [exportFolder, setExportFolder] = useState<{ id: string; name: string } | null>(null)
  const [exportDates, setExportDates] = useState({ from: new Date(Date.now() - 30*24*60*60*1000).toISOString().slice(0,10), to: new Date().toISOString().slice(0,10) })
  const [exporting, setExporting] = useState(false)
  const [editingFolder, setEditingFolder] = useState<string | null>(null)
  const [editingFolderName, setEditingFolderName] = useState('')
  const [movingPage, setMovingPage] = useState<Page | null>(null)

  useEffect(() => {
    if (!roleLoading && userId) loadData()
  }, [roleLoading, userId])

  async function loadData() {
    setLoading(true)
    let foldersQuery = supabase.from('folders').select('*').order('created_at')
    let pagesQuery = supabase.from('pages').select('*').order('created_at')
    if (!isAdmin && userId) {
      foldersQuery = foldersQuery.eq('owner_id', userId)
      pagesQuery = pagesQuery.eq('owner_id', userId)
    }
    const { data: foldersData } = await foldersQuery
    const { data: pagesData } = await pagesQuery
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
    await supabase.from('folders').insert({ name: newFolderName.trim(), owner_id: userId })
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
      owner_id: userId,
    })
    setNewPage({ title: '', slug: '', background_color: '#ff6eb4' })
    setShowNewPage(false)
    loadData()
  }

  async function duplicatePage(page: Page) {
    const newSlug = `${page.slug}-copy-${Date.now()}`
    const { data: newPageData } = await supabase.from('pages').insert({
      folder_id: page.folder_id,
      title: page.title,
      internal_name: `${page.internal_name || page.title} (copie)`,
      slug: newSlug,
      bio: page.bio,
      avatar_url: page.avatar_url,
      background_color: page.background_color,
      background_image: page.background_image,
      bg_overlay: page.bg_overlay,
      content_offset: page.content_offset,
      discord_webhook: page.discord_webhook,
      button_bg: page.button_bg,
      button_text_color: page.button_text_color,
      button_radius: page.button_radius,
      button_shadow: page.button_shadow,
      button_border: page.button_border,
      age_gate: page.age_gate,
      show_location: page.show_location,
      owner_id: userId,
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
          btn_size: l.btn_size,
          btn_width: l.btn_width,
          btn_animation: l.btn_animation,
          btn_align: l.btn_align,
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

  async function renameFolder(id: string) {
    const name = editingFolderName.trim()
    if (!name) return
    await supabase.from('folders').update({ name }).eq('id', id)
    setEditingFolder(null)
    loadData()
  }

  async function movePage(pageId: string, targetFolderId: string) {
    await supabase.from('pages').update({ folder_id: targetFolderId }).eq('id', pageId)
    setMovingPage(null)
    loadData()
  }

  async function deleteFolder(id: string) {
    if (!confirm('Supprimer ce dossier et toutes ses pages ?')) return
    await supabase.from('folders').delete().eq('id', id)
    loadData()
  }

  async function exportCSV() {
    setExporting(true)
    const params = new URLSearchParams({ from: exportDates.from, to: exportDates.to })
    if (exportFolder?.id) params.set('folder_id', exportFolder.id)
    const res = await fetch(`/api/export-clicks?${params}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clics-${exportFolder?.name || 'tous'}-${exportDates.from}-${exportDates.to}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExportFolder(null)
    setExporting(false)
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
                  <div className="flex items-center gap-3 flex-1">
                    <FolderOpen size={20} className="text-pink-400 flex-shrink-0" />
                    {editingFolder === folder.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          className="border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                          value={editingFolderName}
                          onChange={e => setEditingFolderName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') renameFolder(folder.id); if (e.key === 'Escape') setEditingFolder(null) }}
                        />
                        <button onClick={() => renameFolder(folder.id)} className="text-green-500 hover:text-green-600"><Check size={16} /></button>
                        <button onClick={() => setEditingFolder(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-gray-800">{folder.name}</h2>
                        <button onClick={() => { setEditingFolder(folder.id); setEditingFolderName(folder.name) }} className="text-gray-300 hover:text-blue-400"><Pencil size={13} /></button>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{folderPages.length} page{folderPages.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setSelectedFolder(folder.id); setShowNewPage(true) }}
                      className="text-sm bg-pink-50 text-pink-600 px-3 py-1.5 rounded-lg hover:bg-pink-100 flex items-center gap-1"
                    >
                      <Plus size={14} /> Page
                    </button>
                    <button onClick={() => setExportFolder({ id: folder.id, name: folder.name })} className="text-gray-300 hover:text-green-500 p-1" title="Exporter CSV">
                      <Download size={16} />
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
                            <p className="font-medium text-gray-800">{page.internal_name || page.title}</p>
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
                              <Paintbrush size={16} />
                            </a>
                            <button onClick={() => navigator.clipboard.writeText(`https://my-links-page.com/${page.slug}`)} className="text-gray-300 hover:text-pink-500 p-1.5" title="Copier le lien">
                              <Link size={16} />
                            </button>
                            <a href={`/dashboard/analytics/${page.id}`} className="text-gray-300 hover:text-purple-500 p-1.5" title="Stats">
                              <LineChart size={16} />
                            </a>
                            <button onClick={() => setMovingPage(page)} className="text-gray-300 hover:text-orange-400 p-1.5" title="Déplacer vers un dossier">
                              <FolderInput size={16} />
                            </button>
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

      {exportFolder !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-lg mb-1">Exporter les clics</h3>
            <p className="text-sm text-gray-400 mb-4">Dossier : <span className="text-gray-700 font-medium">{exportFolder.name}</span></p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Date de début</label>
                <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                  value={exportDates.from} onChange={e => setExportDates(d => ({ ...d, from: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Date de fin</label>
                <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                  value={exportDates.to} onChange={e => setExportDates(d => ({ ...d, to: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setExportFolder(null)} className="flex-1 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
              <button onClick={exportCSV} disabled={exporting} className="flex-1 bg-pink-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-pink-600 disabled:opacity-50 flex items-center justify-center gap-2">
                <Download size={14} /> {exporting ? 'Export...' : 'Télécharger CSV'}
              </button>
            </div>
          </div>
        </div>
      )}

      {movingPage && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-lg mb-1">Déplacer la page</h3>
            <p className="text-sm text-gray-400 mb-4">
              <span className="text-gray-700 font-medium">{movingPage.title}</span> → choisir un dossier
            </p>
            <div className="space-y-2">
              {folders.filter(f => f.id !== movingPage.folder_id).map(folder => (
                <button
                  key={folder.id}
                  onClick={() => movePage(movingPage.id, folder.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 hover:bg-pink-50 hover:border-pink-200 text-left transition-colors"
                >
                  <FolderOpen size={18} className="text-pink-400 flex-shrink-0" />
                  <span className="font-medium text-gray-700">{folder.name}</span>
                </button>
              ))}
              {folders.filter(f => f.id !== movingPage.folder_id).length === 0 && (
                <p className="text-center text-sm text-gray-400 py-4">Aucun autre dossier disponible</p>
              )}
            </div>
            <button onClick={() => setMovingPage(null)} className="w-full mt-4 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
          </div>
        </div>
      )}

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
