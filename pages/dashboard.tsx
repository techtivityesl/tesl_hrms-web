import { useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function DashboardRouter() {
  useEffect(() => {
    const routeUser = async () => {
      const { data: sessionData } = await supabase.auth.getSession()

      if (!sessionData.session) {
        window.location.href = '/'
        return
      }

      const authUserId = sessionData.session.user.id

      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('auth_user_id', authUserId)
        .single()

      if (error || !data) {
        alert('User role not found')
        return
      }

      if (data.role === 'admin') {
        window.location.href = '/admin'
      } else if (data.role === 'manager') {
        window.location.href = '/manager'
      } else {
        window.location.href = '/employee'
      }
    }

    routeUser()
  }, [])

  return <p style={{ padding: 40 }}>Routing user...</p>
}
