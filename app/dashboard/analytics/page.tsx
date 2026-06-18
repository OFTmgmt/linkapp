'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye, MousePointerClick, TrendingUp, Globe, Smartphone, Monitor, Tablet } from 'lucide-react'

const supabase = createClient()

type PageStat = { id: string; title: string; slug: string; views: number; clicks: number; ctr: number }
type CountryStat = { country: string; views: number; pct: number }
type ReferrerStat = { source: string; count: number; pct: number }
type DeviceStat = { device: string; count: number; pct: number }
type HourlyStat = { hour: number; count: number }

const REFERRER_LABELS: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok',
  twitter: 'Twitter/X', snapchat: 'Snapchat', direct: 'Direct', other: 'Autre',
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'today' | '7d' | '30d'>('today')
  const [totalViews, setTotalViews] = useState(0)
  const [totalClicks, setTotalClicks] = useState(0)
  const [pageStats, setPageStats] = useState<PageStat[]>([])
  const [countries, setCountries] = useState<CountryStat[]>([])
  const [referrers, setReferrers] = useState<ReferrerStat[]>([])
  const [devices, setDevices] = useState<DeviceStat[]>([])
  const [hourly, setHourly] = useState<HourlyStat[]>([])

  useEffect(() => { loadStats() }, [period])

  function getPeriodStart() {
    const now = new Date()
    if (period === 'today') { now.setHours(0, 0, 0, 0); return now.toISOString() }
    if (period === '7d') { now.setDate(now.getDate() - 7); return now.toISOString() }
    now.setDate(now.getDate() - 30); return now.toISOString()
  }

  async function loadStats() {
    setLoading(true)
    const since = getPeriodStart()

    const [{ data: pagesData }, { data: viewsData }, { data: clicksData }, { data: linksData }] = await Promise.all([
      supabase.from('pages').select('id, title, slug'),
      supabase.from('page_views').select('page_id, country, referrer, device, created_at').gte('created_at', since),
      supabase.from('clicks').select('link_id, referrer, device, created_at').gte('created_at', since),
      supabase.from('links').select('id, page_id'),
    ])

    const views = viewsData || []
    const clicks = clicksData || []
    const pages = pagesData || []
    const links = linksData || []

    setTotalViews(views.length)
    setTotalClicks(clicks.length)

    // Stats par page
    const linkToPage: Record<string, string> = {}
    links.forEach(l => { linkToPage[l.id] = l.page_id })

    const viewsByPage: Record<string, number> = {}
    views.forEach(v => { viewsByPage[v.page_id] = (viewsByPage[v.page_id] || 0) + 1 })

    const clicksByPage: Record<string, number> = {}
    clicks.forEach(c => {
      const pid = linkToPage[c.link_id]
      if (pid) clicksByPage[pid] = (clicksByPage[pid] || 0) + 1
    })

    const stats: PageStat[] = pages.map(p => {
      const v = viewsByPage[p.id] || 0
      const c = clicksByPage[p.id] || 0
      return { id: p.id, title: p.title, slug: p.slug, views: v, clicks: c, ctr: v > 0 ? Math.round((c / v) * 100) : 0 }
    }).filter(p => p.views > 0 || p.clicks > 0).sort((a, b) => b.clicks - a.clicks)
    setPageStats(stats)

    // Pays
    const countryCounts: Record<string, number> = {}
    views.forEach(v => { if (v.country) countryCounts[v.country] = (countryCounts[v.country] || 0) + 1 })
    const totalV = views.length || 1
    const countryStats = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([country, count]) => ({ country, views: count, pct: Math.round((count / totalV) * 100) }))
    setCountries(countryStats)

    // Referrers (vues + clics combinés)
    const refCounts: Record<string, number> = {}
    views.forEach(v => { if (v.referrer) refCounts[v.referrer] = (refCounts[v.referrer] || 0) + 1 })
    const totalRef = views.length || 1
    const refStats = Object.entries(refCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([source, count]) => ({ source, count, pct: Math.round((count / totalRef) * 100) }))
    setReferrers(refStats)

    // Devices
    const devCounts: Record<string, number> = {}
    views.forEach(v => { if (v.device) devCounts[v.device] = (devCounts[v.device] || 0) + 1 })
    const totalDev = views.length || 1
    const devStats = Object.entries(devCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([device, count]) => ({ device, count, pct: Math.round((count / totalDev) * 100) }))
    setDevices(devStats)

    // Horaire (aujourd'hui uniquement)
    if (period === 'today') {
      const hourCounts: Record<number, number> = {}
      for (let i = 0; i < 24; i++) hourCounts[i] = 0
      views.forEach(v => {
        const h = new Date(v.created_at).getHours()
        hourCounts[h] = (hourCounts[h] || 0) + 1
      })
      setHourly(Object.entries(hourCounts).map(([h, c]) => ({ hour: parseInt(h), count: c })).sort((a, b) => a.hour - b.hour))
    }

    setLoading(false)
  }

  const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0.0'
  const maxHourly = Math.max(...hourly.map(h => h.count), 1)
  const deviceIcons: Record<string, React.ReactNode> = {
    mobile: <Smartphone size={14} />, desktop: <Monitor size={14} />, tablet: <Tablet size={14} />
  }
  const refColors: Record<string, string> = {
    instagram: '#e1306c', facebook: '#1877f2', tiktok: '#010101', direct: '#6b7280', other: '#9ca3af', twitter: '#1da1f2', snapchat: '#fffc00'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></button>
          <h1 className="text-xl font-bold text-gray-900 flex-1">Analytics</h1>
          <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1">
            {(['today', '7d', '30d'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${period === p ? 'bg-pink-500 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
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
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-500">Page Views</p>
                  <Eye size={18} className="text-purple-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{totalViews.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-500">Clics</p>
                  <MousePointerClick size={18} className="text-blue-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{totalClicks.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-500">Click-Through Rate</p>
                  <TrendingUp size={18} className="text-green-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{ctr}%</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Top Links */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-2">
                <h2 className="font-semibold text-gray-800 mb-4">Top Links</h2>
                {pageStats.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">Aucune donnée pour cette période</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-400 border-b border-gray-100">
                          <th className="text-left pb-2 font-medium">#</th>
                          <th className="text-left pb-2 font-medium">Page</th>
                          <th className="text-right pb-2 font-medium">Vues</th>
                          <th className="text-right pb-2 font-medium">Clics</th>
                          <th className="text-right pb-2 font-medium">CTR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {pageStats.map((p, i) => (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="py-2.5 text-gray-400 w-8">#{i + 1}</td>
                            <td className="py-2.5">
                              <p className="font-medium text-gray-800">{p.title}</p>
                              <p className="text-xs text-gray-400">/{p.slug}</p>
                            </td>
                            <td className="py-2.5 text-right text-gray-700">{p.views}</td>
                            <td className="py-2.5 text-right font-semibold text-gray-900">{p.clicks}</td>
                            <td className="py-2.5 text-right">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.ctr >= 30 ? 'bg-green-100 text-green-700' : p.ctr >= 10 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                                {p.ctr}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Referrers */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <h2 className="font-semibold text-gray-800 mb-4">Sources de trafic</h2>
                {referrers.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">Aucune donnée</p>
                ) : (
                  <div className="space-y-3">
                    {referrers.map(r => (
                      <div key={r.source}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">{REFERRER_LABELS[r.source] || r.source}</span>
                          <span className="text-gray-500">{r.count} · {r.pct}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${r.pct}%`, backgroundColor: refColors[r.source] || '#9ca3af' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Devices */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <h2 className="font-semibold text-gray-800 mb-4">Appareils</h2>
                {devices.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">Aucune donnée</p>
                ) : (
                  <div className="space-y-3">
                    {devices.map(d => (
                      <div key={d.device}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="flex items-center gap-1.5 font-medium text-gray-700 capitalize">
                            {deviceIcons[d.device] ?? <Monitor size={14} />} {d.device}
                          </span>
                          <span className="text-gray-500">{d.count} · {d.pct}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-pink-400" style={{ width: `${d.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pays */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2"><Globe size={16} className="text-blue-400" /> Géographie</h2>
                <p className="text-xs text-gray-400 mb-4">{totalViews} visites</p>
                {countries.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">Aucune donnée</p>
                ) : (
                  <div className="space-y-2">
                    {countries.map(c => (
                      <div key={c.country} className="flex items-center gap-3">
                        <span className="flex-1 text-sm text-gray-700 truncate">{c.country}</span>
                        <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-purple-400" style={{ width: `${c.pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">{c.views}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Distribution horaire */}
              {period === 'today' && (
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                  <h2 className="font-semibold text-gray-800 mb-4">Visites par heure (aujourd'hui)</h2>
                  <div className="flex items-end gap-0.5 h-24">
                    {hourly.map(h => (
                      <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full rounded-sm bg-purple-200 hover:bg-purple-400 transition-colors"
                          style={{ height: `${Math.round((h.count / maxHourly) * 80) + (h.count > 0 ? 4 : 0)}px` }}
                          title={`${h.hour}h : ${h.count} visites`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-gray-300 mt-1">
                    <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
