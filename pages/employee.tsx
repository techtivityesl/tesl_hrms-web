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
        .select('punch_type')
        .eq('user_id', user.id)
        .order('punched_at', { ascending: false })
        .limit(1)
        .single()

      setStatus(lastPunch?.punch_type === 'IN' ? 'IN' : 'OUT')
      setLoading(false)
    }

    init()
  }, [])

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

            const addressParts = data.address || {}
            const area =
              addressParts.suburb ||
              addressParts.neighbourhood ||
              addressParts.village ||
              ''
            const city =
              addressParts.city ||
              addressParts.town ||
              addressParts.county ||
              ''
            const state = addressParts.state || ''

            const readableAddress = [area, city, state]
              .filter(Boolean)
              .join(', ')

            resolve({
              lat,
              lng,
              address: readableAddress || 'Location unavailable'
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

      await supabase.from('attendance_logs').insert({
        user_id: userId,
        punch_type: type,
        punched_at: new Date().toISOString(),
        latitude: location.lat,
        longitude: location.lng,
        location_name: location.address
      })

      setStatus(type)
      alert(`Punched ${type} at ${location.address}`)
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

      <p>Status: <b>{status}</b></p>

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
