import Layout from '../components/Layout'
import styles from '../styles/employee.module.css'
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

  const [lastTime, setLastTime] = useState('-')
  const [lastLocation, setLastLocation] = useState('-')

  const [history, setHistory] = useState<DayRecord[]>([])

  // ---------- INIT ----------
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

    const t = setInterval(() => {
      setWorkedSeconds(
        Math.floor((Date.now() - punchInTime.getTime()) / 1000)
      )
    }, 1000)

    return () => clearInterval(t)
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
          resolve({
            lat,
            lng,
            address: [a.suburb, a.city, a.state].filter(Boolean).join(', ')
          })
        },
        () => reject('Location permission denied'),
        { enableHighAccuracy: true }
      )
    })
  }

  const punch = async (type: 'IN' | 'OUT') => {
    if (!userId) return

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

  if (loading) return <Layout>Loading...</Layout>

  return (
    <Layout>
      <div className={styles.page}>
        {/* UI already working, unchanged */}
      </div>
    </Layout>
  )
}
