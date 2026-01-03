import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function EmployeeDashboard() {
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [status, setStatus] = useState<'IN' | 'OUT'>('OUT')
  const [lastTime, setLastTime] = useState<string | null>(null)
  const [lastLocation, setLastLocation] = useState<string | null>(null)
  const [punchInTime, setPunchInTime] = useState<Date | null>(null)
  const [workedSeconds, setWorkedSeconds] = useState(0)

  // INIT
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

      setLoading(false)
    }

    init()
  }, [])

  // LIVE CLOCK
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
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getLocationWithAddress = (): Promise<{
    lat: number
    lng: number
    address: string
  }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('Geolocation not supported')
        return
      }

      navigator.geolocation.getCurrentPosition(
        async position => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude

          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
            )
            const data = await res.json()

            const a = data.address || {}
            const area = a.suburb || a.neighbourhood || a.village || ''
            const city = a.city || a.town || a.county || ''
            const state = a.state || ''

            const readable = [area, city, state].filter(Boolean).join(', ')

            resolve({
              lat,
              lng,
              address: readable || 'Location unavailable'
            })
          } catch {
            reject('Unable to fetch location details')
          }
        },
        () => reject('Location permission denied'),
        { enableHighAccuracy: true, timeout: 10000 }
      )
    })
  }

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
        setWorkedSeconds(0)
      } else {
        setPunchInTime(null)
      }
    } catch (err: any) {
      alert(err)
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) return <p style={{ padding: 40 }}>Loading...</p>

  return (
    <div style={{ padding: 40 }}>
      <h1>Employee Dashboard</h1>

      <p>
        Current Status: <b>{status}</b>
      </p>

      {lastTime && (
        <p>
          Last Punch Time: <b>{lastTime}</b>
        </p>
      )}

      {lastLocation && (
        <p>
          Last Punch Location: <b>{lastLocation}</b>
        </p>
      )}

      {status === 'IN' && (
        <p>
          Working Time Today: <b>{formatTime(workedSeconds)}</b>
        </p>
      )}

      <br />

      {status === 'OUT' && (
        <button onClick={() => punch('IN')}>Punch In</button>
      )}

      {status === 'IN' && (
        <button onClick={() => punch('OUT')}>Punch Out</button>
      )}

      <br /><br />
      <button onClick={logout}>Logout</button>
    </div>
  )
}
