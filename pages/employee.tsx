import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type DayRecord = {
  date: string
  inTime?: string
  outTime?: string
  duration?: string
  location?: string
}

export default function EmployeeDashboard() {
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [status, setStatus] = useState<'IN' | 'OUT'>('OUT')
  const [lastTime, setLastTime] = useState<string | null>(null)
  const [lastLocation, setLastLocation] = useState<string | null>(null)

  const [punchInTime, setPunchInTime] = useState<Date | null>(null)
  const [workedSeconds, setWorkedSeconds] = useState(0)
  const [frozenSeconds, setFrozenSeconds] = useState<number | null>(null)

  const [history, setHistory] = useState<DayRecord[]>([])

  // ---------- INIT ----------
  useEffect(() => {
    const init = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        window.location.href = '/'
        return
      }

      const authUserId = sessionData.session.user.id

      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', authUserId)
        .single()

      if (!user) {
        alert('HR record not found')
        return
      }

      setUserId(user.id)

      // Last punch
      const { data: lastPunch } = await supabase
        .from('attendance_logs')
        .select('punch_type, punched_at, location_name')
        .eq('user_id', user.id)
        .order('punched_at', { ascending: false })
        .limit(1)
        .single()

      if (lastPunch) {
        setStatus(lastPunch.punch_type === 'IN' ? 'IN' : 'OUT')
        setLastTime(new Date(lastPunch.punched_at).toLocaleString())
        setLastLocation(lastPunch.location_name)

        if (lastPunch.punch_type === 'IN') {
          const inTime = new Date(lastPunch.punched_at)
          setPunchInTime(inTime)
          setWorkedSeconds(
            Math.floor((Date.now() - inTime.getTime()) / 1000)
          )
        }
      }

      await loadMonthlyHistory(user.id)
      setLoading(false)
    }

    init()
  }, [])

  // ---------- LIVE CLOCK ----------
  useEffect(() => {
    if (status !== 'IN' || !punchInTime) return

    const interval = setInterval(() => {
      setWorkedSeconds(
        Math.floor((Date.now() - punchInTime.getTime()) / 1000)
      )
    }, 1000)

    return () => clearInterval(interval)
  }, [status, punchInTime])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m
      .toString()
      .padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // ---------- LOCATION ----------
  const getLocationWithAddress = (): Promise<{
    lat: number
    lng: number
    address: string
  }> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        async pos => {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude

          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          )
          const data = await res.json()
          const a = data.address || {}

          const area = a.suburb || a.neighbourhood || a.village || ''
          const city = a.city || a.town || ''
          const state = a.state || ''

          resolve({
            lat,
            lng,
            address: [area, city, state].filter(Boolean).join(', ')
          })
        },
        () => reject('Location permission denied'),
        { enableHighAccuracy: true }
      )
    })
  }

  // ---------- PUNCH ----------
  const punch = async (type: 'IN' | 'OUT') => {
    if (!userId) return

    try {
      const location = await getLocationWithAddress()
      const now = new Date()

      await supabase.from('attendance_logs').insert({
        user_id: userId,
        punch_type: type,
        punched_at: now.toISOString(),
        latitude: location.lat,
        longitude: location.lng,
        location_name: location.address
      })

      setStatus(type)
      setLastTime(now.toLocaleString())
      setLastLocation(location.address)

      if (type === 'IN') {
        setPunchInTime(now)
        setFrozenSeconds(null)
        setWorkedSeconds(0)
      } else {
        setFrozenSeconds(workedSeconds)
        setPunchInTime(null)
      }

      await loadMonthlyHistory(userId)
    } catch (e: any) {
      alert(e)
    }
  }

  // ---------- MONTHLY HISTORY ----------
  const loadMonthlyHistory = async (uid: string) => {
    const start = new Date()
    start.setDate(1)
    start.setHours(0, 0, 0, 0)

    const { data } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', uid)
      .gte('punched_at', start.toISOString())
      .order('punched_at')

    if (!data) return

    const map: Record<string, DayRecord> = {}

    data.forEach(d => {
      const date = new Date(d.punched_at).toLocaleDateString()
      if (!map[date]) map[date] = { date }

      if (d.punch_type === 'IN') {
        map[date].inTime = new Date(d.punched_at).toLocaleTimeString()
        map[date].location = d.location_name
      } else {
        map[date].outTime = new Date(d.punched_at).toLocaleTimeString()

        if (map[date].inTime) {
          const diff =
            new Date(d.punched_at).getTime() -
            new Date(`${date} ${map[date].inTime}`).getTime()
          map[date].duration = formatTime(Math.floor(diff / 1000))
        }
      }
    })

    setHistory(Object.values(map))
  }

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) return <p style={{ padding: 40 }}>Loading...</p>

  return (
    <div style={{ padding: 40 }}>
      <h1>Employee Dashboard</h1>

      <p>Status: <b>{status}</b></p>
      {lastTime && <p>Last Punch Time: <b>{lastTime}</b></p>}
      {lastLocation && <p>Last Location: <b>{lastLocation}</b></p>}

      {(status === 'IN' || frozenSeconds !== null) && (
        <p>
          Worked Time Today:{' '}
          <b>
            {formatTime(
              status === 'IN' ? workedSeconds : frozenSeconds || 0
            )}
          </b>
        </p>
      )}

      <br />

      {status === 'OUT' && <button onClick={() => punch('IN')}>Punch In</button>}
      {status === 'IN' && <button onClick={() => punch('OUT')}>Punch Out</button>}

      <br /><br />

      <h3>Current Month Attendance</h3>

      <table border={1} cellPadding={8}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Punch In</th>
            <th>Punch Out</th>
            <th>Worked</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          {history.map(h => (
            <tr key={h.date}>
              <td>{h.date}</td>
              <td>{h.inTime || '-'}</td>
              <td>{h.outTime || '-'}</td>
              <td>{h.duration || '-'}</td>
              <td>{h.location || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <br /><br />
      <button onClick={logout}>Logout</button>
    </div>
  )
}
