"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useT } from "@/lib/i18n";
import { IArrowUpRight, ICheck, ICopy, IDownload, IX } from "./icons";

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  username: string | null | undefined;
  onSetUsername: () => void;
}

export default function ShareDialog({ open, onClose, username, onSetUsername }: ShareDialogProps) {
  const t = useT();
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const url = username && typeof window !== "undefined" ? `${window.location.origin}/u/${username}` : "";

  useEffect(() => {
    if (!open || !url) return;
    setCopied(false);
    // Dark modules on white so it scans reliably regardless of theme
    QRCode.toDataURL(url, { margin: 1, width: 640, errorCorrectionLevel: "M", color: { dark: "#0e1433", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [open, url]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — the URL is still selectable
    }
  }

  return (
    <div className="v-overlay" role="dialog" aria-modal="true" aria-labelledby="share-title">
      <div className="v-backdrop" onClick={onClose} />
      <div className="v-dialog v-hud" style={{ width: "min(440px, calc(100% - 32px))" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <span className="v-eyebrow">{t("sh.eyebrow")}</span>
            <h3 id="share-title" className="v-dialog-title" style={{ marginTop: 12 }}>{t("sh.title")} <span className="v-grad-text">{t("sh.titleEm")}</span></h3>
          </div>
          <button className="v-icon-btn" onClick={onClose} aria-label={t("common.close")}><IX /></button>
        </div>

        {!username ? (
          <>
            <p style={{ color: "var(--v-muted)", lineHeight: 1.6, margin: "14px 0 20px" }}>{t("sh.noUsername")}</p>
            <button className="v-btn v-btn-primary" onClick={() => { onClose(); onSetUsername(); }}>{t("sh.setUsername")}</button>
          </>
        ) : (
          <>
            <p style={{ color: "var(--v-muted)", lineHeight: 1.6, margin: "12px 0 18px" }}>{t("sh.sub")}</p>
            <div className="v-share-qr">
              {qr ? <img src={qr} alt={`QR code for ${url}`} /> : <div className="v-skel" style={{ width: "100%", height: "100%" }} />}
            </div>
            <div className="v-share-url">
              <span>{url.replace(/^https?:\/\//, "")}</span>
              <button className="v-btn v-btn-sm" onClick={copy}>{copied ? <><ICheck /> {t("sh.copied")}</> : <><ICopy /> {t("sh.copy")}</>}</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {qr && <a className="v-btn v-btn-sm" href={qr} download={`locker-${username}-qr.png`}><IDownload /> {t("sh.qr")}</a>}
              <a className="v-btn v-btn-sm v-btn-primary" href={url} target="_blank" rel="noopener noreferrer">{t("sh.open")} <IArrowUpRight /></a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
