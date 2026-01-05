import Link from 'next/link'
import { useRouter } from 'next/router'
import styles from '../styles/layout.module.css'

type Props = {
  children: React.ReactNode
}

export default function Layout({ children }: Props) {
  const router = useRouter()

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>HRMS</div>

        <nav className={styles.nav}>
          <Link
            href="/employee"
            className={`${styles.navItem} ${
              router.pathname === '/employee' ? styles.active : ''
            }`}
          >
            Dashboard
          </Link>

          <Link
            href="/employee-leave"
            className={`${styles.navItem} ${
              router.pathname === '/employee-leave' ? styles.active : ''
            }`}
          >
            My Leaves
          </Link>
        </nav>
      </aside>

      <main className={styles.content}>
        {children}
      </main>
    </div>
  )
}
