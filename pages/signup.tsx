import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const signup = async () => {
    if (!email || !password) {
      alert('Email and password required')
      return
    }

    setLoading(true)

    // 1. Signup user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })

    if (error || !data.user) {
      setLoading(false)
      alert(error?.message || 'Signup failed')
      return
    }

    const authUserId = data.user.id

    // 2. Link auth user with HRMS user record
    const { error: updateError } = await supabase
      .from('users')
      .update({ auth_user_id: authUserId })
      .eq('email', email)

    setLoading(false)

    if (updateError) {
      alert('Signup done, but HR record not linked')
      return
    }

    // 3. Redirect to dashboard
    window.location.href = '/dashboard'
  }

  return (
    <div style={{ padding: 40 }}>
      <h2>Employee Signup</h2>

      <input
        placeholder="Work Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <br /><br />

      <input
        type="password"
        placeholder="Set Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      <br /><br />

      <button onClick={signup} disabled={loading}>
        {loading ? 'Signing up...' : 'Signup'}
      </button>
    </div>
  )
}
