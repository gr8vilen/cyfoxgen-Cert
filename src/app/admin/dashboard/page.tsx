import { logout } from "../../actions/auth";
import prisma from "../../../lib/prisma";
import styles from "./dashboard.module.css";

export default async function DashboardPage() {
  // Query DB to prove Prisma is hooked up
  let dbStatus = "Connected";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e: any) {
    dbStatus = "Connection Failed: " + String(e.message);
  }

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <h1>Cyfoxgen Admin Portal</h1>
        </div>
        <form action={logout}>
          <button type="submit" className={styles.logoutBtn}>Logout</button>
        </form>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>System Status</h2>
            <div className={dbStatus === "Connected" ? styles.statusGreen : styles.statusRed}>
              <span></span> {dbStatus === "Connected" ? "Online" : "Error"}
            </div>
          </div>
          <div className={styles.cardBody}>
            <p><strong>Database:</strong> PostgreSQL</p>
            <p><strong>Connection Status:</strong> {dbStatus}</p>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Quick Actions</h2>
          </div>
          <div className={styles.cardBody}>
            <p>Welcome to the Cyfoxgen Certs dashboard. From here you can manage certificates (coming soon).</p>
          </div>
        </div>
      </main>
    </div>
  );
}
