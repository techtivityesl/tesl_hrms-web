// --- same imports ---
import Layout from '../components/Layout'
import styles from '../styles/employee.module.css'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// --- same types ---
type LeaveType = {
  id: string
  code: string
  name: string
  allows_half_day: boolean
}

type LeaveBalance = {
  leave_type_id: string
  balance: number
}

type Leave = {
  id: string
  from_date: string
  to_date: string
  reason: string
  status: string
  leave_types: {
    code: string
    name: string
  }
}

export default function EmployeeLeave() {
  const [userId, setUserId] = useState<string | null>(null)

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [balances, setBalances] = useState<LeaveBalance[]>([])

  const [selectedLeaveType, setSelectedLeaveType] = useState<string>('')
  const [halfDay, setHalfDay] = useState(false)

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [reason, setReason] = useState('')
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [loading, setLoading] = useState(true)

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
      await loadLeaveTypes()
      await loadBalances(user.id)
      await loadLeaves(user.id)
      setLoading(false)
    }

    init()
  }, [])

  const loadLeaveTypes = async () => {
    const { data } = await supabase
      .from('leave_types')
      .select('id, code, name, allows_half_day')
      .eq('active', true)
    if (data) setLeaveTypes(data)
  }

  const loadBalances = async (uid: string) => {
    const year = new Date().getFullYear()
    const { data } = await supabase
      .from('leave_balances')
      .select('leave_type_id, balance')
      .eq('user_id', uid)
      .eq('year', year)
    if (data) setBalances(data)
  }

  const loadLeaves = async (uid: string) => {
    const { data } = await supabase
      .from('leave_requests')
      .select(`id, from_date, to_date, reason, status, leave_types ( name )`)
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
    if (data) setLeaves(data as any)
  }

  const getBalance = (leaveTypeId: string) => {
    const b = balances.find(x => x.leave_type_id === leaveTypeId)
    return b ? b.balance : 0
  }

  const applyLeave = async () => {
    if (!userId || !selectedLeaveType || !fromDate || !toDate) {
      alert('Please fill all required fields')
      return
    }

    const leaveType = leaveTypes.find(l => l.id === selectedLeaveType)
    if (!leaveType) return

    const balance = getBalance(selectedLeaveType)

    if (['CL', 'EL', 'CO', 'SOL'].includes(leaveType.code) && balance <= 0) {
      alert('Insufficient leave balance')
      return
    }

    if (leaveType.code === 'SOL' && fromDate !== toDate) {
      alert('Special Occasion Leave is allowed for only one day')
      return
    }

    if (halfDay && !leaveType.allows_half_day) {
      alert('Half-day not allowed for this leave type')
      return
    }

    // 1️⃣ Create leave request
    await supabase.from('leave_requests').insert({
      user_id: userId,
      leave_type_id: selectedLeaveType,
      from_date: fromDate,
      to_date: toDate,
      reason,
      status: 'PENDING'
    })

    // 2️⃣ Create notification
    await supabase.from('notifications').insert({
      user_id: userId,
      message: 'Leave request sent to your Reporting Manager for approval'
    })

    setFromDate('')
    setToDate('')
    setReason('')
    setSelectedLeaveType('')
    setHalfDay(false)

    await loadLeaves(userId)
    alert('Leave applied successfully')
  }

  if (loading) return <Layout>Loading...</Layout>

  const selectedLeave = leaveTypes.find(l => l.id === selectedLeaveType)

  return (
    <Layout>
      <div className={styles.page}>
        <h1 className={styles.title}>My Leaves</h1>

        <div className={styles.card}>
          <h3>Apply Leave</h3>

          <select
            value={selectedLeaveType}
            onChange={e => setSelectedLeaveType(e.target.value)}
            style={{ width: '100%', marginTop: 12 }}
          >
            <option value="">Select Leave Type</option>
            {leaveTypes.map(l => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.code}) – Balance: {getBalance(l.id)}
              </option>
            ))}
          </select>

          {selectedLeave?.allows_half_day && (
            <label style={{ display: 'block', marginTop: 10 }}>
              <input
                type="checkbox"
                checked={halfDay}
                onChange={e => setHalfDay(e.target.checked)}
              />{' '}
              Half Day
            </label>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              disabled={halfDay}
            />
          </div>

          <textarea
            placeholder="Reason (optional)"
            value={reason}
            onChange={e => setReason(e.target.value)}
            style={{ width: '100%', marginTop: 12 }}
          />

          <button className={styles.punchBtn} style={{ marginTop: 12 }} onClick={applyLeave}>
            Apply Leave
          </button>
        </div>
      </div>
    </Layout>
  )
}
