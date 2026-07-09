// Pure data — safe to import in client components (no next/font loader here).
// `family` references the CSS variables declared by lib/fonts.ts in the layout.
export const FONT_OPTIONS = [
  { id: 'inter', label: 'Moderne', family: 'var(--font-inter), sans-serif' },
  { id: 'poppins', label: 'Rond', family: 'var(--font-poppins), sans-serif' },
  { id: 'montserrat', label: 'Élégant', family: 'var(--font-montserrat), sans-serif' },
  { id: 'quicksand', label: 'Doux', family: 'var(--font-quicksand), sans-serif' },
  { id: 'playfair', label: 'Chic', family: 'var(--font-playfair), serif' },
  { id: 'cormorant', label: 'Luxe', family: 'var(--font-cormorant), serif' },
  { id: 'dancing', label: 'Manuscrit', family: 'var(--font-dancing), cursive' },
  { id: 'bebas', label: 'Impact', family: 'var(--font-bebas), sans-serif' },
] as const

export function fontFamilyById(id: string | null | undefined): string | undefined {
  if (!id) return undefined
  return FONT_OPTIONS.find(f => f.id === id)?.family
}
