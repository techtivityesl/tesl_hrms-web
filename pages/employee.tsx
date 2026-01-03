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

      if (lastPunch?.punch_type === 'IN') {
        setStatus('IN')
      } else {
        setStatus('OUT')
      }

      setLoading(false)
    }

    init()
  }, [])

  const getLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('Geolocation not supported')
      }

      navigator.geolocation.getCurrentPosition(
        position => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        error => {
          reject('Location permission denied')
        },
        {
          enableHighAccuracy: true,
          timeout: 10000
        }
      )
    })
  }

  const punch = async (type: 'IN' | 'OUT') => {
    if (!userId) return

    try {
      const location = await getLocation()

      await supabase.from('attendance_logs').insert({
        user_id: userId,
        punch_type: type,
        punched_at: new Date().toISOString(),
        latitude: location.lat,
        longitude: location.lng
      })

      setStatus(type)
      alert(`Punched ${type} with location`)
    } catch (err: any) {
      alert(err)
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) {
    return <p style={{ padding: 40 }}>Loading...</p>
  }

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
