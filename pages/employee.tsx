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
  const [punchInTime, setPunchInTime] = useState<Date | null>(null)
  const [workedSeconds, setWorkedSeconds] = useState(0)
  const [frozenSeconds, setFrozenSeconds] = useState<number | null>(null)

  const [lastTime, setLastTime] = useState<string | null>(null)
  const [lastLocation, setLastLocation] = useState<string | null>(null)

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

      await loadDailyHistory(user.id)
      setLoading(false)
    }

    init()
  }, [])

  // ---------- LIVE CLOCK ----------
  useEffect(() => {
    if (status !== 'IN' || !punchInTime) return

    const timer = setInterval(() => {
      setWorkedSeconds(
        Math.floor((Date.now() - punchInTime.getTime()) / 1000)
      )
    }, 1000)

    return () => clearInterval(timer)
  }, [status, punchInTime])

  const formatHMS = (sec: number) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    return `${h.toString().padStart(2, '0')}:${m
      .toString()
      .padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const formatHM = (sec: number) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    return `${h.toString().padStart(2, '0')}:${m
      .toString()
      .padStart(2, '0')}`
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

      await loadDailyHistory(userId)
    } catch (e: any) {
      alert(e)
    }
  }

  // ---------- DAILY HISTORY ----------
  const loadDailyHistory = async (uid: string) => {
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
      const day = new Date(d.punched_at).toLocaleDateString()
      if (!map[day]) map[day] = { date: day }

      if (d.punch_type === 'IN' && !map[day].inTime) {
        map[day].inTime = new Date(d.punched_at).toLocaleTimeString()
        map[day].location = d.location_name
      }

      if (d.punch_type === 'OUT') {
        map[day].outTime = new Date(d.punched_at).toLocaleTimeString()
      }
    })

    Object.values(map).forEach(d => {
      if (d.inTime && d.outTime) {
        const diff =
          new Date(`${d.date} ${d.outTime}`).getTime() -
          new Date(`${d.date} ${d.inTime}`).getTime()
        d.duration = formatHM(Math.floor(diff / 1000))
      }
    })

    setHistory(Object.values(map))
  }

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-offwhite p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Employee Dashboard</h1>
          <button onClick={logout} className="text-red-500 text-sm">
            Logout
          </button>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl shadow">
            <p className="text-sm text-muted">Status</p>
            <p className="text-xl font-bold text-primary">{status}</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow">
            <p className="text-sm text-muted">Worked Today</p>
            <p className="text-xl font-bold">
              {status === 'IN'
                ? formatHMS(workedSeconds)
                : formatHM(frozenSeconds || 0)}
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow">
            <p className="text-sm text-muted">Last Punch</p>
            <p className="text-sm">{lastTime || '-'}</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow">
            <p className="text-sm text-muted">Location</p>
            <p className="text-sm">{lastLocation || '-'}</p>
          </div>
        </div>

        {/* Punch */}
        <div className="bg-white p-6 rounded-xl shadow text-center">
          {status === 'OUT' ? (
            <button
              onClick={() => punch('IN')}
              className="bg-primary text-white px-8 py-2 rounded-lg"
            >
              Punch In
            </button>
          ) : (
            <button
              onClick={() => punch('OUT')}
              className="bg-secondary text-white px-8 py-2 rounded-lg"
            >
              Punch Out
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-lg font-semibold mb-4">
            Current Month – Day Wise Attendance
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border">
              <thead className="bg-offwhite">
                <tr>
                  <th className="p-2 border">Date</th>
                  <th className="p-2 border">In</th>
                  <th className="p-2 border">Out</th>
                  <th className="p-2 border">Hours</th>
                  <th className="p-2 border">Location</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.date} className="text-center">
                    <td className="p-2 border">{h.date}</td>
                    <td className="p-2 border">{h.inTime || '-'}</td>
                    <td className="p-2 border">{h.outTime || '-'}</td>
                    <td className="p-2 border">{h.duration || '-'}</td>
                    <td className="p-2 border">{h.location || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
