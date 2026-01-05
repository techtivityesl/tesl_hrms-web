import Layout from '../components/Layout'
import styles from '../styles/employee.module.css'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Leave = {
  id: string
  from_date: string
  to_date: string
  reason: string
  status: string
}

export default function EmployeeLeave() {
  const [userId, setUserId] = useState<string | null>(null)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [reason, setReason] = useState('')
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [loading, setLoading] = useState(true)

  // -------- INIT --------
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
      await loadLeaves(user.id)
      setLoading(false)
    }

    init()
  }, [])

  const loadLeaves = async (uid: string) => {
    const { data } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })

    if (data) setLeaves(data)
  }

  // -------- APPLY LEAVE --------
  const applyLeave = async () => {
    if (!userId || !fromDate || !toDate) {
      alert('Please fill all fields')
      return
    }

    if (fromDate > toDate) {
      alert('From date cannot be after To date')
      return
    }

    await supabase.from('leave_requests').insert({
      user_id: userId,
      from_date: fromDate,
      to_date: toDate,
      reason,
      status: 'PENDING'
    })

    setFromDate('')
    setToDate('')
    setReason('')

    await loadLeaves(userId)
  }

  if (loading) return <Layout>Loading...</Layout>

  return (
    <Layout>
      <div className={styles.page}>
        <h1 className={styles.title}>My Leaves</h1>

        {/* Apply Leave */}
        <div className={styles.card} style={{ marginBottom: 24 }}>
          <h3>Apply Leave</h3>

          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
            />
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
            />
          </div>

          <textarea
            placeholder="Reason (optional)"
            value={reason}
            onChange={e => setReason(e.target.value)}
            style={{ width: '100%', marginTop: 12 }}
          />

          <button
            className={styles.punchBtn}
            style={{ marginTop: 12 }}
            onClick={applyLeave}
          >
            Apply Leave
          </button>
        </div>

        {/* Leave List */}
        <div className={styles.tableBox}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map(l => (
                <tr key={l.id}>
                  <td>{l.from_date}</td>
                  <td>{l.to_date}</td>
                  <td>{l.reason || '-'}</td>
                  <td>{l.status}</td>
                </tr>
              ))}
              {leaves.length === 0 && (
                <tr>
                  <td colSpan={4}>No leave requests</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
