import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  const { userId, newPassword } = await req.json()
  if (!userId || !newPassword) return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  if (newPassword.length < 8) return NextResponse.json({ error: '8 caractères minimum' }, { status: 400 })

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
