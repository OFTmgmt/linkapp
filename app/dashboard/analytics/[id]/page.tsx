'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Eye, MousePointerClick, TrendingUp, Globe, Smartphone, Monitor, Tablet } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

const supabase = createClient()

const REF_COLORS: Record<string, string> = {
  instagram: '#e1306c', facebook: '#1877f2', tiktok: '#010101',
  direct: '#6b7280', other: '#9ca3af', twitter: '#1da1f2', snapchat: '#facc15'
}
const REFERRER_LABELS: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok',
  twitter: 'Twitter/X', snapchat: 'Snapchat', direct: 'Direct', other: 'Autre',
}
const PINK = '#ec4899'
const PURPLE = '#8b5cf6'
const DEVICE_ICONS: Record<string, React.ReactNode> = {
  mobile: <Smartphone size={14} />, desktop: <Monitor size={14} />, tablet: <Tablet size={14} />
}

export default function PageAnalytics() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | 'custom'>('7d')
  const [customFrom, setCustomFrom] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
  const [customTo, setCustomTo] = useState(new Date().toISOString().slice(0, 10))
  const [appliedDates, setAppliedDates] = useState({ from: customFrom, to: customTo })
  const [pageTitle, setPageTitle] = useState('')
  const [pageSlug, setPageSlug] = useState('')
  const [totalViews, setTotalViews] = useState(0)
  const [totalClicks, setTotalClicks] = useState(0)
  const [timeSeries, setTimeSeries] = useState<{ label: string; views: number; clicks: number }[]>([])
  const [countries, setCountries] = useState<{ country: string; views: number; pct: number }[]>([])
  const [referrers, setReferrers] = useState<{ source: string; count: number; pct: number }[]>([])
  const [devices, setDevices] = useState<{ device: string; count: number; pct: number }[]>([])
  const [hourly, setHourly] = useState<{ hour: string; views: number }[]>([])
  const [links, setLinks] = useState<{ id: string; label: string; clicks: number }[]>([])

  useEffect(() => { loadStats() }, [id, period, appliedDates])

  function getPeriodStart(): string {
    if (period === 'custom') return new Date(appliedDates.from + 'T00:00:00').toISOString()
    const now = new Date()
    if (period === 'today') { now.setHours(0,0,0,0); return now.toISOString() }
    if (period === '7d') { now.setDate(now.getDate() - 7); return now.toISOString() }
    now.setDate(now.getDate() - 30); return now.toISOString()
  }

  function getPeriodEnd(): string {
    if (period === 'custom') return new Date(appliedDates.to + 'T23:59:59').toISOString()
    return new Date().toISOString()
  }

  async function loadStats() {
    setLoading(true)
    const since = getPeriodStart()
    const until = getPeriodEnd()

    const [{ data: pageData }, { data: linksData }] = await Promise.all([
      supabase.from('pages').select('title, slug').eq('id', id).single(),
      supabase.from('links').select('id, label').eq('page_id', id),
    ])

    if (pageData) { setPageTitle(pageData.title); setPageSlug(pageData.slug) }

    const linkIds = linksData?.map(l => l.id) || []

    const [{ data: viewsData }, { data: clicksData }] = await Promise.all([
      supabase.from('page_views').select('country, referrer, device, created_at').eq('page_id', id).gte('created_at', since).lte('created_at', until).limit(200000),
      linkIds.length > 0
        ? supabase.from('clicks').select('link_id, created_at').in('link_id', linkIds).gte('created_at', since).lte('created_at', until).limit(200000)
        : Promise.resolve({ data: [] }),
    ])

    const views = viewsData || []
    const clicks = clicksData || []

    setTotalViews(views.length)
    setTotalClicks(clicks.length)

    // Clics par lien
    const clicksByLink: Record<string, number> = {}
    clicks.forEach(c => { clicksByLink[c.link_id] = (clicksByLink[c.link_id] || 0) + 1 })
    setLinks((linksData || []).map(l => ({ id: l.id, label: l.label, clicks: clicksByLink[l.id] || 0 })).sort((a, b) => b.clicks - a.clicks))

    // Time series
    const buckets: Record<string, { views: number; clicks: number }> = {}
    if (period === 'today') {
      for (let h = 0; h < 24; h++) buckets[`${h}h`] = { views: 0, clicks: 0 }
      views.forEach(v => { const h = new Date(v.created_at).getHours(); buckets[`${h}h`].views++ })
      clicks.forEach(c => { const h = new Date(c.created_at).getHours(); buckets[`${h}h`].clicks++ })
    } else if (period === 'custom') {
      for (let d = new Date(appliedDates.from); d <= new Date(appliedDates.to); d.setDate(d.getDate() + 1)) {
        const key = new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
        buckets[key] = { views: 0, clicks: 0 }
      }
      views.forEach(v => { const key = new Date(v.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }); if (buckets[key]) buckets[key].views++ })
      clicks.forEach(c => { const key = new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }); if (buckets[key]) buckets[key].clicks++ })
    } else {
      const days = period === '7d' ? 7 : 30
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        const key = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
        buckets[key] = { views: 0, clicks: 0 }
      }
      views.forEach(v => {
        const key = new Date(v.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
        if (buckets[key]) buckets[key].views++
      })
      clicks.forEach(c => {
        const key = new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
        if (buckets[key]) buckets[key].clicks++
      })
    }
    setTimeSeries(Object.entries(buckets).map(([label, d]) => ({ label, ...d })))

    // Hourly
    if (period === 'today') {
      const hh: Record<number, number> = {}
      for (let i = 0; i < 24; i++) hh[i] = 0
      views.forEach(v => { hh[new Date(v.created_at).getHours()]++ })
      setHourly(Object.entries(hh).map(([h, v]) => ({ hour: `${h}h`, views: Number(v) })))
    }

    // Pays
    const cc: Record<string, number> = {}
    views.forEach(v => { if (v.country) cc[v.country] = (cc[v.country] || 0) + 1 })
    const totalV = views.length || 1
    setCountries(Object.entries(cc).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([country, count]) => ({ country, views: count, pct: Math.round((count/totalV)*100) })))

    // Referrers
    const rc: Record<string, number> = {}
    views.forEach(v => { if (v.referrer) rc[v.referrer] = (rc[v.referrer] || 0) + 1 })
    setReferrers(Object.entries(rc).sort((a,b)=>b[1]-a[1]).map(([source, count]) => ({ source, count, pct: Math.round((count/totalV)*100) })))

    // Devices
    const dc: Record<string, number> = {}
    views.forEach(v => { if (v.device) dc[v.device] = (dc[v.device] || 0) + 1 })
    setDevices(Object.entries(dc).sort((a,b)=>b[1]-a[1]).map(([device, count]) => ({ device, count, pct: Math.round((count/totalV)*100) })))

    setLoading(false)
  }

  const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0.0'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><ArrowLeft size={20} /></button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{pageTitle}</h1>
            <p className="text-xs text-gray-400">/{pageSlug}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-1">
              {(['today', '7d', '30d', 'custom'] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${period === p ? 'bg-pink-500 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                  {p === 'today' ? "Aujourd'hui" : p === '7d' ? '7 jours' : p === '30d' ? '30 jours' : '📅 Dates'}
                </button>
              ))}
            </div>
            {period === 'custom' && (
              <div className="flex items-center gap-2">
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                  className="border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-pink-400 dark:bg-gray-700 dark:text-white dark:border-gray-600" />
                <span className="text-xs text-gray-400">→</span>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                  className="border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-pink-400 dark:bg-gray-700 dark:text-white dark:border-gray-600" />
                <button onClick={() => setAppliedDates({ from: customFrom, to: customTo })}
                  className="bg-pink-500 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-pink-600">
                  Appliquer
                </button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-400">Chargement...</div>
        ) : (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Page Views', value: totalViews, color: PURPLE, icon: <Eye size={16}/> },
                { label: 'Clics', value: totalClicks, color: PINK, icon: <MousePointerClick size={16}/> },
                { label: 'CTR', value: `${ctr}%`, color: '#10b981', icon: <TrendingUp size={16}/> },
              ].map(k => (
                <div key={k.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{k.label}</p>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${k.color}20`, color: k.color }}>{k.icon}</div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{typeof k.value === 'number' ? k.value.toLocaleString() : k.value}</p>
                </div>
              ))}
            </div>

            {/* Graphique */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
              <h2 className="font-semibold text-gray-800 dark:text-white mb-4">Vues & Clics dans le temps</h2>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={timeSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PURPLE} stopOpacity={0.15}/><stop offset="95%" stopColor={PURPLE} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PINK} stopOpacity={0.15}/><stop offset="95%" stopColor={PINK} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #f0f0f0', fontSize: 12 }} />
                  <Area type="monotone" dataKey="views" stroke={PURPLE} strokeWidth={2} fill="url(#gv)" name="Vues" dot={false} />
                  <Area type="monotone" dataKey="clicks" stroke={PINK} strokeWidth={2} fill="url(#gc)" name="Clics" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Clics par lien */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
                <h2 className="font-semibold text-gray-800 dark:text-white mb-4">Clics par lien</h2>
                {links.length === 0 ? <p className="text-gray-400 text-sm text-center py-6">Aucun lien</p> : (
                  <div className="space-y-3">
                    {links.map((l, i) => (
                      <div key={l.id}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-700 dark:text-gray-300 truncate flex-1">#{i+1} {l.label}</span>
                          <span className="font-bold text-gray-900 dark:text-white ml-2">{l.clicks}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: links[0].clicks > 0 ? `${Math.round((l.clicks/links[0].clicks)*100)}%` : '0%', backgroundColor: PINK }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sources */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
                <h2 className="font-semibold text-gray-800 dark:text-white mb-4">Sources</h2>
                {referrers.length === 0 ? <p className="text-gray-400 text-sm text-center py-6">Aucune donnée</p> : (
                  <>
                    <ResponsiveContainer width="100%" height={120}>
                      <PieChart>
                        <Pie data={referrers} dataKey="count" nameKey="source" cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3}>
                          {referrers.map(r => <Cell key={r.source} fill={REF_COLORS[r.source] || '#9ca3af'} />)}
                        </Pie>
                        <Tooltip formatter={(v, n) => [v, REFERRER_LABELS[n as string] || n]} contentStyle={{ borderRadius: '12px', fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-2">
                      {referrers.map(r => (
                        <div key={r.source} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: REF_COLORS[r.source] || '#9ca3af' }} />
                            <span className="text-gray-700 dark:text-gray-300">{REFERRER_LABELS[r.source] || r.source}</span>
                          </div>
                          <span className="text-gray-500 dark:text-gray-400 text-xs">{r.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Pays */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
                <h2 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><Globe size={16} className="text-blue-400"/>Géographie</h2>
                {countries.length === 0 ? <p className="text-gray-400 text-sm text-center py-6">Aucune donnée</p> : (
                  <div className="space-y-3">
                    {countries.map(c => (
                      <div key={c.country}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-700 dark:text-gray-300 truncate flex-1">{c.country}</span>
                          <span className="text-gray-500 dark:text-gray-400 text-xs ml-2">{c.views}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${c.pct}%`, backgroundColor: PURPLE }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Appareils + Heures */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
                <h2 className="font-semibold text-gray-800 dark:text-white mb-4">Appareils</h2>
                {devices.length === 0 ? <p className="text-gray-400 text-sm text-center py-6">Aucune donnée</p> : (
                  <div className="space-y-3">
                    {devices.map((d, i) => (
                      <div key={d.device}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 capitalize">{DEVICE_ICONS[d.device]}{d.device}</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{d.pct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${d.pct}%`, backgroundColor: [PINK, PURPLE, '#10b981'][i%3] }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Heures de pointe */}
            {period === 'today' && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
                <h2 className="font-semibold text-gray-800 dark:text-white mb-4">Heures de pointe</h2>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={hourly} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                    <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={3} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', fontSize: 12 }} />
                    <Bar dataKey="views" fill={PURPLE} radius={[3,3,0,0]} name="Vues" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
