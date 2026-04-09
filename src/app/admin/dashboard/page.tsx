import prisma from "../../../lib/prisma";
import styles from "./dashboard.module.css";

export default async function DashboardPage() {
  let dbStatus = "Connected";
  let type1Count = 0;
  try {
    await prisma.$queryRaw`SELECT 1`;
    type1Count = await prisma.type1Cert.count();
  } catch (e: any) {
    dbStatus = "Connection Failed: " + String(e.message);
  }

  return (
    <>
      <div className={styles.topbar}>
        <h2>Dashboard</h2>
        <span>Overview</span>
      </div>
      <div className={styles.pageContent}>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <div>
              <p className={styles.statLabel}>Database</p>
              <p className={styles.statValue} style={{ color: dbStatus === "Connected" ? "#22c55e" : "#ef4444" }}>
                {dbStatus === "Connected" ? "● Online" : "● Error"}
              </p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "rgba(37,99,235,0.1)", color: "var(--primary)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21,15 16,10 5,21"/>
              </svg>
            </div>
            <div>
              <p className={styles.statLabel}>Type 1 Certs</p>
              <p className={styles.statValue}>{type1Count}</p>
            </div>
          </div>
        </div>

        <div className={styles.infoCard}>
          <h3>Welcome to Cyfoxgen Admin</h3>
          <p>Use the sidebar to navigate sections. Upload certificate images under <strong>Type 1 Cert Upload</strong> and share the generated public URL.</p>
        </div>
      </div>
    </>
  );
}
