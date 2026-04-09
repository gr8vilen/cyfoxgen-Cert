import styles from "./page.module.css";
import Link from "next/link";

export default function Home() {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <div className="glass-panel" style={{ padding: "3rem", borderRadius: "24px", maxWidth: "800px", width: "100%", textAlign: "center" }}>
          <h1 className={styles.title}>
            Secure <span className="text-gradient">Certificates</span>
          </h1>
          <p className={styles.subtitle}>
            Welcome to Cyfoxgen Certs. The premier platform for generating, managing, and verifying official training and achievement certificates.
          </p>
          <div className={styles.actions}>
            <Link href="/verify" className={styles.primaryButton}>
              Verify Certificate
            </Link>
            <Link href="/admin" className={styles.secondaryButton}>
              Admin Portal
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
