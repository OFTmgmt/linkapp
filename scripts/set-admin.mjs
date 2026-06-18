// Script one-shot : définir le rôle admin sur ton compte
// Usage : node scripts/set-admin.mjs <USER_ID>

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://nbcpbxzqjdxvihqlussh.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('Lance avec : SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/set-admin.mjs <USER_ID>')
  process.exit(1)
}

const userId = process.argv[2]
if (!userId) {
  console.error('Donne ton user ID en argument : node scripts/set-admin.mjs <USER_ID>')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const { data, error } = await admin.auth.admin.updateUserById(userId, {
  user_metadata: { role: 'admin' }
})

if (error) { console.error('Erreur:', error.message); process.exit(1) }
console.log('✓ Rôle admin défini pour :', data.user.email)
