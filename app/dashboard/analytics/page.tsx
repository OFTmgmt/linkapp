'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye, MousePointerClick, TrendingUp, Globe, Smartphone, Monitor, Tablet } from 'lucide-react'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

const supabase = createClient()

type PageStat = { id: string; title: string; slug: string; views: number; clicks: number; ctr: number; trend: { t: string; v: number }[] }
type CountryStat = { country: string; views: number; pct: number }
type ReferrerStat = { source: string; count: number; pct: number }
type DeviceStat = { device: string; count: number; pct: number }
type TimeSeriesPoint = { label: string; views: number; clicks: number }

const REFERRER_LABELS: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok',
  twitter: 'Twitter/X', snapchat: 'Snapchat', direct: 'Direct', other: 'Autre',
}
const REF_COLORS: Record<string, string> = {
  instagram: '#e1306c', facebook: '#1877f2', tiktok: '#010101',
  direct: '#6b7280', other: '#9ca3af', twitter: '#1da1f2', snapchat: '#facc15'
}
const DEVICE_ICONS: Record<string, React.ReactNode> = {
  mobile: <Smartphone size={14} />, desktop: <Monitor size={14} />, tablet: <Tablet size={14} />
}
const PINK = '#ec4899'
const PURPLE = '#8b5cf6'

export default function AnalyticsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'today' | '7d' | '30d'>('7d')
  const [totalViews, setTotalViews] = useState(0)
  const [totalClicks, setTotalClicks] = useState(0)
  const [prevViews, setPrevViews] = useState(0)
  const [prevClicks, setPrevClicks] = useState(0)
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([])
  const [pageStats, setPageStats] = useState<PageStat[]>([])
  const [countries, setCountries] = useState<CountryStat[]>([])
  const [referrers, setReferrers] = useState<ReferrerStat[]>([])
  const [devices, setDevices] = useState<DeviceStat[]>([])
  const [hourly, setHourly] = useState<{ hour: string; views: number }[]>([])

  useEffect(() => { loadStats() }, [period])

  function getPeriodStart(offset = 0) {
    const now = new Date()
    if (period === 'today') {
      const d = new Date(now); d.setDate(d.getDate() - offset); d.setHours(0,0,0,0); return d.toISOString()
    }
    if (period === '7d') { now.setDate(now.getDate() - 7 * (offset + 1)); return now.toISOString() }
    now.setDate(now.getDate() - 30 * (offset + 1)); return now.toISOString()
  }

  async function loadStats() {
    setLoading(true)
    const since = getPeriodStart(0)
    const prevSince = getPeriodStart(1)

    const [{ data: pagesData }, { data: viewsData }, { data: prevViewsData }, { data: clicksData }, { data: prevClicksData }, { data: linksData }] = await Promise.all([
      supabase.from('pages').select('id, title, slug'),
      supabase.from('page_views').select('page_id, country, referrer, device, created_at').gte('created_at', since),
      supabase.from('page_views').select('id').gte('created_at', prevSince).lt('created_at', since),
      supabase.from('clicks').select('link_id, referrer, device, created_at').gte('created_at', since),
      supabase.from('clicks').select('id').gte('created_at', prevSince).lt('created_at', since),
      supabase.from('links').select('id, page_id'),
    ])

    const views = viewsData || []
    const clicks = clicksData || []
    const pages = pagesData || []
    const links = linksData || []

    setTotalViews(views.length)
    setTotalClicks(clicks.length)
    setPrevViews(prevViewsData?.length || 0)
    setPrevClicks(prevClicksData?.length || 0)

    // Time series
    const buckets: Record<string, { views: number; clicks: number }> = {}
    if (period === 'today') {
      for (let h = 0; h < 24; h++) buckets[`${h}h`] = { views: 0, clicks: 0 }
      views.forEach(v => { const h = new Date(v.created_at).getHours(); buckets[`${h}h`].views++ })
      clicks.forEach(c => { const h = new Date(c.created_at).getHours(); buckets[`${h}h`].clicks++ })
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

    // Hourly heatmap (today only)
    if (period === 'today') {
      const hh: Record<number, number> = {}
      for (let i = 0; i < 24; i++) hh[i] = 0
      views.forEach(v => { hh[new Date(v.created_at).getHours()]++ })
      setHourly(Object.entries(hh).map(([h, v]) => ({ hour: `${h}h`, views: v })))
    }

    // Stats par page
    const linkToPage: Record<string, string> = {}
    links.forEach(l => { linkToPage[l.id] = l.page_id })
    const viewsByPage: Record<string, number> = {}
    views.forEach(v => { viewsByPage[v.page_id] = (viewsByPage[v.page_id] || 0) + 1 })
    const clicksByPage: Record<string, number> = {}
    clicks.forEach(c => { const pid = linkToPage[c.link_id]; if (pid) clicksByPage[pid] = (clicksByPage[pid] || 0) + 1 })

    const stats: PageStat[] = pages.map(p => {
      const v = viewsByPage[p.id] || 0
      const c = clicksByPage[p.id] || 0
      return { id: p.id, title: p.title, slug: p.slug, views: v, clicks: c, ctr: v > 0 ? Math.round((c / v) * 100) : 0, trend: [] }
    }).filter(p => p.views > 0 || p.clicks > 0).sort((a, b) => b.clicks - a.clicks)
    setPageStats(stats)

    // Pays
    const cc: Record<string, number> = {}
    views.forEach(v => { if (v.country) cc[v.country] = (cc[v.country] || 0) + 1 })
    const totalV = views.length || 1
    setCountries(Object.entries(cc).sort((a,b) => b[1]-a[1]).slice(0,8).map(([country, count]) => ({ country, views: count, pct: Math.round((count/totalV)*100) })))

    // Referrers
    const rc: Record<string, number> = {}
    views.forEach(v => { if (v.referrer) rc[v.referrer] = (rc[v.referrer] || 0) + 1 })
    setReferrers(Object.entries(rc).sort((a,b) => b[1]-a[1]).map(([source, count]) => ({ source, count, pct: Math.round((count/totalV)*100) })))

    // Devices
    const dc: Record<string, number> = {}
    views.forEach(v => { if (v.device) dc[v.device] = (dc[v.device] || 0) + 1 })
    setDevices(Object.entries(dc).sort((a,b) => b[1]-a[1]).map(([device, count]) => ({ device, count, pct: Math.round((count/totalV)*100) })))

    setLoading(false)
  }

  const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0.0'
  function delta(curr: number, prev: number) {
    if (prev === 0) return null
    const d = Math.round(((curr - prev) / prev) * 100)
    return d
  }

  function KpiCard({ label, value, prev, color, icon }: { label: string; value: string | number; prev?: number; color: string; icon: React.ReactNode }) {
    const d = typeof value === 'number' && prev !== undefined ? delta(value, prev) : null
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">{label}</p>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20`, color }}>{icon}</div>
        </div>
        <p className="text-3xl font-bold text-gray-900 mb-1">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        {d !== null && (
          <p className={`text-xs font-medium ${d >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {d >= 0 ? '↑' : '↓'} {Math.abs(d)}% vs période préc.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></button>
          <h1 className="text-xl font-bold text-gray-900 flex-1">Analytics</h1>
          <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
            {(['today', '7d', '30d'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${period === p ? 'bg-pink-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {p === 'today' ? "Aujourd'hui" : p === '7d' ? '7 jours' : '30 jours'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-400">Chargement...</div>
        ) : (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-4">
              <KpiCard label="Page Views" value={totalViews} prev={prevViews} color={PURPLE} icon={<Eye size={16}/>} />
              <KpiCard label="Clics" value={totalClicks} prev={prevClicks} color={PINK} icon={<MousePointerClick size={16}/>} />
              <KpiCard label="Click-Through Rate" value={`${ctr}%`} color="#10b981" icon={<TrendingUp size={16}/>} />
            </div>

            {/* Graphique principal */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-gray-800">Analytics Overview</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Vues et clics dans le temps</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={timeSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PURPLE} stopOpacity={0.15}/>
                      <stop offset="95%" stopColor={PURPLE} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gClicks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PINK} stopOpacity={0.15}/>
                      <stop offset="95%" stopColor={PINK} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #f0f0f0', fontSize: 12 }} />
                  <Area type="monotone" dataKey="views" stroke={PURPLE} strokeWidth={2} fill="url(#gViews)" name="Vues" dot={false} />
                  <Area type="monotone" dataKey="clicks" stroke={PINK} strokeWidth={2} fill="url(#gClicks)" name="Clics" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* Top Links */}
              <div className="col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="font-semibold text-gray-800 mb-4">Top Links</h2>
                {pageStats.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">Aucune donnée</p>
                ) : (
                  <div className="space-y-1">
                    <div className="grid grid-cols-12 text-xs text-gray-400 font-medium pb-2 border-b border-gray-50">
                      <span className="col-span-1">#</span>
                      <span className="col-span-5">Page</span>
                      <span className="col-span-2 text-right">Vues</span>
                      <span className="col-span-2 text-right">Clics</span>
                      <span className="col-span-2 text-right">CTR</span>
                    </div>
                    {pageStats.slice(0, 10).map((p, i) => (
                      <div key={p.id} className="grid grid-cols-12 items-center py-2.5 hover:bg-gray-50 rounded-lg px-1 transition-colors">
                        <span className="col-span-1 text-xs text-gray-400 font-medium">#{i+1}</span>
                        <div className="col-span-5">
                          <p className="text-sm font-medium text-gray-800 truncate">{p.title}</p>
                          <p className="text-xs text-gray-400">/{p.slug}</p>
                        </div>
                        <span className="col-span-2 text-right text-sm text-gray-600">{p.views}</span>
                        <span className="col-span-2 text-right text-sm font-bold text-gray-900">{p.clicks}</span>
                        <div className="col-span-2 flex justify-end">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${p.ctr >= 30 ? 'bg-green-100 text-green-700' : p.ctr >= 10 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                            {p.ctr}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Referrers donut */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="font-semibold text-gray-800 mb-4">Sources</h2>
                {referrers.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">Aucune donnée</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={referrers} dataKey="count" nameKey="source" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3}>
                          {referrers.map(r => <Cell key={r.source} fill={REF_COLORS[r.source] || '#9ca3af'} />)}
                        </Pie>
                        <Tooltip formatter={(v, n) => [v, REFERRER_LABELS[n as string] || n]} contentStyle={{ borderRadius: '12px', fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-2">
                      {referrers.map(r => (
                        <div key={r.source} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: REF_COLORS[r.source] || '#9ca3af' }} />
                            <span className="text-gray-700">{REFERRER_LABELS[r.source] || r.source}</span>
                          </div>
                          <span className="text-gray-500 text-xs">{r.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* Pays */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2"><Globe size={16} className="text-blue-400"/>Géographie</h2>
                <p className="text-xs text-gray-400 mb-4">{totalViews} visites</p>
                {countries.length === 0 ? <p className="text-gray-400 text-sm text-center py-6">Aucune donnée</p> : (
                  <div className="space-y-3">
                    {countries.map(c => (
                      <div key={c.country}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-700 truncate flex-1">{c.country}</span>
                          <span className="text-gray-500 text-xs ml-2">{c.views}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${c.pct}%`, backgroundColor: PURPLE }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Appareils */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="font-semibold text-gray-800 mb-4">Appareils</h2>
                {devices.length === 0 ? <p className="text-gray-400 text-sm text-center py-6">Aucune donnée</p> : (
                  <>
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={devices} dataKey="count" nameKey="device" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3}>
                          {devices.map((d, i) => <Cell key={d.device} fill={[PINK, PURPLE, '#10b981'][i % 3]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-2">
                      {devices.map((d, i) => (
                        <div key={d.device} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: [PINK, PURPLE, '#10b981'][i % 3] }} />
                            <span className="flex items-center gap-1 text-gray-700 capitalize">{DEVICE_ICONS[d.device]}{d.device}</span>
                          </div>
                          <span className="font-semibold text-gray-900">{d.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Heatmap horaire */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="font-semibold text-gray-800 mb-1">Heures de pointe</h2>
                <p className="text-xs text-gray-400 mb-4">Vues par heure (aujourd'hui)</p>
                {period === 'today' && hourly.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={hourly} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                      <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={5} />
                      <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', fontSize: 12 }} />
                      <Bar dataKey="views" fill={PURPLE} radius={[3,3,0,0]} name="Vues" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-400 text-sm text-center py-6">Disponible en vue "Aujourd'hui"</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
