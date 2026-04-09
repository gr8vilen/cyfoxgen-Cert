"use client";

import { useActionState, useRef, useState, useCallback } from "react";
import Link from "next/link";
import jsQR from "jsqr";
import { uploadType1Cert, deleteType1Cert } from "../../../actions/type1cert";
import styles from "./type1.module.css";

type Cert = {
  id: string;
  slug: string;
  imageData: string;
  imageMime: string;
  createdAt: Date;
};

/** Extract the path slug from a QR value.
 *  Handles full URLs (https://domain.com/s/abc → "abc")
 *  and bare paths (/s/abc or /abc → "abc")
 */
function extractSlugFromQR(raw: string): string {
  let path = raw.trim();

  // Try parsing as a URL first
  try {
    const url = new URL(path);
    path = url.pathname; // e.g. "/s/abc123"
  } catch {
    // Not a valid URL — treat as a path string
  }

  // Strip leading slashes
  path = path.replace(/^\/+/, "");
  // Strip "s/" prefix if present
  path = path.replace(/^s\//, "");
  // Remove any remaining sub-paths or query strings (keep first segment)
  path = path.split("/")[0].split("?")[0];

  return path;
}

/** Decode QR from an image File using jsqr + canvas */
async function scanQRFromFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); return resolve(null); }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      URL.revokeObjectURL(url);
      resolve(code?.data ?? null);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

export default function Type1ClientPage({ initialCerts }: { initialCerts: Cert[] }) {
  const [certs] = useState<Cert[]>(initialCerts);
  const [preview, setPreview] = useState<string | null>(null);
  const [autoScan, setAutoScan] = useState(false);
  const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "found" | "notfound">("idle");
  const [scannedSlug, setScannedSlug] = useState("");
  const slugInputRef = useRef<HTMLInputElement>(null);

  const [state, formAction, pending] = useActionState(
    async (_prev: any, formData: FormData) => {
      const result = await uploadType1Cert(formData);
      if (result.success) {
        window.location.reload();
      }
      return result;
    },
    null
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;

      setPreview(URL.createObjectURL(f));
      setScannedSlug("");
      setScanStatus("idle");

      if (!autoScan) return;

      setScanStatus("scanning");
      const raw = await scanQRFromFile(f);

      if (!raw) {
        setScanStatus("notfound");
        return;
      }

      const slug = extractSlugFromQR(raw);
      if (slug) {
        setScannedSlug(slug);
        setScanStatus("found");
        // Fill the slug input
        if (slugInputRef.current) slugInputRef.current.value = slug;
      } else {
        setScanStatus("notfound");
      }
    },
    [autoScan]
  );

  const handleDeleteClick = async (id: string) => {
    if (!confirm("Delete this certificate?")) return;
    await deleteType1Cert(id);
    window.location.reload();
  };

  return (
    <>
      <div className={styles.topbar}>
        <h2>Type 1 Cert Upload</h2>
        <span>Certificates → Image Upload</span>
      </div>

      <div className={styles.pageContent}>
        <div className={styles.grid}>
          {/* ── Upload Form ── */}
          <div className={styles.uploadCard}>
            <div className={styles.cardHead}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16,16 12,12 8,16"/>
                <line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39,18.39A5,5,0,0,0,18,9h-1.26A8,8,0,1,0,3,16.3"/>
              </svg>
              <h3>Upload New Certificate</h3>
            </div>

            <form action={formAction} className={styles.cardBody}>
              {/* Image drop zone */}
              <div className={styles.field}>
                <label>Certificate Image</label>
                <div className={styles.dropzone}>
                  <input
                    type="file"
                    name="image"
                    accept="image/*"
                    required
                    onChange={handleFileChange}
                  />
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="Preview" className={styles.preview} />
                  ) : (
                    <>
                      <svg className={styles.dropzoneIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21,15 16,10 5,21"/>
                      </svg>
                      <p>Click or drag an image here</p>
                      <small>PNG, JPG, WEBP, SVG supported</small>
                    </>
                  )}
                </div>
              </div>

              {/* Auto Scan QR checkbox */}
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={autoScan}
                  onChange={(e) => {
                    setAutoScan(e.target.checked);
                    if (!e.target.checked) {
                      setScanStatus("idle");
                      setScannedSlug("");
                    }
                  }}
                />
                <span className={styles.checkboxIcon}>
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="2,6 5,9 10,3"/>
                  </svg>
                </span>
                <span className={styles.checkboxText}>
                  Auto scan QR
                  <small>Detect QR in image and extract slug automatically</small>
                </span>
              </label>

              {/* Scan status indicator */}
              {autoScan && scanStatus !== "idle" && (
                <div className={
                  scanStatus === "scanning" ? styles.scanInfo :
                  scanStatus === "found" ? styles.scanSuccess :
                  styles.scanWarn
                }>
                  {scanStatus === "scanning" && (
                    <><span className={styles.spinner} /> Scanning for QR code…</>
                  )}
                  {scanStatus === "found" && (
                    <>✅ QR detected — slug set to <strong>{scannedSlug}</strong></>
                  )}
                  {scanStatus === "notfound" && (
                    <>⚠️ No QR code found — please enter slug manually.</>
                  )}
                </div>
              )}

              {/* Slug input */}
              <div className={styles.field}>
                <label>Public URL Slug</label>
                <input
                  ref={slugInputRef}
                  type="text"
                  name="slug"
                  placeholder={autoScan ? "Auto-filled from QR (or type manually)" : "e.g. something, s/something"}
                  defaultValue={scannedSlug}
                  key={scannedSlug} // reset when scannedSlug changes
                  required
                />
                <span className={styles.hint}>
                  Accessible at <strong>/something</strong> or <strong>/s/something</strong>. Leading slashes and <code>s/</code> prefix are stripped automatically.
                </span>
              </div>

              {state?.error && <div className={styles.error}>{state.error}</div>}
              {state?.success && (
                <div className={styles.success}>
                  ✅ Uploaded! View at{" "}
                  <Link href={`/s/${state.slug}`} target="_blank" className={styles.successLink}>
                    /s/{state.slug}
                  </Link>
                </div>
              )}

              <button type="submit" className={styles.submitBtn} disabled={pending}>
                {pending ? "Uploading…" : "Upload Certificate"}
              </button>
            </form>
          </div>

          {/* ── Existing Certs ── */}
          <div className={styles.listCard}>
            <div className={styles.cardHead}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
              <h3>Existing Certificates ({certs.length})</h3>
            </div>

            {certs.length === 0 ? (
              <p className={styles.emptyState}>No certificates uploaded yet.</p>
            ) : (
              certs.map((cert) => (
                <div key={cert.id} className={styles.certRow}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:${cert.imageMime};base64,${cert.imageData}`}
                    alt={cert.slug}
                    className={styles.certThumb}
                  />
                  <div className={styles.certInfo}>
                    <p className={styles.certSlug}>{cert.slug}</p>
                    <p className={styles.certUrl}>/s/{cert.slug}</p>
                  </div>
                  <div className={styles.certActions}>
                    <Link href={`/s/${cert.slug}`} target="_blank" className={styles.viewBtn}>
                      View
                    </Link>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDeleteClick(cert.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
