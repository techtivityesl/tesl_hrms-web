import Layout from '../components/Layout'
import styles from '../styles/employee.module.css'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type AttendanceLog = {
  punch_type: 'IN' | 'OUT'
  punched_at: string
  location_name: string
}

export default function EmployeeAttendance() {
  const [userId, setUserId] = useState<string | null>(null)
  const [status, setStatus] = useState<'IN' | 'OUT'>('OUT')
  const [workedSeconds, setWorkedSeconds] = useState(0)
  const [lastPunch, setLastPunch] = useState<string | null>(null)
  const [location, setLocation] = useState<string | null>(null)
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [loading, setLoading] = useState(true)

  // 🔁 Live working hours clock
  useEffect(() => {
    let timer: any
    if (status === 'IN') {
      timer = setInterval(() => {
        setWorkedSeconds(s => s + 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [status])

  // 🔐 Init
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
      await loadAttendance(user.id)
      setLoading(false)
    }

    init()
  }, [])

  const loadAttendance = async (uid: string) => {
    const { data } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', uid)
      .order('punched_at', { ascending: false })

    if (!data || data.length === 0) return

    setLogs(data)

    const last = data[0]
    setStatus(last.punch_type === 'IN' ? 'IN' : 'OUT')
    setLastPunch(last.punched_at)
    setLocation(last.location_name)
  }

  const punch = async (type: 'IN' | 'OUT') => {
    if (!userId) return

    if (!navigator.geolocation) {
      alert('Location permission required')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async pos => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude

        // Simple readable location placeholder
        const locationName = `Lat ${lat.toFixed(3)}, Lng ${lng.toFixed(3)}`

        await supabase.from('attendance_logs').insert({
          user_id: userId,
          punch_type: type,
          punched_at: new Date().toISOString(),
          latitude: lat,
          longitude: lng,
          location_name: locationName
        })

        setStatus(type === 'IN' ? 'IN' : 'OUT')
        if (type === 'OUT') setWorkedSeconds(workedSeconds)

        await loadAttendance(userId)
      },
      () => alert('Please allow location access to punch')
    )
  }

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(
      2,
      '0'
    )}:${String(sec).padStart(2, '0')}`
  }

  if (loading) return <Layout>Loading...</Layout>

  return (
    <Layout>
      <div className={styles.page}>
        <h1 className={styles.title}>Attendance</h1>

        {/* STATUS CARD */}
        <div className={styles.card}>
          <p><strong>Status:</strong> {status}</p>
          <p><strong>Worked Today:</strong> {formatTime(workedSeconds)}</p>
          {lastPunch && (
            <p><strong>Last Punch:</strong> {new Date(lastPunch).toLocaleString()}</p>
          )}
          {location && <p><strong>Location:</strong> {location}</p>}

          {/* 🔘 PUNCH BUTTONS */}
          <div style={{ marginTop: 16 }}>
            {status === 'OUT' ? (
              <button
                className={styles.punchBtn}
                onClick={() => punch('IN')}
              >
                Punch In
              </button>
            ) : (
              <button
                className={styles.punchBtn}
                onClick={() => punch('OUT')}
              >
                Punch Out
              </button>
            )}
          </div>
        </div>

        {/* HISTORY */}
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
              {logs.map((l, i) => (
                <tr key={i}>
                  <td>{l.punch_type}</td>
                  <td>{new Date(l.punched_at).toLocaleString()}</td>
                  <td>{l.location_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
