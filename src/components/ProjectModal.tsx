"use client";

import { useState, useEffect, useRef, KeyboardEvent, useCallback } from "react";
import type { Project, ProjectFormData, ProjectStatus } from "@/types/project";
import { STATUS_CLASS } from "@/lib/projectMeta";
import { ICamera, IGlobe, IPlus, IX } from "./icons";
import { useT, type TKey } from "@/lib/i18n";
import { liveScreenshotUrl } from "./Cover";
import { uploadImage } from "@/lib/uploadImage";

const EMPTY_FORM: ProjectFormData = {
  name: "",
  description: "",
  liveUrl: "",
  repoUrl: "",
  techStack: [],
  deploymentDate: "",
  status: "Live",
  thumbnail: null,
  notes: "",
  features: [],
};

interface ProjectModalProps {
  isOpen: boolean;
  project?: Project | null;
  onClose: () => void;
  onSave: (data: ProjectFormData) => void;
}

type FormErrors = Partial<Record<keyof ProjectFormData, TKey>>;

function validate(data: ProjectFormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.name.trim()) errors.name = "form.errName";
  if (!data.description.trim()) errors.description = "form.errDesc";
  if (!data.deploymentDate) errors.deploymentDate = "form.errDate";
  if (data.techStack.length === 0) errors.techStack = "form.errStack";
  return errors;
}

const STATUSES: ProjectStatus[] = ["Live", "Maintenance", "Deprecated"];

export default function ProjectModal({ isOpen, project, onClose, onSave }: ProjectModalProps) {
  const t = useT();
  const [form, setForm] = useState<ProjectFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [tagInput, setTagInput] = useState("");
  const firstInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const isEditing = Boolean(project);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);

  const set = useCallback(<K extends keyof ProjectFormData>(key: K, value: ProjectFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  const handleThumbnailUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setThumbnailUploading(true);
    try {
      set("thumbnail", await uploadImage(file, "cover"));
    } finally {
      setThumbnailUploading(false);
    }
  }, [set]);

  useEffect(() => {
    if (!isOpen) return;
    if (project) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, createdAt: _ca, ...rest } = project;
      setForm({ ...EMPTY_FORM, ...rest, features: rest.features ?? [] });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
    setTagInput("");
    setTimeout(() => firstInputRef.current?.focus(), 80);
  }, [isOpen, project]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", handler); document.body.style.overflow = prevOverflow; };
  }, [isOpen, onClose]);

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commitTag(tagInput); }
    else if (e.key === "Backspace" && tagInput === "" && form.techStack.length > 0) removeTag(form.techStack[form.techStack.length - 1]);
  }

  function handleTagChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (val.endsWith(",")) commitTag(val.slice(0, -1));
    else setTagInput(val);
  }

  function commitTag(raw: string) {
    const tag = raw.trim();
    if (tag && !form.techStack.includes(tag)) set("techStack", [...form.techStack, tag]);
    setTagInput("");
  }

  function removeTag(tag: string) { set("techStack", form.techStack.filter((t) => t !== tag)); }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const pendingTags = tagInput.split(/[,;]+/).map((t) => t.trim()).filter((t) => t && !form.techStack.includes(t));
    const finalForm = { ...form, techStack: [...new Set([...form.techStack, ...pendingTags])] };
    const errs = validate(finalForm);
    if (Object.keys(errs).length > 0) { setErrors(errs); setForm(finalForm); setTagInput(""); return; }
    onSave({ ...finalForm, features: finalForm.features.filter((f) => f.trim()) });
  }

  if (!isOpen) return null;

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <div className="v-overlay" role="dialog" aria-modal="true" aria-labelledby="pm-title">
      <div className="v-backdrop" onClick={onClose} />
      <form className="v-drawer" onSubmit={handleSubmit} noValidate>
        <div className="v-drawer-head">
          <span className="v-eyebrow">{isEditing ? t("form.editEntry") : t("form.newEntry")}</span>
          <button type="button" onClick={onClose} className="v-icon-btn" aria-label="Close"><IX /></button>
        </div>

        <div className="v-drawer-body">
          <div className="v-form-intro">
            <h2 id="pm-title" className="v-form-title">
              {isEditing ? <>{t("form.editTitle")} <em>{t("form.editTitleEm")}</em></> : <>{t("form.newTitle")} <em>{t("form.newTitleEm")}</em></>}
            </h2>
            <p style={{ color: "var(--v-muted)", marginTop: 14, fontSize: 14.5, lineHeight: 1.6 }}>
              {isEditing ? t("form.editSub") : t("form.newSub")}
            </p>
          </div>

          <Section no="01" title={t("form.identity")} hint={t("form.identityHint")}>
            <Field label={t("form.name")} required error={errors.name && t(errors.name)}>
              <input ref={firstInputRef} type="text" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Attendance Tracker" className={`v-input${errors.name ? " is-error" : ""}`} />
            </Field>
            <Field label={t("form.desc")} required error={errors.description && t(errors.description)} hint={`${form.description.length}/280`}>
              <textarea value={form.description} onChange={(e) => set("description", e.target.value.slice(0, 280))} placeholder={t("form.descPh")} rows={3} className={`v-input${errors.description ? " is-error" : ""}`} />
            </Field>
          </Section>

          <Section no="02" title={t("form.status")} hint={t("form.statusHint")}>
            <Field label={t("form.state")} required>
              <div className="v-status-pick" role="radiogroup" aria-label="Status">
                {STATUSES.map((s) => (
                  <button key={s} type="button" role="radio" aria-checked={form.status === s} aria-pressed={form.status === s} onClick={() => set("status", s)}>
                    <span className={`v-led ${STATUS_CLASS[s]}`} />{t(`status.${s}`)}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t("form.shipped")} required error={errors.deploymentDate && t(errors.deploymentDate)}>
              <input type="date" value={form.deploymentDate} onChange={(e) => set("deploymentDate", e.target.value)} className={`v-input${errors.deploymentDate ? " is-error" : ""}`} style={{ maxWidth: 240 }} />
            </Field>
          </Section>

          <Section no="03" title={t("form.stack")} hint={t("form.stackHint")}>
            <Field label={t("form.tech")} required error={errors.techStack && t(errors.techStack)}>
              <div className={`v-taginput${errors.techStack ? " is-error" : ""}`} onClick={() => tagInputRef.current?.focus()}>
                {form.techStack.map((tag) => (
                  <span key={tag} className="v-chip">
                    {tag}
                    <button type="button" onClick={(e) => { e.stopPropagation(); removeTag(tag); }} aria-label={`Remove ${tag}`}><IX /></button>
                  </span>
                ))}
                <input
                  ref={tagInputRef}
                  type="text"
                  value={tagInput}
                  onChange={handleTagChange}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => { if (tagInput.trim()) commitTag(tagInput); }}
                  placeholder={form.techStack.length === 0 ? "Next.js, TypeScript, Postgres…" : t("form.techMore")}
                  aria-label="Add technology"
                />
              </div>
            </Field>
          </Section>

          <Section no="04" title={t("form.links")} hint={t("form.linksHint")}>
            <Field label={t("form.liveUrl")}>
              <input type="url" value={form.liveUrl} onChange={(e) => set("liveUrl", e.target.value)} placeholder="https://" className="v-input" />
            </Field>
            <Field label={t("form.repoUrl")}>
              <input type="url" value={form.repoUrl} onChange={(e) => set("repoUrl", e.target.value)} placeholder="https://github.com/…" className="v-input" />
            </Field>
          </Section>

          <Section no="05" title={t("form.cover")} hint={t("form.coverHint")}>
            <button type="button" className="v-dropzone" onClick={() => thumbnailInputRef.current?.click()} disabled={thumbnailUploading}>
              {form.thumbnail ? (
                <img src={form.thumbnail} alt="Cover preview" />
              ) : (
                <span className="v-dropzone-inner">
                  <ICamera />
                  <span>{thumbnailUploading ? t("form.processing") : t("form.upload")}</span>
                  <span className="v-hint">PNG · JPG · up to 1280×720</span>
                </span>
              )}
            </button>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {form.thumbnail && <button type="button" className="v-btn v-btn-sm" onClick={() => thumbnailInputRef.current?.click()}><ICamera /> {t("common.replace")}</button>}
              <button
                type="button"
                className="v-btn v-btn-sm"
                disabled={!liveScreenshotUrl(form.liveUrl)}
                title={liveScreenshotUrl(form.liveUrl) ? undefined : t("form.captureHint")}
                onClick={() => set("thumbnail", liveScreenshotUrl(form.liveUrl))}
              >
                <IGlobe /> {t("form.capture")}
              </button>
              {form.thumbnail && <button type="button" className="v-btn v-btn-sm v-btn-quiet" onClick={() => set("thumbnail", null)}>{t("common.remove")}</button>}
            </div>
            <input ref={thumbnailInputRef} type="file" accept="image/*" className="hidden" onChange={handleThumbnailUpload} />
          </Section>

          <Section no="06" title={t("form.highlights")} hint={t("form.highlightsHint")}>
            {form.features.map((f, i) => (
              <div key={i} className="v-feature-row">
                <span className="v-feature-no">{String(i + 1).padStart(2, "0")}</span>
                <input
                  type="text"
                  value={f}
                  onChange={(e) => { const u = [...form.features]; u[i] = e.target.value; set("features", u); }}
                  placeholder="e.g. Offline-first PWA"
                  className="v-input"
                  autoFocus={i === form.features.length - 1 && f === ""}
                />
                <button type="button" className="v-icon-btn is-danger" onClick={() => set("features", form.features.filter((_, j) => j !== i))} aria-label={`Remove highlight ${i + 1}`}><IX /></button>
              </div>
            ))}
            {form.features.length < 8 && (
              <button type="button" className="v-btn v-btn-sm" style={{ marginTop: form.features.length ? 12 : 0, borderStyle: "dashed" }} onClick={() => set("features", [...form.features, ""])}>
                <IPlus /> {t("form.addHighlight")}
              </button>
            )}
          </Section>
        </div>

        <div className="v-drawer-foot">
          <span className="v-mono" style={{ color: errorCount ? "var(--v-coral)" : "var(--v-faint)" }}>
            {errorCount ? t("form.needsAttention", { n: errorCount }) : t("form.escCancel")}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={onClose} className="v-btn">{t("common.cancel")}</button>
            <button type="submit" className="v-btn v-btn-primary">{isEditing ? t("form.saveChanges") : t("form.lockIn")}</button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Section({ no, title, hint, children }: { no: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="v-form-section">
      <div>
        <span className="v-mono" style={{ color: "var(--v-faint)" }}>{no}</span>
        <div className="v-form-section-title">{title}</div>
        {hint && <div className="v-form-section-hint">{hint}</div>}
      </div>
      <div>{children}</div>
    </section>
  );
}

function Field({ label, required, error, hint, children }: {
  label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="v-field">
      <label className="v-label">
        <span>{label}{required && <span className="req">*</span>}</span>
        {hint && <span className="v-hint">{hint}</span>}
      </label>
      {children}
      {error && <span className="v-error">{error}</span>}
    </div>
  );
}
