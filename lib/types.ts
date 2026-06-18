export type Folder = {
  id: string
  name: string
  created_at: string
}

export type Page = {
  id: string
  folder_id: string
  slug: string
  title: string
  bio: string | null
  avatar_url: string | null
  background_color: string
  age_gate: boolean
  show_location: boolean
  background_image: string | null
  button_bg: string
  button_text_color: string
  button_radius: string
  button_shadow: boolean
  button_border: string
  created_at: string
}

export type Link = {
  id: string
  page_id: string
  label: string
  url: string
  icon: string
  position: number
  created_at: string
}

export type Click = {
  id: string
  link_id: string
  clicked_at: string
}
