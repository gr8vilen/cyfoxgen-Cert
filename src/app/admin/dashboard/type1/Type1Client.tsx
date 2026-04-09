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

type BulkItem = {
  id: string;
  file: File;
  preview: string;
  slug: string;
  qrStatus: "idle" | "scanning" | "found" | "notfound";
  uploadStatus: "pending" | "uploading" | "success" | "error";
  errorMsg?: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────

function extractSlugFromQR(raw: string): string {
  let path = raw.trim();
  try { path = new URL(path).pathname; } catch { /* bare path */ }
  path = path.replace(/^\/+/, "").replace(/^s\//, "");
  return path.split("/")[0].split("?")[0];
}

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

// ── Component ──────────────────────────────────────────────────────────────

export default function Type1ClientPage({ initialCerts }: { initialCerts: Cert[] }) {
  const [certs, setCerts] = useState<Cert[]>(initialCerts);
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");

  // ── Single upload state ──
  const [preview, setPreview] = useState<string | null>(null);
  const [autoScan, setAutoScan] = useState(false);
  const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "found" | "notfound">("idle");
  const [scannedSlug, setScannedSlug] = useState("");
  const slugInputRef = useRef<HTMLInputElement>(null);

  const [state, formAction, pending] = useActionState(
    async (_prev: any, formData: FormData) => {
      const result = await uploadType1Cert(formData);
      if (result.success) window.location.reload();
      return result;
    },
    null
  );

  const handleSingleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      setPreview(URL.createObjectURL(f));
      setScannedSlug(""); setScanStatus("idle");
      if (!autoScan) return;
      setScanStatus("scanning");
      const raw = await scanQRFromFile(f);
      if (!raw) { setScanStatus("notfound"); return; }
      const slug = extractSlugFromQR(raw);
      if (slug) {
        setScannedSlug(slug); setScanStatus("found");
        if (slugInputRef.current) slugInputRef.current.value = slug;
      } else { setScanStatus("notfound"); }
    },
    [autoScan]
  );

  // ── Bulk upload state ──
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [bulkAutoScan, setBulkAutoScan] = useState(true);
  const [bulkRunning, setBulkRunning] = useState(false);
  const nextId = useRef(0);

  const handleBulkFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (!files.length) return;

      // Reset input so same files can be re-added
      e.target.value = "";

      const newItems: BulkItem[] = files.map((file) => ({
        id: String(nextId.current++),
        file,
        preview: URL.createObjectURL(file),
        slug: "",
        qrStatus: bulkAutoScan ? "scanning" : "idle",
        uploadStatus: "pending",
      }));

      setBulkItems((prev) => [...prev, ...newItems]);

      if (!bulkAutoScan) return;

      // Scan QR for each new item in parallel
      const scanned = await Promise.all(
        newItems.map(async (item) => {
          const raw = await scanQRFromFile(item.file);
          const slug = raw ? extractSlugFromQR(raw) : "";
          return { id: item.id, slug, qrStatus: (slug ? "found" : "notfound") as BulkItem["qrStatus"] };
        })
      );

      setBulkItems((prev) =>
        prev.map((item) => {
          const result = scanned.find((s) => s.id === item.id);
          return result ? { ...item, slug: result.slug, qrStatus: result.qrStatus } : item;
        })
      );
    },
    [bulkAutoScan]
  );

  const updateBulkSlug = (id: string, slug: string) => {
    setBulkItems((prev) => prev.map((i) => (i.id === id ? { ...i, slug } : i)));
  };

  const removeBulkItem = (id: string) => {
    setBulkItems((prev) => prev.filter((i) => i.id !== id));
  };

  const uploadAll = async () => {
    const pending = bulkItems.filter((i) => i.uploadStatus === "pending" && i.slug.trim());
    if (!pending.length) return;
    setBulkRunning(true);

    for (const item of pending) {
      // Mark as uploading
      setBulkItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, uploadStatus: "uploading" } : i))
      );

      const fd = new FormData();
      fd.append("image", item.file);
      fd.append("slug", item.slug.trim());

      const result = await uploadType1Cert(fd);

      setBulkItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                uploadStatus: result.success ? "success" : "error",
                errorMsg: result.error,
              }
            : i
        )
      );
    }

    setBulkRunning(false);
    // Reload after all done to refresh the cert list
    window.location.reload();
  };

  const handleDeleteClick = async (id: string) => {
    if (!confirm("Delete this certificate?")) return;
    await deleteType1Cert(id);
    window.location.reload();
  };

  const bulkPending = bulkItems.filter((i) => i.uploadStatus === "pending").length;
  const bulkMissingSlug = bulkItems.filter(
    (i) => i.uploadStatus === "pending" && !i.slug.trim()
  ).length;

  return (
    <>
      <div className={styles.topbar}>
        <h2>Type 1 Cert Upload</h2>
        <span>Certificates → Image Upload</span>
      </div>

      <div className={styles.pageContent}>
        <div className={styles.grid}>
          {/* ── Upload Card ── */}
          <div className={styles.uploadCard}>

            {/* Tab bar */}
            <div className={styles.tabBar}>
              <button
                className={`${styles.tab} ${activeTab === "single" ? styles.tabActive : ""}`}
                onClick={() => setActiveTab("single")}
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21,15 16,10 5,21"/>
                </svg>
                Single Upload
              </button>
              <button
                className={`${styles.tab} ${activeTab === "bulk" ? styles.tabActive : ""}`}
                onClick={() => setActiveTab("bulk")}
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2"/>
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                  <line x1="12" y1="12" x2="12" y2="16"/>
                  <line x1="10" y1="14" x2="14" y2="14"/>
                </svg>
                Bulk Upload
                {bulkItems.length > 0 && (
                  <span className={styles.tabBadge}>{bulkItems.length}</span>
                )}
              </button>
            </div>

            {/* ── SINGLE UPLOAD ── */}
            {activeTab === "single" && (
              <form action={formAction} className={styles.cardBody}>
                <div className={styles.field}>
                  <label>Certificate Image</label>
                  <div className={styles.dropzone}>
                    <input type="file" name="image" accept="image/*" required onChange={handleSingleFileChange} />
                    {preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={preview} alt="Preview" className={styles.preview} />
                    ) : (
                      <>
                        <svg className={styles.dropzoneIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/>
                        </svg>
                        <p>Click or drag an image here</p>
                        <small>PNG, JPG, WEBP, SVG supported</small>
                      </>
                    )}
                  </div>
                </div>

                <label className={styles.checkboxLabel}>
                  <input type="checkbox" className={styles.checkbox} checked={autoScan}
                    onChange={(e) => { setAutoScan(e.target.checked); if (!e.target.checked) { setScanStatus("idle"); setScannedSlug(""); } }} />
                  <span className={styles.checkboxIcon}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="2,6 5,9 10,3"/></svg>
                  </span>
                  <span className={styles.checkboxText}>
                    Auto scan QR<small>Detect QR in image and extract slug automatically</small>
                  </span>
                </label>

                {autoScan && scanStatus !== "idle" && (
                  <div className={scanStatus === "scanning" ? styles.scanInfo : scanStatus === "found" ? styles.scanSuccess : styles.scanWarn}>
                    {scanStatus === "scanning" && <><span className={styles.spinner} /> Scanning for QR code…</>}
                    {scanStatus === "found" && <>✅ QR detected — slug set to <strong>{scannedSlug}</strong></>}
                    {scanStatus === "notfound" && <>⚠️ No QR code found — enter slug manually.</>}
                  </div>
                )}

                <div className={styles.field}>
                  <label>Public URL Slug</label>
                  <input ref={slugInputRef} type="text" name="slug" required
                    placeholder={autoScan ? "Auto-filled from QR (or type manually)" : "e.g. something, s/something"}
                    defaultValue={scannedSlug} key={scannedSlug} />
                  <span className={styles.hint}>
                    Accessible at <strong>/something</strong> or <strong>/s/something</strong>.
                  </span>
                </div>

                {state?.error && <div className={styles.error}>{state.error}</div>}
                {state?.success && (
                  <div className={styles.success}>
                    ✅ Uploaded!{" "}
                    <Link href={`/s/${state.slug}`} target="_blank" className={styles.successLink}>/s/{state.slug}</Link>
                  </div>
                )}

                <button type="submit" className={styles.submitBtn} disabled={pending}>
                  {pending ? "Uploading…" : "Upload Certificate"}
                </button>
              </form>
            )}

            {/* ── BULK UPLOAD ── */}
            {activeTab === "bulk" && (
              <div className={styles.cardBody}>
                {/* Bulk options row */}
                <div className={styles.bulkOptions}>
                  <label className={styles.checkboxLabel} style={{ flex: 1 }}>
                    <input type="checkbox" className={styles.checkbox} checked={bulkAutoScan}
                      onChange={(e) => setBulkAutoScan(e.target.checked)} />
                    <span className={styles.checkboxIcon}>
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="2,6 5,9 10,3"/></svg>
                    </span>
                    <span className={styles.checkboxText}>
                      Auto scan QR from each image<small>Slugs are extracted automatically where possible</small>
                    </span>
                  </label>
                </div>

                {/* Drop zone for multiple files */}
                <div className={styles.dropzone} style={{ padding: "1.5rem 1rem" }}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleBulkFileChange}
                  />
                  <svg className={styles.dropzoneIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <p>Click or drop multiple images</p>
                  <small>Each image becomes a separate certificate</small>
                </div>

                {/* Queue list */}
                {bulkItems.length > 0 && (
                  <>
                    <div className={styles.bulkList}>
                      {bulkItems.map((item) => (
                        <div key={item.id} className={styles.bulkRow}>
                          {/* Thumbnail */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.preview} alt="" className={styles.bulkThumb} />

                          {/* Info + slug input */}
                          <div className={styles.bulkInfo}>
                            <p className={styles.bulkFilename}>{item.file.name}</p>

                            {/* QR status */}
                            {bulkAutoScan && (
                              <span className={
                                item.qrStatus === "scanning" ? styles.qrBadgeScanning :
                                item.qrStatus === "found" ? styles.qrBadgeFound :
                                item.qrStatus === "notfound" ? styles.qrBadgeMissing :
                                styles.qrBadgeIdle
                              }>
                                {item.qrStatus === "scanning" && <><span className={styles.spinnerXS} /> Scanning…</>}
                                {item.qrStatus === "found" && <>✓ QR</>}
                                {item.qrStatus === "notfound" && <>No QR</>}
                                {item.qrStatus === "idle" && <>—</>}
                              </span>
                            )}

                            {/* Slug input */}
                            {item.uploadStatus !== "success" && (
                              <input
                                type="text"
                                className={styles.bulkSlugInput}
                                value={item.slug}
                                placeholder="slug (required)"
                                onChange={(e) => updateBulkSlug(item.id, e.target.value)}
                                disabled={item.uploadStatus === "uploading"}
                              />
                            )}

                            {item.uploadStatus === "error" && (
                              <span className={styles.bulkError}>{item.errorMsg}</span>
                            )}
                          </div>

                          {/* Status + remove */}
                          <div className={styles.bulkStatus}>
                            {item.uploadStatus === "pending" && item.qrStatus !== "scanning" && (
                              <span className={styles.statusPending}>Pending</span>
                            )}
                            {item.uploadStatus === "uploading" && (
                              <span className={styles.statusUploading}><span className={styles.spinner} /></span>
                            )}
                            {item.uploadStatus === "success" && (
                              <span className={styles.statusDone}>✓</span>
                            )}
                            {item.uploadStatus === "error" && (
                              <span className={styles.statusError}>✗</span>
                            )}
                            {item.uploadStatus !== "uploading" && item.uploadStatus !== "success" && (
                              <button
                                type="button"
                                className={styles.removeBtn}
                                onClick={() => removeBulkItem(item.id)}
                                title="Remove"
                              >✕</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Summary + action */}
                    <div className={styles.bulkFooter}>
                      {bulkMissingSlug > 0 && (
                        <span className={styles.bulkWarning}>
                          ⚠️ {bulkMissingSlug} item{bulkMissingSlug > 1 ? "s" : ""} missing a slug
                        </span>
                      )}
                      <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <button
                          type="button"
                          className={styles.clearBtn}
                          onClick={() => setBulkItems([])}
                          disabled={bulkRunning}
                        >
                          Clear All
                        </button>
                        <button
                          type="button"
                          className={styles.submitBtn}
                          style={{ width: "auto", paddingInline: "1.5rem" }}
                          onClick={uploadAll}
                          disabled={bulkRunning || bulkPending === 0 || bulkMissingSlug > 0}
                        >
                          {bulkRunning
                            ? "Uploading…"
                            : `Upload ${bulkPending} Certificate${bulkPending !== 1 ? "s" : ""}`}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {bulkItems.length === 0 && (
                  <p className={styles.bulkEmpty}>No images selected yet. Drop files above to start.</p>
                )}
              </div>
            )}
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
                  <img src={`data:${cert.imageMime};base64,${cert.imageData}`} alt={cert.slug} className={styles.certThumb} />
                  <div className={styles.certInfo}>
                    <p className={styles.certSlug}>{cert.slug}</p>
                    <p className={styles.certUrl}>/s/{cert.slug}</p>
                  </div>
                  <div className={styles.certActions}>
                    <Link href={`/s/${cert.slug}`} target="_blank" className={styles.viewBtn}>View</Link>
                    <button className={styles.deleteBtn} onClick={() => handleDeleteClick(cert.id)}>Delete</button>
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
