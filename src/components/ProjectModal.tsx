"use client";

import { useState, useEffect, useRef, KeyboardEvent, useCallback } from "react";
import type { Project, ProjectFormData, ProjectStatus } from "@/types/project";
import { STATUS_CLASS } from "@/lib/projectMeta";
import { ICamera, IPlus, IX } from "./icons";

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

type FormErrors = Partial<Record<keyof ProjectFormData, string>>;

function validate(data: ProjectFormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.name.trim()) errors.name = "Give it a name.";
  if (!data.description.trim()) errors.description = "A one-line description helps.";
  if (!data.deploymentDate) errors.deploymentDate = "When did it ship?";
  if (data.techStack.length === 0) errors.techStack = "Add at least one technology.";
  return errors;
}

const STATUSES: ProjectStatus[] = ["Live", "Maintenance", "Deprecated"];

export default function ProjectModal({ isOpen, project, onClose, onSave }: ProjectModalProps) {
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
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1280 / bitmap.width, 720 / bitmap.height);
      const w = Math.round(bitmap.width * scale);
      const h = Math.round(bitmap.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
      bitmap.close();
      set("thumbnail", canvas.toDataURL("image/jpeg", 0.82));
    } catch {
      const reader = new FileReader();
      reader.onload = () => set("thumbnail", reader.result as string);
      reader.readAsDataURL(file);
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
          <span className="v-eyebrow">{isEditing ? "Edit entry" : "New entry"}</span>
          <button type="button" onClick={onClose} className="v-icon-btn" aria-label="Close"><IX /></button>
        </div>

        <div className="v-drawer-body">
          <div className="v-form-intro">
            <h2 id="pm-title" className="v-form-title">
              {isEditing ? <>Refine <em>the record.</em></> : <>Lock in <em>a project.</em></>}
            </h2>
            <p style={{ color: "var(--v-muted)", marginTop: 14, fontSize: 14.5, lineHeight: 1.6 }}>
              {isEditing ? "Update anything below — changes save when you hit Save." : "Four required fields. Everything else makes it shine."}
            </p>
          </div>

          <Section no="01" title="Identity" hint="What it is, in plain words.">
            <Field label="Project name" required error={errors.name}>
              <input ref={firstInputRef} type="text" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. PRESTIJ 4 MOE Hub" className={`v-input${errors.name ? " is-error" : ""}`} />
            </Field>
            <Field label="Description" required error={errors.description} hint={`${form.description.length}/280`}>
              <textarea value={form.description} onChange={(e) => set("description", e.target.value.slice(0, 280))} placeholder="What does it do, and who is it for?" rows={3} className={`v-input${errors.description ? " is-error" : ""}`} />
            </Field>
          </Section>

          <Section no="02" title="Status" hint="Where it stands today.">
            <Field label="Current state" required>
              <div className="v-status-pick" role="radiogroup" aria-label="Status">
                {STATUSES.map((s) => (
                  <button key={s} type="button" role="radio" aria-checked={form.status === s} aria-pressed={form.status === s} onClick={() => set("status", s)}>
                    <span className={`v-led ${STATUS_CLASS[s]}`} />{s}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Shipped on" required error={errors.deploymentDate}>
              <input type="date" value={form.deploymentDate} onChange={(e) => set("deploymentDate", e.target.value)} className={`v-input${errors.deploymentDate ? " is-error" : ""}`} style={{ maxWidth: 240 }} />
            </Field>
          </Section>

          <Section no="03" title="Stack" hint="Press Enter or comma after each one.">
            <Field label="Technologies" required error={errors.techStack}>
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
                  placeholder={form.techStack.length === 0 ? "Next.js, TypeScript, Postgres…" : "Add another…"}
                  aria-label="Add technology"
                />
              </div>
            </Field>
          </Section>

          <Section no="04" title="Links" hint="Where people can see it.">
            <Field label="Live URL">
              <input type="url" value={form.liveUrl} onChange={(e) => set("liveUrl", e.target.value)} placeholder="https://" className="v-input" />
            </Field>
            <Field label="Repository / review link">
              <input type="url" value={form.repoUrl} onChange={(e) => set("repoUrl", e.target.value)} placeholder="https://github.com/…" className="v-input" />
            </Field>
          </Section>

          <Section no="05" title="Cover" hint="A screenshot. We’ll compress it for you.">
            <button type="button" className="v-dropzone" onClick={() => thumbnailInputRef.current?.click()} disabled={thumbnailUploading}>
              {form.thumbnail ? (
                <img src={form.thumbnail} alt="Cover preview" />
              ) : (
                <span className="v-dropzone-inner">
                  <ICamera />
                  <span>{thumbnailUploading ? "Processing…" : "Click to upload a screenshot"}</span>
                  <span className="v-hint">PNG · JPG · up to 1280×720</span>
                </span>
              )}
            </button>
            {form.thumbnail && (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button type="button" className="v-btn v-btn-sm" onClick={() => thumbnailInputRef.current?.click()}><ICamera /> Replace</button>
                <button type="button" className="v-btn v-btn-sm v-btn-quiet" onClick={() => set("thumbnail", null)}>Remove</button>
              </div>
            )}
            <input ref={thumbnailInputRef} type="file" accept="image/*" className="hidden" onChange={handleThumbnailUpload} />
          </Section>

          <Section no="06" title="Highlights" hint="Up to eight things worth bragging about.">
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
                <IPlus /> Add highlight
              </button>
            )}
          </Section>
        </div>

        <div className="v-drawer-foot">
          <span className="v-mono" style={{ color: errorCount ? "var(--v-coral)" : "var(--v-faint)" }}>
            {errorCount ? `${errorCount} field${errorCount > 1 ? "s" : ""} need attention` : "Esc to cancel"}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={onClose} className="v-btn">Cancel</button>
            <button type="submit" className="v-btn v-btn-primary">{isEditing ? "Save changes" : "Lock it in"}</button>
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
