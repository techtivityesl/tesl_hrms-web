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

type Attendance = {
  punch_type: string
  punched_at: string
  location_name: string
}

export default function EmployeeDashboard() {
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [status, setStatus] = useState<'IN' | 'OUT'>('OUT')
  const [lastPunch, setLastPunch] = useState<string | null>(null)
  const [location, setLocation] = useState<string | null>(null)
  const [workedSeconds, setWorkedSeconds] = useState(0)
  const [attendance, setAttendance] = useState<Attendance[]>([])

  // ⏱ Live clock
  useEffect(() => {
    let timer: any
    if (status === 'IN') {
      timer = setInterval(() => {
        setWorkedSeconds(s => s + 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [status])

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
      await loadAttendance(user.id)

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

  const loadAttendance = async (uid: string) => {
    const { data } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', uid)
      .order('punched_at', { ascending: false })

    if (!data || data.length === 0) return

    setAttendance(data)

    const last = data[0]
    setLastPunch(last.punched_at)
    setLocation(last.location_name)

    if (last.punch_type === 'IN') {
      setStatus('IN')
    } else {
      setStatus('OUT')
    }
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m
      .toString()
      .padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  if (loading) return <Layout>Loading...</Layout>

  return (
    <Layout>
      <div className={styles.page}>
        <h1 className={styles.title}>Employee Dashboard</h1>

        {/* 🔔 Notifications */}
        {notifications.length > 0 && (
          <div className={styles.card}>
            <h3>Notifications</h3>
            {notifications.map(n => (
              <div
                key={n.id}
                style={{
                  background: '#e8f5e9',
                  padding: 10,
                  borderRadius: 6,
                  marginTop: 8
                }}
              >
                {n.message}
              </div>
            ))}
          </div>
        )}

        {/* ⏱ Attendance */}
        <div className={styles.card} style={{ marginTop: 24 }}>
          <p><strong>Status:</strong> {status}</p>
          <p><strong>Worked Today:</strong> {formatTime(workedSeconds)}</p>
          {lastPunch && <p><strong>Last Punch:</strong> {new Date(lastPunch).toLocaleString()}</p>}
          {location && <p><strong>Location:</strong> {location}</p>}
        </div>

        {/* 📅 History */}
        <div className={styles.card} style={{ marginTop: 24 }}>
          <h3>Attendance History</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Time</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((a, i) => (
                <tr key={i}>
                  <td>{a.punch_type}</td>
                  <td>{new Date(a.punched_at).toLocaleString()}</td>
                  <td>{a.location_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
