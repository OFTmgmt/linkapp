export function validateSlug(slug: string): string | null {
  if (!slug) return 'Le slug est requis'
  if (slug.length > 60) return 'Le slug ne peut pas dépasser 60 caractères'
  if (!/^[a-z0-9-]+$/.test(slug)) return 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets'
  if (slug.startsWith('-') || slug.endsWith('-')) return 'Le slug ne peut pas commencer ou finir par un tiret'
  return null
}

export function validateTitle(title: string): string | null {
  if (!title.trim()) return 'Le titre est requis'
  if (title.length > 100) return 'Le titre ne peut pas dépasser 100 caractères'
  return null
}

export function validateBio(bio: string): string | null {
  if (bio.length > 500) return 'La bio ne peut pas dépasser 500 caractères'
  return null
}

export function validateFolderName(name: string): string | null {
  if (!name.trim()) return 'Le nom du dossier est requis'
  if (name.length > 100) return 'Le nom ne peut pas dépasser 100 caractères'
  return null
}

export function validateUrl(url: string): string | null {
  if (!url) return 'L\'URL est requise'
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return 'L\'URL doit commencer par http:// ou https://'
    }
  } catch {
    return 'L\'URL n\'est pas valide'
  }
  return null
}

export function validateLinkLabel(label: string): string | null {
  if (!label.trim()) return 'Le label est requis'
  if (label.length > 100) return 'Le label ne peut pas dépasser 100 caractères'
  return null
}

export function sanitizeSlug(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').slice(0, 60)
}
