import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import PageContent from './PageContent'

export default async function PublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data: page } = await supabase.from('pages').select('*').eq('slug', slug).single()
  if (!page) notFound()

  const { data: links } = await supabase.from('links').select('*').eq('page_id', page.id).order('position')

  return <PageContent page={page} links={links || []} />
}
