import { logout } from "../../actions/auth";
import Link from "next/link";
import styles from "./layout.module.css";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <h1>Cyfoxgen Admin</h1>
          <p>Certificate Management</p>
        </div>

        <nav className={styles.nav}>
          <span className={styles.navLabel}>Overview</span>
          <Link href="/admin/dashboard" className={styles.navItem}>
            <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            Dashboard
          </Link>

          <span className={styles.navLabel}>Certificates</span>
          <Link href="/admin/dashboard/type1" className={styles.navItem}>
            <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21,15 16,10 5,21"/>
            </svg>
            Type 1 Cert Upload
          </Link>
        </nav>

        <div className={styles.sidebarBottom}>
          <form action={logout}>
            <button type="submit" className={styles.logoutBtn}>
              <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16,17 21,12 16,7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Logout
            </button>
          </form>
        </div>
      </aside>

      {/* ── Page Content ── */}
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}
