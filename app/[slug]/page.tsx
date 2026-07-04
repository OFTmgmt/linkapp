import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import PageContent from './PageContent'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const { data: page } = await supabase.from('pages').select('title, bio, avatar_url').eq('slug', slug).single()
  if (!page) return {}

  const title = page.title
  const description = `Retrouvez tous les liens de ${page.title}`
  const image = page.avatar_url || undefined

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://my-links-page.com/${slug}`,
      siteName: 'My Links',
      images: image ? [{ url: image, width: 400, height: 400 }] : [],
    },
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  }
}

export default async function PublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data: page } = await supabase.from('pages').select('*').eq('slug', slug).single()
  if (!page) notFound()

  const { data: links } = await supabase.from('links').select('*').eq('page_id', page.id).order('position')

  return <PageContent page={page} links={links || []} />
}
