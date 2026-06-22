'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

export function useRole() {
  const [role, setRole] = useState<'admin' | 'manager' | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.refreshSession().then(({ data: { session } }) => {
      const r = session?.user?.user_metadata?.role
      setRole((r as 'admin' | 'manager') ?? 'admin')
      setUserId(session?.user?.id ?? null)
      setLoading(false)
    })
  }, [])

  return { role, loading, isAdmin: role === 'admin', userId }
}
