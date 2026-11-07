"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { useT } from "@/lib/i18n";
import { formatDate } from "@/lib/projectMeta";
import { IArrowUpRight, ICheck, ICopy, IDownload, ITrash, IX } from "./icons";

interface ShareLink {
  id: string;
  token: string;
  label: string | null;
  status: "active" | "closed";
  viewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
}

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  mode: "loading" | "local" | "cloud";
}

const urlFor = (token: string) => `${window.location.origin}/s/${token}`;

function ago(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

export default function ShareDialog({ open, onClose, mode }: ShareDialogProps) {
  const t = useT();
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<"error" | "limit" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const createdFor = useRef(false);

  const selected = links.find((l) => l.id === selectedId) ?? null;

  // Each time the dialog opens: make a brand-new link, then load the full list.
  useEffect(() => {
    if (!open) { createdFor.current = false; return; }
    if (mode !== "cloud" || createdFor.current) return;
    createdFor.current = true;
    setError(null); setConfirmDelete(null); setCopied(false); setLabel("");
    setCreating(true);
    (async () => {
      try {
        const res = await fetch("/api/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
        if (res.status === 409) setError("limit");
        else if (!res.ok) setError("error");
        const created: ShareLink | null = res.ok ? await res.json() : null;
        const list: ShareLink[] = await fetch("/api/share").then((r) => (r.ok ? r.json() : []));
        setLinks(list);
        setSelectedId(created?.id ?? list[0]?.id ?? null);
      } catch {
        setError("error");
      } finally {
        setCreating(false);
      }
    })();
  }, [open, mode]);

  useEffect(() => {
    if (!selected) { setQr(null); return; }
    setCopied(false);
    setLabel(selected.label ?? "");
    // Dark modules on white so it scans reliably regardless of theme
    QRCode.toDataURL(urlFor(selected.token), { margin: 1, width: 640, errorCorrectionLevel: "M", color: { dark: "#0e1433", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [selected?.id, selected?.token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const patch = useCallback(async (id: string, body: Partial<Pick<ShareLink, "status" | "label">>) => {
    const res = await fetch(`/api/share/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      const updated: ShareLink = await res.json();
      setLinks((prev) => prev.map((l) => (l.id === id ? updated : l)));
    }
  }, []);

  async function remove(id: string) {
    const res = await fetch(`/api/share/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setConfirmDelete(null);
    setLinks((prev) => {
      const next = prev.filter((l) => l.id !== id);
      if (selectedId === id) setSelectedId(next[0]?.id ?? null);
      return next;
    });
  }

  async function copy() {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(urlFor(selected.token));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked — the URL is still selectable */ }
  }

  if (!open) return null;

  return (
    <div className="v-overlay" role="dialog" aria-modal="true" aria-labelledby="share-title">
      <div className="v-backdrop" onClick={onClose} />
      <div className="v-drawer" style={{ width: "min(560px, 100%)" }}>
        <div className="v-drawer-head">
          <span className="v-eyebrow">{t("sh.eyebrow")}</span>
          <button className="v-icon-btn" onClick={onClose} aria-label={t("common.close")}><IX /></button>
        </div>

        <div className="v-drawer-body">
          <h2 id="share-title" className="v-form-title">{t("sh.title")} <em>{t("sh.titleEm")}</em></h2>

          {mode !== "cloud" ? (
            <>
              <p style={{ color: "var(--v-muted)", lineHeight: 1.6, margin: "16px 0 22px" }}>{t("sh.signin")}</p>
              <Link href="/sign-in" className="v-btn v-btn-primary">{t("nav.signIn")} <IArrowUpRight /></Link>
            </>
          ) : (
            <>
              <p style={{ color: "var(--v-muted)", lineHeight: 1.6, margin: "14px 0 22px" }}>{t("sh.sub")}</p>

              {creating && !selected ? (
                <div className="v-share-qr"><div className="v-skel" style={{ width: "100%", height: "100%" }} /></div>
              ) : selected ? (
                <div className="v-share-current">
                  <div className={`v-share-qr${selected.status === "closed" ? " is-closed" : ""}`}>
                    {qr ? <img src={qr} alt={`QR code for ${urlFor(selected.token)}`} /> : <div className="v-skel" style={{ width: "100%", height: "100%" }} />}
                  </div>
                  {selected.status === "closed" && <p className="v-banner is-warn" style={{ marginTop: 0, marginBottom: 12 }}><span>{t("sh.closedNote")}</span></p>}
                  <div className="v-share-url">
                    <span>{urlFor(selected.token).replace(/^https?:\/\//, "")}</span>
                    <button className="v-btn v-btn-sm" onClick={copy}>{copied ? <><ICheck /> {t("sh.copied")}</> : <><ICopy /> {t("sh.copy")}</>}</button>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    {qr && <a className="v-btn v-btn-sm" href={qr} download={`project-locker-share-${selected.token.slice(0, 6)}.png`}><IDownload /> {t("sh.qr")}</a>}
                    <a className="v-btn v-btn-sm" href={urlFor(selected.token)} target="_blank" rel="noopener noreferrer">{t("sh.open")} <IArrowUpRight /></a>
                  </div>
                  <div className="v-field" style={{ marginTop: 18 }}>
                    <label className="v-label" htmlFor="share-label">{t("sh.label")}</label>
                    <input
                      id="share-label"
                      className="v-input"
                      value={label}
                      maxLength={60}
                      placeholder={t("sh.labelPh")}
                      onChange={(e) => setLabel(e.target.value)}
                      onBlur={() => { if ((selected.label ?? "") !== label.trim()) patch(selected.id, { label: label.trim() }); }}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                    />
                  </div>
                </div>
              ) : null}

              {error && <p className="v-error" style={{ marginTop: 12 }}>{error === "limit" ? t("sh.limit") : t("sh.error")}</p>}

              {links.length > 0 && (
                <div className="v-block">
                  <div className="v-block-head"><span className="v-eyebrow">{t("sh.links")}</span><span className="v-mono">{String(links.length).padStart(2, "0")}</span></div>
                  <div className="v-share-list">
                    {links.map((l) => (
                      <div key={l.id} className={`v-share-item${l.id === selectedId ? " is-selected" : ""}`}>
                        <button className="v-share-item-main" onClick={() => setSelectedId(l.id)} title={t("sh.showQr")}>
                          <span className="v-share-item-top">
                            <span className={`v-status ${l.status === "active" ? "is-live" : "is-dep"}`}><span className="v-led" /><span>{l.status === "active" ? t("sh.active") : t("sh.closed")}</span></span>
                            <span className="v-share-item-name">{l.label || t("sh.untitled")}</span>
                          </span>
                          <span className="v-hint">
                            {t("sh.created", { d: formatDate(l.createdAt) })} · {t("sh.views", { n: l.viewCount })} · {l.lastViewedAt ? t("sh.lastViewed", { t: ago(l.lastViewedAt) }) : t("sh.never")}
                          </span>
                        </button>
                        {confirmDelete === l.id ? (
                          <div className="v-share-confirm">
                            <span>{t("sh.confirmDelete")}</span>
                            <span style={{ display: "flex", gap: 6 }}>
                              <button className="v-btn v-btn-sm" onClick={() => setConfirmDelete(null)}>{t("common.cancel")}</button>
                              <button className="v-btn v-btn-sm v-btn-danger" onClick={() => remove(l.id)}><ITrash /> {t("sh.delete")}</button>
                            </span>
                          </div>
                        ) : (
                          <div className="v-share-actions">
                            {l.status === "active"
                              ? <button className="v-btn v-btn-sm" onClick={() => patch(l.id, { status: "closed" })}>{t("sh.close")}</button>
                              : <button className="v-btn v-btn-sm" onClick={() => patch(l.id, { status: "active" })} style={{ color: "var(--v-live)" }}>{t("sh.allow")}</button>}
                            <button className="v-icon-btn is-danger" onClick={() => setConfirmDelete(l.id)} aria-label={t("sh.delete")} title={t("sh.delete")}><ITrash /></button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
