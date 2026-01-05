import styles from '../styles/layout.module.css'
import Link from 'next/link'
import { useRouter } from 'next/router'

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
            Employee Dashboard
          </Link>

          <Link
            href="/admin"
            className={styles.navItem}
          >
            Admin
          </Link>

          <Link
            href="/manager"
            className={styles.navItem}
          >
            Manager
          </Link>
        </nav>
      </aside>

      <main className={styles.content}>
        {children}
      </main>
    </div>
  )
}
