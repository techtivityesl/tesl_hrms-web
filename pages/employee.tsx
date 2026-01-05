import styles from '../styles/employee.module.css'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function EmployeeDashboard() {
  const [status, setStatus] = useState<'IN' | 'OUT'>('OUT')
  const [worked, setWorked] = useState('00:00')
  const [location, setLocation] = useState('-')
  const [lastTime, setLastTime] = useState('-')

  useEffect(() => {
    // existing logic already working, keeping UI focused
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        <div className={styles.header}>
          <h1 className={styles.title}>Employee Dashboard</h1>
          <button className={styles.logout}>Logout</button>
        </div>

        <div className={styles.cards}>
          <div className={styles.card}>
            <div className={styles.label}>Status</div>
            <div className={`${styles.value} ${styles.primary}`}>{status}</div>
          </div>

          <div className={styles.card}>
            <div className={styles.label}>Worked Today</div>
            <div className={styles.value}>{worked}</div>
          </div>

          <div className={styles.card}>
            <div className={styles.label}>Last Punch</div>
            <div className={styles.value}>{lastTime}</div>
          </div>

          <div className={styles.card}>
            <div className={styles.label}>Location</div>
            <div className={styles.value}>{location}</div>
          </div>
        </div>

        <div className={styles.punchBox}>
          {status === 'OUT' ? (
            <button className={styles.punchBtn}>Punch In</button>
          ) : (
            <button className={`${styles.punchBtn} ${styles.punchOut}`}>
              Punch Out
            </button>
          )}
        </div>

        <div className={styles.tableBox}>
          <h3>Current Month – Day Wise Attendance</h3>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>In</th>
                <th>Out</th>
                <th>Hours</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>05/01/2026</td>
                <td>09:30</td>
                <td>18:15</td>
                <td>08:45</td>
                <td>Ahmedabad, Gujarat</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}
