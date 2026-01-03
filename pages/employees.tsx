import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Employees() {
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('employee')
  const [managers, setManagers] = useState<any[]>([])
  const [managerId, setManagerId] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        window.location.href = '/'
        return
      }

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'manager')

      setManagers(data || [])
      setLoading(false)
    }

    init()
  }, [])

  const createEmployee = async () => {
    if (!name || !email) {
      alert('Name and Email required')
      return
    }

    const { error } = await supabase.from('users').insert({
      name,
      email,
      role,
      manager_id: role === 'employee' ? managerId || null : null
    })

    if (error) {
      alert(error.message)
      return
    }

    alert('Employee record created. Ask user to sign up with this email.')

    setName('')
    setEmail('')
    setRole('employee')
    setManagerId('')
  }

  if (loading) {
    return <p style={{ padding: 40 }}>Loading...</p>
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Create Employee</h1>

      <input
        placeholder="Name"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <br /><br />

      <input
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <br /><br />

      <select value={role} onChange={e => setRole(e.target.value)}>
        <option value="employee">Employee</option>
        <option value="manager">Manager</option>
      </select>

      <br /><br />

      {role === 'employee' && (
        <>
          <select
            value={managerId}
            onChange={e => setManagerId(e.target.value)}
          >
            <option value="">Select Manager</option>
            {managers.map(m => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <br /><br />
        </>
      )}

      <button onClick={createEmployee}>Create</button>
    </div>
  )
}
