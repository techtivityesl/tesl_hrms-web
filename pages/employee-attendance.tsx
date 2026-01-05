import Layout from '../components/Layout'
import styles from '../styles/employee.module.css'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function EmployeeAttendance() {
  const [status, setStatus] = useState<'IN' | 'OUT'>('OUT')
  const [workedSeconds, setWorkedSeconds] = useState(0)
  const [lastPunch, setLastPunch] = useState<string | null>(null)
  const [location, setLocation] = useState<string | null>(null)
  const [attendance, setAttendance] = useState<any[]>([])
  const [userId, setUserId] = useState<string | null>(null)

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

      const { data: logs } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('punched_at', { ascending: false })

      if (logs && logs.length > 0) {
        setAttendance(logs)
        const last = logs[0]
        setLastPunch(last.punched_at)
        setLocation(last.location_name)
        setStatus(last.punch_type === 'IN' ? 'IN' : 'OUT')
      }
    }

    init()
  }, [])

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(
      Math.floor((s % 3600) / 60)
    ).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <Layout>
      <div className={styles.page}>
        <h1 className={styles.title}>Attendance</h1>

        <div className={styles.card}>
          <p>Status: <strong>{status}</strong></p>
          <p>Worked Today: <strong>{formatTime(workedSeconds)}</strong></p>
          {lastPunch && <p>Last Punch: {new Date(lastPunch).toLocaleString()}</p>}
          {location && <p>Location: {location}</p>}
        </div>

        <div className={styles.card} style={{ marginTop: 24 }}>
          <h3>History</h3>
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
