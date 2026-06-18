'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

const supabase = createClient()
import { Page, Link } from '@/lib/types'
import { validateSlug, validateTitle, validateBio, validateUrl, validateLinkLabel, sanitizeSlug } from '@/lib/validation'
import { Plus, Trash2, ArrowUp, ArrowDown, ArrowLeft, Save, Upload, X } from 'lucide-react'
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

const TEMPLATES = [
  { name: 'Rose', bg: '#ff6eb4' },
  { name: 'Violet', bg: '#7c3aed' },
  { name: 'Noir', bg: '#111111' },
  { name: 'Bleu', bg: '#2563eb' },
  { name: 'Rouge', bg: '#dc2626' },
  { name: 'Vert', bg: '#16a34a' },
  { name: 'Dégradé rose', bg: 'linear-gradient(135deg, #ff6eb4, #ff9a9e)' },
  { name: 'Dégradé violet', bg: 'linear-gradient(135deg, #7c3aed, #ec4899)' },
  { name: 'Dégradé bleu', bg: 'linear-gradient(135deg, #2563eb, #7c3aed)' },
]

function centerAspectCrop(w: number, h: number) {
  return centerCrop(makeAspectCrop({ unit: '%', width: 90 }, 1, w, h), w, h)
}

export default function EditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [page, setPage] = useState<Page | null>(null)
  const [links, setLinks] = useState<Link[]>([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bgFileInputRef = useRef<HTMLInputElement>(null)

  // Crop state
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<Crop>()
  const imgRef = useRef<HTMLImageElement>(null)
  const [originalFile, setOriginalFile] = useState<File | null>(null)

  useEffect(() => { loadPage() }, [id])

  async function loadPage() {
    const { data: pageData } = await supabase.from('pages').select('*').eq('id', id).single()
    const { data: linksData } = await supabase.from('links').select('*').eq('page_id', id).order('position')
    setPage(pageData)
    setLinks(linksData || [])
  }

  function onFileSelect(file: File) {
    setOriginalFile(file)
    const reader = new FileReader()
    reader.onload = () => setCropSrc(reader.result as string)
    reader.readAsDataURL(file)
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget
    setCrop(centerAspectCrop(width, height))
  }

  async function applyCrop() {
    if (!completedCrop || !imgRef.current || !originalFile) return
    setUploading(true)

    const canvas = document.createElement('canvas')
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height
    const size = 400
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0, 0, size, size
    )

    const blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), 'image/jpeg', 0.9))
    const filename = `${id}-${Date.now()}.jpg`
    const { error } = await supabase.storage.from('avatars').upload(filename, blob, { upsert: true, contentType: 'image/jpeg' })
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(filename)
      setPage(prev => prev ? { ...prev, avatar_url: data.publicUrl } : prev)
    }
    setCropSrc(null)
    setUploading(false)
  }

  async function uploadBgImage(file: File) {
    const ext = file.name.split('.').pop()
    const filename = `bg-${id}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(filename, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(filename)
      setPage(prev => prev ? { ...prev, background_image: data.publicUrl } : prev)
    }
  }

  async function savePage() {
    if (!page) return
    const newErrors: Record<string, string> = {}
    const titleErr = validateTitle(page.title)
    const slugErr = validateSlug(page.slug)
    const bioErr = page.bio ? validateBio(page.bio) : null
    if (titleErr) newErrors.title = titleErr
    if (slugErr) newErrors.slug = slugErr
    if (bioErr) newErrors.bio = bioErr
    links.forEach((link, i) => {
      const labelErr = validateLinkLabel(link.label)
      const urlErr = validateUrl(link.url)
      if (labelErr) newErrors[`link_label_${i}`] = labelErr
      if (urlErr) newErrors[`link_url_${i}`] = urlErr
    })
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    setErrors({})
    setSaving(true)
    await supabase.from('pages').update({
      title: page.title,
      bio: page.bio,
      avatar_url: page.avatar_url,
      background_color: page.background_color,
      slug: page.slug,
      age_gate: page.age_gate,
      show_location: page.show_location,
      background_image: page.background_image,
      button_bg: page.button_bg,
      button_text_color: page.button_text_color,
      button_radius: page.button_radius,
      button_shadow: page.button_shadow,
      button_border: page.button_border,
    }).eq('id', id)

    for (const link of links) {
      if (link.id.startsWith('new-')) {
        await supabase.from('links').insert({ page_id: id, label: link.label, url: link.url, icon: link.icon, position: link.position })
      } else {
        await supabase.from('links').update({ label: link.label, url: link.url, icon: link.icon, position: link.position }).eq('id', link.id)
      }
    }
    setSaving(false)
    loadPage()
  }

  function addLink() {
    setLinks([...links, { id: `new-${Date.now()}`, page_id: id, label: '', url: '', icon: 'link', position: links.length, created_at: '' }])
  }

  async function removeLink(linkId: string) {
    if (!linkId.startsWith('new-')) await supabase.from('links').delete().eq('id', linkId)
    setLinks(links.filter(l => l.id !== linkId))
  }

  function moveLink(index: number, dir: -1 | 1) {
    const newLinks = [...links]
    const target = index + dir
    if (target < 0 || target >= newLinks.length) return
    ;[newLinks[index], newLinks[target]] = [newLinks[target], newLinks[index]]
    setLinks(newLinks.map((l, i) => ({ ...l, position: i })))
  }

  if (!page) return <div className="flex items-center justify-center h-screen text-gray-500">Chargement...</div>

  const isGradient = page.background_color.startsWith('linear-gradient')
  const bgStyle = page.background_image
    ? { backgroundImage: `url(${page.background_image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : isGradient
    ? { backgroundImage: page.background_color }
    : { backgroundColor: page.background_color }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></button>
          <h1 className="text-xl font-bold text-gray-900 flex-1">Modifier la page</h1>
          <button onClick={savePage} disabled={saving} className="bg-pink-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-pink-600 flex items-center gap-2 disabled:opacity-50">
            <Save size={16} /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>

        <div className="flex gap-6">
          {/* Colonne gauche — édition */}
          <div className="flex-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
              <h2 className="font-semibold text-gray-700">Infos générales</h2>
              <div>
                <input className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 ${errors.title ? 'border-red-400' : ''}`} placeholder="Titre" value={page.title} onChange={e => { setPage({ ...page, title: e.target.value }); setErrors(p => ({ ...p, title: '' })) }} />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
              </div>
              <div>
                <input className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 ${errors.slug ? 'border-red-400' : ''}`} placeholder="Slug (URL)" value={page.slug} onChange={e => { setPage({ ...page, slug: sanitizeSlug(e.target.value) }); setErrors(p => ({ ...p, slug: '' })) }} />
                {errors.slug && <p className="text-xs text-red-500 mt-1">{errors.slug}</p>}
              </div>
              <div>
                <input className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 ${errors.bio ? 'border-red-400' : ''}`} placeholder="Bio (optionnel)" value={page.bio || ''} onChange={e => { setPage({ ...page, bio: e.target.value }); setErrors(p => ({ ...p, bio: '' })) }} />
                {errors.bio && <p className="text-xs text-red-500 mt-1">{errors.bio}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-600 font-medium">Photo de profil</label>
                <div className="flex items-center gap-4">
                  {page.avatar_url ? (
                    <img src={page.avatar_url} alt="avatar" className="w-16 h-16 rounded-full object-cover border-2 border-pink-200" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-300"><Upload size={20} /></div>
                  )}
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="text-sm bg-pink-50 text-pink-600 px-4 py-2 rounded-lg hover:bg-pink-100 flex items-center gap-2 disabled:opacity-50">
                    <Upload size={14} /> {uploading ? 'Upload...' : 'Importer depuis PC'}
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && onFileSelect(e.target.files[0])} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-700 mb-4">Template / Couleur de fond</h2>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {TEMPLATES.map(t => (
                  <button key={t.name} onClick={() => setPage({ ...page, background_color: t.bg })}
                    className={`h-12 rounded-xl text-xs font-medium text-white transition-all border-2 ${page.background_color === t.bg ? 'border-gray-800 scale-95' : 'border-transparent hover:scale-95'}`}
                    style={{ background: t.bg }}>
                    {t.name}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-500">Custom :</label>
                <input type="color" value={isGradient ? '#ff6eb4' : page.background_color} onChange={e => setPage({ ...page, background_color: e.target.value })} className="w-10 h-10 rounded cursor-pointer border-0" />
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                <label className="text-sm text-gray-600 font-medium">Image de fond</label>
                <div className="flex items-center gap-3">
                  {page.background_image && (
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={page.background_image} alt="bg" className="w-full h-full object-cover" />
                      <button onClick={() => setPage({ ...page, background_image: null })} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 text-white">
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  <div className="flex flex-col gap-2 flex-1">
                    <button
                      onClick={() => bgFileInputRef.current?.click()}
                      className="text-sm bg-gray-50 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2 border border-gray-200"
                    >
                      <Upload size={14} /> Importer depuis PC
                    </button>
                    <input
                      className="text-xs border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-pink-400 text-gray-500"
                      placeholder="Ou colle une URL..."
                      value={page.background_image || ''}
                      onChange={e => setPage({ ...page, background_image: e.target.value })}
                    />
                  </div>
                </div>
                <input
                  ref={bgFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && uploadBgImage(e.target.files[0])}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-700 mb-4">Style des boutons</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Couleur fond</p>
                    <input type="color"
                      value={page.button_bg?.startsWith('rgba') ? '#ffffff' : (page.button_bg || '#ffffff')}
                      onChange={e => {
                        const hex = e.target.value
                        const r = parseInt(hex.slice(1,3),16)
                        const g = parseInt(hex.slice(3,5),16)
                        const b = parseInt(hex.slice(5,7),16)
                        const current = page.button_bg?.match(/rgba?\([^)]+\)/)
                        const a = current ? parseFloat(page.button_bg.match(/[\d.]+(?=\))/)?.[0] || '1') : 1
                        setPage({ ...page, button_bg: `rgba(${r},${g},${b},${a})` })
                      }}
                      className="w-10 h-10 rounded cursor-pointer border-0" />
                  </div>
                  <div className="flex-[2]">
                    <p className="text-xs text-gray-500 mb-1">Opacité fond ({Math.round(parseFloat(page.button_bg?.match(/[\d.]+(?=\))/)?.[0] || '1') * 100)}%)</p>
                    <input type="range" min="0" max="100" step="1"
                      value={Math.round(parseFloat(page.button_bg?.match(/[\d.]+(?=\))/)?.[0] || '1') * 100)}
                      onChange={e => {
                        const a = parseInt(e.target.value) / 100
                        const match = page.button_bg?.match(/rgba?\((\d+),(\d+),(\d+)/)
                        if (match) {
                          setPage({ ...page, button_bg: `rgba(${match[1]},${match[2]},${match[3]},${a})` })
                        } else {
                          setPage({ ...page, button_bg: `rgba(255,255,255,${a})` })
                        }
                      }}
                      className="w-full accent-pink-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Couleur texte</p>
                    <input type="color" value={page.button_text_color || '#ffffff'} onChange={e => setPage({ ...page, button_text_color: e.target.value })} className="w-10 h-10 rounded cursor-pointer border-0" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Bordure</p>
                    <input type="color" value={page.button_border === 'none' ? '#ffffff' : (page.button_border || '#ffffff')} onChange={e => setPage({ ...page, button_border: `2px solid ${e.target.value}` })} className="w-10 h-10 rounded cursor-pointer border-0" />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">Arrondi</p>
                  <div className="flex gap-2">
                    {[{ label: 'Carré', val: '0' }, { label: 'Arrondi', val: '0.5rem' }, { label: 'Pill', val: '9999px' }].map(r => (
                      <button key={r.val} onClick={() => setPage({ ...page, button_radius: r.val })}
                        className={`flex-1 py-2 text-xs font-medium border rounded-lg transition-all ${page.button_radius === r.val ? 'bg-pink-500 text-white border-pink-500' : 'text-gray-600 hover:bg-gray-50'}`}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center justify-between cursor-pointer">
                  <p className="text-sm text-gray-700">Ombre portée</p>
                  <div onClick={() => setPage({ ...page, button_shadow: !page.button_shadow })} className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${page.button_shadow ? 'bg-pink-500' : 'bg-gray-200'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-transform ${page.button_shadow ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </label>
                <div className="pt-2">
                  <p className="text-xs text-gray-500 mb-2">Présets rapides</p>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { label: 'Verre', bg: 'rgba(255,255,255,0.2)', border: 'none', radius: '1rem', shadow: false, color: '#ffffff' },
                      { label: 'Blanc', bg: '#ffffff', border: 'none', radius: '1rem', shadow: true, color: '#111111' },
                      { label: 'Noir', bg: '#111111', border: 'none', radius: '1rem', shadow: false, color: '#ffffff' },
                      { label: 'Outline', bg: 'transparent', border: '2px solid #ffffff', radius: '1rem', shadow: false, color: '#ffffff' },
                    ].map(p => (
                      <button key={p.label} onClick={() => setPage(prev => prev ? { ...prev, button_bg: p.bg, button_border: p.border, button_radius: p.radius, button_shadow: p.shadow, button_text_color: p.color } : prev)}
                        className="px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50 text-gray-600">
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-700 mb-4">Options</h2>
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Vérification d'âge (18+)</p>
                    <p className="text-xs text-gray-400">Double confirmation avant d'accéder à la page</p>
                  </div>
                  <div onClick={() => setPage({ ...page, age_gate: !page.age_gate })} className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${page.age_gate ? 'bg-pink-500' : 'bg-gray-200'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-transform ${page.age_gate ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Géolocalisation du visiteur</p>
                    <p className="text-xs text-gray-400">Affiche la ville du visiteur sur la page</p>
                  </div>
                  <div onClick={() => setPage({ ...page, show_location: !page.show_location })} className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${page.show_location ? 'bg-pink-500' : 'bg-gray-200'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-transform ${page.show_location ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </label>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-700">Liens</h2>
                <button onClick={addLink} className="text-sm bg-pink-50 text-pink-600 px-3 py-1.5 rounded-lg hover:bg-pink-100 flex items-center gap-1"><Plus size={14} /> Ajouter</button>
              </div>
              {links.length === 0 && <p className="text-center text-gray-300 text-sm py-6">Aucun lien — clique sur Ajouter</p>}
              <div className="space-y-3">
                {links.map((link, i) => (
                  <div key={link.id} className="p-3 bg-gray-50 rounded-lg space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-1">
                        <button onClick={() => moveLink(i, -1)} className="text-gray-300 hover:text-gray-500"><ArrowUp size={14} /></button>
                        <button onClick={() => moveLink(i, 1)} className="text-gray-300 hover:text-gray-500"><ArrowDown size={14} /></button>
                      </div>
                      <input className={`flex-1 border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-pink-400 ${errors[`link_label_${i}`] ? 'border-red-400' : ''}`} placeholder="Label" value={link.label} onChange={e => { setLinks(links.map(l => l.id === link.id ? { ...l, label: e.target.value } : l)); setErrors(p => ({ ...p, [`link_label_${i}`]: '' })) }} />
                      <input className={`flex-[2] border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-pink-400 ${errors[`link_url_${i}`] ? 'border-red-400' : ''}`} placeholder="https://..." value={link.url} onChange={e => { setLinks(links.map(l => l.id === link.id ? { ...l, url: e.target.value } : l)); setErrors(p => ({ ...p, [`link_url_${i}`]: '' })) }} />
                      <button onClick={() => removeLink(link.id)} className="text-gray-300 hover:text-red-400"><Trash2 size={16} /></button>
                    </div>
                    {(errors[`link_label_${i}`] || errors[`link_url_${i}`]) && (
                      <div className="flex gap-2 pl-8">
                        <p className="flex-1 text-xs text-red-500">{errors[`link_label_${i}`]}</p>
                        <p className="flex-[2] text-xs text-red-500">{errors[`link_url_${i}`]}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Colonne droite — aperçu */}
          <div className="w-72 flex-shrink-0">
            <div className="sticky top-6">
              <p className="text-xs text-gray-400 text-center mb-2 font-medium uppercase tracking-wide">Aperçu</p>
              <div className="rounded-2xl overflow-hidden shadow-xl border-4 border-gray-200" style={{ height: '580px' }}>
                <div className="w-full h-full flex flex-col items-center justify-center px-4 py-8 overflow-y-auto" style={bgStyle}>
                  {page.avatar_url && (
                    <img src={page.avatar_url} alt={page.title} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg mb-4" />
                  )}
                  {!page.avatar_url && (
                    <div className="w-20 h-20 rounded-full bg-white/20 mb-4" />
                  )}
                  <h1 className="text-xl font-bold text-white drop-shadow mb-1">{page.title || 'Titre'}</h1>
                  {page.bio && <p className="text-white/80 text-center text-xs mb-4">{page.bio}</p>}
                  <div className="w-full space-y-2 mt-2">
                    {links.filter(l => l.label).map(link => (
                      <div key={link.id} className="w-full text-center text-sm font-semibold py-3 px-4"
                        style={{ background: page.button_bg, color: page.button_text_color, borderRadius: page.button_radius, border: page.button_border, boxShadow: page.button_shadow ? '0 4px 15px rgba(0,0,0,0.3)' : 'none' }}>
                        {link.label}
                      </div>
                    ))}
                    {links.length === 0 && (
                      <div className="w-full text-center text-sm py-3 px-4"
                        style={{ background: page.button_bg, color: page.button_text_color, borderRadius: page.button_radius, border: page.button_border, opacity: 0.5 }}>
                        Tes liens apparaîtront ici
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal recadrage */}
      {cropSrc && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Recadrer la photo</h3>
              <button onClick={() => setCropSrc(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={1} circularCrop>
              <img ref={imgRef} src={cropSrc} onLoad={onImageLoad} className="max-h-96 w-full object-contain" />
            </ReactCrop>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setCropSrc(null)} className="flex-1 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
              <button onClick={applyCrop} disabled={uploading} className="flex-1 bg-pink-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-pink-600 disabled:opacity-50">
                {uploading ? 'Upload...' : 'Appliquer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
