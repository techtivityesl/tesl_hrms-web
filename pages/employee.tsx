import Layout from '../components/Layout'
import styles from '../styles/employee.module.css'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Notification = {
  id: string
  message: string
  read: boolean
  created_at: string
}

export default function EmployeeDashboard() {
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        window.location.href = '/'
        return
      }

      const authUserId = data.session.user.id

      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', authUserId)
        .single()

      if (!user) return

      setUserId(user.id)
      await loadNotifications(user.id)
      setLoading(false)
    }

    init()
  }, [])

  const loadNotifications = async (uid: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(3)

    if (data) setNotifications(data)
  }

  if (loading) {
    return <Layout>Loading...</Layout>
  }

  return (
    <Layout>
      <div className={styles.page}>
        <h1 className={styles.title}>Employee Dashboard</h1>

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className={styles.card} style={{ marginBottom: 24 }}>
            <h3>Notifications</h3>

            {notifications.map(n => (
              <div
                key={n.id}
                style={{
                  padding: '10px 12px',
                  marginTop: 8,
                  borderRadius: 6,
                  background: n.read ? '#f1f1f1' : '#e8f5e9',
                  fontSize: 14
                }}
              >
                {n.message}
              </div>
            ))}
          </div>
        )}

        {/* Placeholder for other dashboard widgets */}
        <div className={styles.card}>
          <p>Welcome to HRMS 👋</p>
        </div>
      </div>
    </Layout>
  )
}
