import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const folderId = searchParams.get('folder_id')

  if (!from || !to) return NextResponse.json({ error: 'Dates manquantes' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const toDate = new Date(to)
  toDate.setHours(23, 59, 59, 999)

  let pagesQuery = admin.from('pages').select('id, title, slug, folder_id')
  if (folderId) pagesQuery = pagesQuery.eq('folder_id', folderId)
  const { data: pages } = await pagesQuery

  if (!pages || pages.length === 0) {
    return new NextResponse('Date,Page,Slug,Clics\n', {
      headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="export-clics.csv"' }
    })
  }

  const pageIds = pages.map(p => p.id)
  const { data: links } = await admin.from('links').select('id, page_id').in('page_id', pageIds)
  const linkIds = links?.map(l => l.id) || []

  const { data: clicks } = linkIds.length > 0
    ? await admin.from('clicks').select('link_id, created_at').in('link_id', linkIds).gte('created_at', from).lte('created_at', toDate.toISOString())
    : { data: [] }

  const linkToPage: Record<string, string> = {}
  links?.forEach(l => { linkToPage[l.id] = l.page_id })

  const daily: Record<string, Record<string, number>> = {}
  const start = new Date(from)
  const end = new Date(to)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10)
    daily[key] = {}
    pages.forEach(p => { daily[key][p.id] = 0 })
  }

  clicks?.forEach(c => {
    const day = c.created_at.slice(0, 10)
    const pid = linkToPage[c.link_id]
    if (pid && daily[day] !== undefined) daily[day][pid] = (daily[day][pid] || 0) + 1
  })

  const rows: string[] = ['Date,Dossier,Page,Slug,Clics']
  Object.entries(daily).sort().forEach(([date, pageCounts]) => {
    pages.forEach(p => {
      const count = pageCounts[p.id] || 0
      if (count > 0) rows.push(`${date},"${p.title}","${p.slug}",${count}`)
    })
  })

  const csv = rows.join('\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="clics-${from}-${to}.csv"`,
    }
  })
}
