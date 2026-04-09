import { notFound } from "next/navigation";
import type { Metadata } from "next";
import prisma from "../../../lib/prisma";
import styles from "./cert.module.css";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Certificate — Cyfoxgen`,
    description: `Verified certificate issued by Cyfoxgen for slug: ${slug}`,
  };
}

export default async function CertPage({ params }: Props) {
  const { slug } = await params;

  const cert = await prisma.type1Cert.findUnique({ where: { slug } });
  if (!cert) notFound();

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Verified status bar */}
        <div className={styles.badgeBar}>
          <span className={styles.badgeDot} />
          <span className={styles.badgeText}>
            <span className={styles.badgeHighlight}>✓ Verified</span> · Cyfoxgen Certificate Authority
          </span>
        </div>

        {/* Certificate image */}
        <div className={styles.imageWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:${cert.imageMime};base64,${cert.imageData}`}
            alt="Certificate"
            className={styles.certImage}
          />
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.verifiedBadge}>
            <div className={styles.verifiedIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <polyline points="9,12 11,14 15,10"/>
              </svg>
            </div>
            <div className={styles.verifiedText}>
              <h3>Verified by Cyfoxgen</h3>
              <p>This certificate has been authenticated and is valid.</p>
            </div>
          </div>

          <div className={styles.brandMark}>
            <strong>CYFOXGEN</strong>
            <br />
            Certificate Authority
          </div>
        </div>
      </div>
    </div>
  );
}
