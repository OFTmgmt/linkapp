'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { Folder, Page } from '@/lib/types'
import { validateSlug, validateTitle, validateFolderName, sanitizeSlug } from '@/lib/validation'
import { useRole } from '@/lib/useRole'
import { Plus, FolderOpen, Paintbrush, Copy, ExternalLink, Trash2, LogOut, Settings, BarChart2, LineChart, Download, Link, Pencil, Check, X, FolderInput, Calendar } from 'lucide-react'
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
  const [duplicatingPage, setDuplicatingPage] = useState<Page | null>(null)
  const [duplicateCount, setDuplicateCount] = useState(1)
  const [duplicating, setDuplicating] = useState(false)
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set())
  const [countryStats, setCountryStats] = useState<Record<string, number>>({})
  const [folderStats, setFolderStats] = useState<Record<string, { open: boolean; from: string; to: string; count: number | null; loading: boolean }>>({})
  const [leaderboardPickerOpen, setLeaderboardPickerOpen] = useState(false)
  const [leaderboardPick, setLeaderboardPick] = useState({ from: new Date().toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) })
  const [leaderboardCustomCounts, setLeaderboardCustomCounts] = useState<Record<string, number> | null>(null)
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)

  useEffect(() => {
    if (!roleLoading && userId) loadData()
  }, [roleLoading, userId, isAdmin])

  function getParisStartOfDay(): string {
    const now = new Date()
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).formatToParts(now)
    const p: Record<string, string> = {}
    parts.forEach(({ type, value }) => { p[type] = value })
    const msIntoDay = (parseInt(p.hour) * 3600 + parseInt(p.minute) * 60 + parseInt(p.second)) * 1000
    return new Date(now.getTime() - msIntoDay).toISOString()
  }

  function parisOffset(): string {
    const tz = new Date().toLocaleString('en', { timeZone: 'Europe/Paris', timeZoneName: 'short' })
    return tz.includes('GMT+2') ? '+02:00' : '+01:00'
  }

  async function loadData() {
    setLoading(true)
    try {
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
        const counts: Record<string, number> = {}
        pagesData.forEach(p => { counts[p.id] = 0 })

        const { data: rpcData } = await supabase.rpc('count_clicks_per_page', {
          page_ids: pageIds,
          since_date: getParisStartOfDay(),
          until_date: new Date().toISOString(),
        })
        rpcData?.forEach((r: { page_id: string; cnt: number }) => {
          counts[r.page_id] = Number(r.cnt)
        })
        setClickCounts(counts)

        try {
          const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
          const { data: viewsData } = await supabase.from('page_views').select('country').in('page_id', pageIds).gte('created_at', since30d)
          const countryCounts: Record<string, number> = {}
          viewsData?.forEach(v => { if (v.country) countryCounts[v.country] = (countryCounts[v.country] || 0) + 1 })
          setCountryStats(countryCounts)
        } catch {
          setCountryStats({})
        }
      }
    } catch (err) {
      console.error('loadData error:', err)
    } finally {
      setLoading(false)
    }
  }

  function formatLeaderboardDate(dateStr: string): string {
    const [year, month, day] = dateStr.split('-')
    return new Date().getFullYear().toString() === year ? `${day}/${month}` : `${day}/${month}/${year.slice(2)}`
  }

  async function fetchLeaderboardRange(from: string, to: string) {
    setLeaderboardLoading(true)
    const offset = parisOffset()
    const sinceDate = new Date(`${from}T00:00:00${offset}`).toISOString()
    const untilDate = new Date(`${to}T23:59:59${offset}`).toISOString()
    const pageIds = pages.map(p => p.id)
    if (pageIds.length === 0) {
      setLeaderboardCustomCounts({})
      setLeaderboardLoading(false)
      return
    }
    const { data: rpcData } = await supabase.rpc('count_clicks_per_page', {
      page_ids: pageIds,
      since_date: sinceDate,
      until_date: untilDate,
    })
    const counts: Record<string, number> = {}
    pages.forEach(p => { counts[p.id] = 0 })
    rpcData?.forEach((r: { page_id: string; cnt: number }) => { counts[r.page_id] = Number(r.cnt) })
    setLeaderboardCustomCounts(counts)
    setLeaderboardLoading(false)
  }

  async function fetchFolderRange(folderId: string) {
    const stat = folderStats[folderId]
    if (!stat || !stat.from || !stat.to) return
    setFolderStats(prev => ({ ...prev, [folderId]: { ...prev[folderId], loading: true, count: null } }))
    const folderPages = pages.filter(p => p.folder_id === folderId)
    if (folderPages.length === 0) {
      setFolderStats(prev => ({ ...prev, [folderId]: { ...prev[folderId], loading: false, count: 0 } }))
      return
    }
    const offset = parisOffset()
    const sinceDate = new Date(`${stat.from}T00:00:00${offset}`).toISOString()
    const untilDate = new Date(`${stat.to}T23:59:59${offset}`).toISOString()
    const { data: rpcData } = await supabase.rpc('count_clicks_per_page', {
      page_ids: folderPages.map(p => p.id),
      since_date: sinceDate,
      until_date: untilDate,
    })
    const total = rpcData?.reduce((sum: number, r: { cnt: number }) => sum + Number(r.cnt), 0) ?? 0
    setFolderStats(prev => ({ ...prev, [folderId]: { ...prev[folderId], loading: false, count: total } }))
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

  async function duplicatePage(page: Page, count: number) {
    setDuplicating(true)
    const { data: links } = await supabase.from('links').select('*').eq('page_id', page.id)
    for (let i = 0; i < count; i++) {
      const suffix = count > 1 ? ` (copie ${i + 1})` : ' (copie)'
      const newSlug = `${page.slug}-copy-${Date.now()}-${i}`
      const { data: newPageData } = await supabase.from('pages').insert({
        folder_id: page.folder_id,
        title: page.title,
        internal_name: `${page.internal_name || page.title}${suffix}`,
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
      if (newPageData && links && links.length > 0) {
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
    setDuplicating(false)
    setDuplicatingPage(null)
    setDuplicateCount(1)
    loadData()
  }

  async function deletePage(id: string) {
    if (!confirm('Supprimer cette page ?')) return
    await supabase.from('pages').delete().eq('id', id)
    loadData()
  }

  function toggleSelect(id: string) {
    setSelectedPages(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll(pageIds: string[]) {
    const allSelected = pageIds.every(id => selectedPages.has(id))
    setSelectedPages(prev => {
      const next = new Set(prev)
      if (allSelected) pageIds.forEach(id => next.delete(id))
      else pageIds.forEach(id => next.add(id))
      return next
    })
  }

  async function deleteSelected() {
    if (!confirm(`Supprimer ${selectedPages.size} page${selectedPages.size > 1 ? 's' : ''} ?`)) return
    await supabase.from('pages').delete().in('id', [...selectedPages])
    setSelectedPages(new Set())
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

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500 dark:text-gray-400">Chargement...</div>

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <img src="/logo.svg" alt="My Links Page" className="h-8" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <button onClick={() => router.push('/dashboard/analytics')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-auto mr-2">
            <BarChart2 size={16} /> Stats
          </button>
          {isAdmin && (
            <button onClick={() => router.push('/dashboard/admin')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 mr-2">
              <Settings size={16} /> Admin
            </button>
          )}
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 mr-4">
            <LogOut size={16} /> Déconnexion
          </button>
          <div className="flex gap-2">
            <div className="flex flex-col gap-1">
              <input
                className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 dark:bg-gray-700 dark:text-white dark:border-gray-600 ${errors.folder ? 'border-red-400' : ''}`}
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

        {folders.length > 0 && (() => {
          const MEDALS = ['🥇', '🥈', '🥉']
          const countsToUse = leaderboardCustomCounts ?? clickCounts
          const ranked = [...folders]
            .map(f => ({ folder: f, total: pages.filter(p => p.folder_id === f.id).reduce((s, p) => s + (countsToUse[p.id] || 0), 0) }))
            .sort((a, b) => b.total - a.total)
          const countryTotal = Object.values(countryStats).reduce((a, b) => a + b, 0) || 1
          const topCountries = Object.entries(countryStats).sort((a, b) => b[1] - a[1]).slice(0, 6)
          const leaderboardLabel = leaderboardCustomCounts !== null
            ? leaderboardPick.from === leaderboardPick.to
              ? `(${formatLeaderboardDate(leaderboardPick.from)})`
              : `(${formatLeaderboardDate(leaderboardPick.from)} – ${formatLeaderboardDate(leaderboardPick.to)})`
            : "(aujourd'hui)"
          return (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                    🏆 Classement des dossiers <span className="text-xs font-normal text-gray-400">{leaderboardLabel}</span>
                  </h2>
                  <button
                    onClick={() => setLeaderboardPickerOpen(v => !v)}
                    className={`p-1 rounded ${leaderboardPickerOpen ? 'text-purple-500' : 'text-gray-300 hover:text-purple-400'}`}
                    title="Changer la période"
                  >
                    <Calendar size={14} />
                  </button>
                </div>

                {leaderboardPickerOpen && (
                  <div className="mb-3 p-2 bg-purple-50 dark:bg-purple-900/10 rounded-lg space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => {
                          const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' })
                          setLeaderboardPick({ from: today, to: today })
                          setLeaderboardCustomCounts(null)
                        }}
                        className={`text-xs px-2 py-1 rounded-md font-medium ${leaderboardCustomCounts === null ? 'bg-pink-500 text-white' : 'bg-pink-100 text-pink-700 hover:bg-pink-200 dark:bg-pink-900/30 dark:text-pink-300'}`}
                      >
                        Aujourd'hui
                      </button>
                      {[
                        { label: 'Hier', from: 1, to: 1 },
                        { label: 'Avant-hier', from: 2, to: 2 },
                        { label: 'J-3', from: 3, to: 3 },
                        { label: '7 jours', from: 7, to: 0 },
                        { label: '30 jours', from: 30, to: 0 },
                      ].map(({ label, from: dFrom, to: dTo }) => {
                        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' })
                        const f = new Date(Date.now() - dFrom * 86400000).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' })
                        const t = dTo === 0 ? today : new Date(Date.now() - dTo * 86400000).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' })
                        const isActive = leaderboardCustomCounts !== null && leaderboardPick.from === f && leaderboardPick.to === t
                        return (
                          <button
                            key={label}
                            onClick={() => { setLeaderboardPick({ from: f, to: t }); fetchLeaderboardRange(f, t) }}
                            className={`text-xs px-2 py-1 rounded-md ${isActive ? 'bg-purple-500 text-white' : 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300'}`}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Du</span>
                      <input
                        type="date"
                        value={leaderboardPick.from}
                        onChange={e => setLeaderboardPick(p => ({ ...p, from: e.target.value }))}
                        className="border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">au</span>
                      <input
                        type="date"
                        value={leaderboardPick.to}
                        onChange={e => setLeaderboardPick(p => ({ ...p, to: e.target.value }))}
                        className="border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                      />
                      <button
                        onClick={() => fetchLeaderboardRange(leaderboardPick.from, leaderboardPick.to)}
                        disabled={leaderboardLoading}
                        className="bg-purple-500 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-purple-600 disabled:opacity-50"
                      >
                        {leaderboardLoading ? '...' : 'Voir'}
                      </button>
                    </div>
                  </div>
                )}

                {leaderboardLoading ? (
                  <div className="text-center py-4 text-xs text-gray-400">Chargement...</div>
                ) : (
                  <div className="space-y-2">
                    {ranked.map(({ folder, total }, i) => (
                      <div key={folder.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 text-center flex-shrink-0">{i < 3 ? MEDALS[i] : <span className="text-xs text-gray-400 font-bold">{i + 1}.</span>}</span>
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{folder.name}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white ml-2 flex-shrink-0">{total} clics</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
                <h2 className="font-semibold text-gray-700 dark:text-gray-300 text-sm mb-3">🌍 Pays <span className="text-xs font-normal text-gray-400">(30 jours)</span></h2>
                {topCountries.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Aucune donnée</p>
                ) : (
                  <div className="space-y-2">
                    {topCountries.map(([country, count]) => {
                      const pct = Math.round((count / countryTotal) * 100)
                      return (
                        <div key={country}>
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-gray-600 dark:text-gray-400">{country}</span>
                            <span className="font-semibold text-gray-800 dark:text-white">{count} <span className="font-normal text-gray-400">({pct}%)</span></span>
                          </div>
                          <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all bg-pink-400" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })()}

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
              <div key={folder.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-3 flex-1">
                    <FolderOpen size={20} className="text-pink-400 flex-shrink-0" />
                    {editingFolder === folder.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          className="border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                          value={editingFolderName}
                          onChange={e => setEditingFolderName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') renameFolder(folder.id); if (e.key === 'Escape') setEditingFolder(null) }}
                        />
                        <button onClick={() => renameFolder(folder.id)} className="text-green-500 hover:text-green-600"><Check size={16} /></button>
                        <button onClick={() => setEditingFolder(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={16} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-gray-800 dark:text-white">{folder.name}</h2>
                        <button onClick={() => { setEditingFolder(folder.id); setEditingFolderName(folder.name) }} className="text-gray-300 hover:text-blue-400"><Pencil size={13} /></button>
                        <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">{folderPages.length} page{folderPages.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {folderPages.length > 0 && (
                      <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer hover:text-gray-600 dark:hover:text-gray-200 mr-1">
                        <input
                          type="checkbox"
                          checked={folderPages.every(p => selectedPages.has(p.id))}
                          onChange={() => toggleSelectAll(folderPages.map(p => p.id))}
                          className="accent-pink-500"
                        />
                        Tout
                      </label>
                    )}
                    <button
                      onClick={() => { setSelectedFolder(folder.id); setShowNewPage(true) }}
                      className="text-sm bg-pink-50 text-pink-600 px-3 py-1.5 rounded-lg hover:bg-pink-100 flex items-center gap-1"
                    >
                      <Plus size={14} /> Page
                    </button>
                    <button
                      onClick={() => {
                        const today = new Date().toISOString().slice(0, 10)
                        setFolderStats(prev => ({
                          ...prev,
                          [folder.id]: prev[folder.id]?.open
                            ? { ...prev[folder.id], open: false }
                            : { open: true, from: today, to: today, count: null, loading: false }
                        }))
                      }}
                      className={`p-1 ${folderStats[folder.id]?.open ? 'text-purple-400' : 'text-gray-300 hover:text-purple-400'}`}
                      title="Voir clics par période"
                    >
                      <Calendar size={16} />
                    </button>
                    <button onClick={() => setExportFolder({ id: folder.id, name: folder.name })} className="text-gray-300 hover:text-green-500 p-1" title="Exporter CSV">
                      <Download size={16} />
                    </button>
                    <button onClick={() => deleteFolder(folder.id)} className="text-gray-300 hover:text-red-400 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {folderStats[folder.id]?.open && (
                  <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700 bg-purple-50 dark:bg-purple-900/10 flex items-center gap-3 flex-wrap">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Clics du</span>
                    <input
                      type="date"
                      value={folderStats[folder.id]?.from || ''}
                      onChange={e => setFolderStats(prev => ({ ...prev, [folder.id]: { ...prev[folder.id], from: e.target.value } }))}
                      className="border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">au</span>
                    <input
                      type="date"
                      value={folderStats[folder.id]?.to || ''}
                      onChange={e => setFolderStats(prev => ({ ...prev, [folder.id]: { ...prev[folder.id], to: e.target.value } }))}
                      className="border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    />
                    <button
                      onClick={() => fetchFolderRange(folder.id)}
                      disabled={folderStats[folder.id]?.loading}
                      className="bg-purple-500 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-purple-600 disabled:opacity-50"
                    >
                      {folderStats[folder.id]?.loading ? '...' : 'Voir'}
                    </button>
                    {folderStats[folder.id]?.count !== null && !folderStats[folder.id]?.loading && (
                      <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                        {folderStats[folder.id]?.count} clic{(folderStats[folder.id]?.count ?? 0) !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                )}

                {folderPages.length === 0 ? (
                  <div className="px-6 py-8 text-center text-gray-300 text-sm">Aucune page dans ce dossier</div>
                ) : (
                  <div className="divide-y divide-gray-50 dark:divide-gray-700">
                    {folderPages.map(page => (
                      <div key={page.id} className={`flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedPages.has(page.id) ? 'bg-pink-50 dark:bg-pink-900/20' : ''}`}>
                        <div className="flex items-center gap-4">
                          <input
                            type="checkbox"
                            checked={selectedPages.has(page.id)}
                            onChange={() => toggleSelect(page.id)}
                            className="accent-pink-500 flex-shrink-0"
                          />
                          <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: page.background_color }} />
                          <div>
                            <p className="font-medium text-gray-800 dark:text-white">{page.internal_name || page.title}</p>
                            <p className="text-xs text-gray-400">/{page.slug}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-semibold text-gray-800 dark:text-white">{clickCounts[page.id] || 0}</span> clics
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
                            <button onClick={() => { setDuplicatingPage(page); setDuplicateCount(1) }} className="text-gray-300 hover:text-green-500 p-1.5" title="Dupliquer">
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-lg dark:text-white mb-1">Exporter les clics</h3>
            <p className="text-sm text-gray-400 mb-4">Dossier : <span className="text-gray-700 dark:text-gray-300 font-medium">{exportFolder.name}</span></p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Date de début</label>
                <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  value={exportDates.from} onChange={e => setExportDates(d => ({ ...d, from: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Date de fin</label>
                <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  value={exportDates.to} onChange={e => setExportDates(d => ({ ...d, to: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setExportFolder(null)} className="flex-1 border rounded-lg py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600">Annuler</button>
              <button onClick={exportCSV} disabled={exporting} className="flex-1 bg-pink-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-pink-600 disabled:opacity-50 flex items-center justify-center gap-2">
                <Download size={14} /> {exporting ? 'Export...' : 'Télécharger CSV'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPages.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white rounded-2xl px-6 py-3 shadow-2xl flex items-center gap-4">
          <span className="text-sm font-medium">{selectedPages.size} page{selectedPages.size > 1 ? 's' : ''} sélectionnée{selectedPages.size > 1 ? 's' : ''}</span>
          <button onClick={() => setSelectedPages(new Set())} className="text-gray-400 hover:text-white text-sm">Annuler</button>
          <button onClick={deleteSelected} className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2">
            <Trash2 size={14} /> Supprimer
          </button>
        </div>
      )}

      {duplicatingPage && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-lg dark:text-white mb-1">Dupliquer la page</h3>
            <p className="text-sm text-gray-400 mb-4"><span className="text-gray-700 dark:text-gray-300 font-medium">{duplicatingPage.internal_name || duplicatingPage.title}</span></p>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Nombre de copies (1–30)</label>
              <input
                type="number"
                min={1}
                max={30}
                value={duplicateCount}
                onChange={e => setDuplicateCount(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDuplicatingPage(null)} className="flex-1 border rounded-lg py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600">Annuler</button>
              <button
                onClick={() => duplicatePage(duplicatingPage, duplicateCount)}
                disabled={duplicating}
                className="flex-1 bg-pink-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-pink-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Copy size={14} /> {duplicating ? 'Création...' : `Créer ${duplicateCount} copie${duplicateCount > 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {movingPage && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-lg dark:text-white mb-1">Déplacer la page</h3>
            <p className="text-sm text-gray-400 mb-4">
              <span className="text-gray-700 dark:text-gray-300 font-medium">{movingPage.title}</span> → choisir un dossier
            </p>
            <div className="space-y-2">
              {folders.filter(f => f.id !== movingPage.folder_id).map(folder => (
                <button
                  key={folder.id}
                  onClick={() => movePage(movingPage.id, folder.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-pink-50 hover:border-pink-200 text-left transition-colors"
                >
                  <FolderOpen size={18} className="text-pink-400 flex-shrink-0" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">{folder.name}</span>
                </button>
              ))}
              {folders.filter(f => f.id !== movingPage.folder_id).length === 0 && (
                <p className="text-center text-sm text-gray-400 py-4">Aucun autre dossier disponible</p>
              )}
            </div>
            <button onClick={() => setMovingPage(null)} className="w-full mt-4 border rounded-lg py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600">
              Annuler
            </button>
          </div>
        </div>
      )}

      {showNewPage && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-lg dark:text-white mb-4">Nouvelle page</h3>
            <div className="space-y-3">
              <div>
                <input
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 dark:bg-gray-700 dark:text-white dark:border-gray-600 ${errors.pageTitle ? 'border-red-400' : ''}`}
                  placeholder="Titre (ex: Aliyah)"
                  value={newPage.title}
                  onChange={e => { setNewPage({ ...newPage, title: e.target.value }); setErrors(p => ({ ...p, pageTitle: '' })) }}
                />
                {errors.pageTitle && <p className="text-xs text-red-500 mt-1">{errors.pageTitle}</p>}
              </div>
              <div>
                <input
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 dark:bg-gray-700 dark:text-white dark:border-gray-600 ${errors.pageSlug ? 'border-red-400' : ''}`}
                  placeholder="Slug (ex: aliyah59)"
                  value={newPage.slug}
                  onChange={e => { setNewPage({ ...newPage, slug: sanitizeSlug(e.target.value) }); setErrors(p => ({ ...p, pageSlug: '' })) }}
                />
                {errors.pageSlug && <p className="text-xs text-red-500 mt-1">{errors.pageSlug}</p>}
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 dark:text-gray-300">Couleur fond :</label>
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
                className="flex-1 border rounded-lg py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600"
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
