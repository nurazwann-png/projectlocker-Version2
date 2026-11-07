"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { ProfileData, ProfileLinks, UsernameResult } from "@/hooks/useProfile";
import { useT, type TKey } from "@/lib/i18n";
import { monogram } from "@/lib/projectMeta";
import { uploadImage } from "@/lib/uploadImage";
import { ICamera, ICheck, IX } from "./icons";

interface ProfileEditorProps {
  open: boolean;
  onClose: () => void;
  profile: ProfileData;
  displayName: string;
  mode: string;
  updateProfile: (changes: Partial<ProfileData>) => void;
  setDisplayName: (name: string) => Promise<void>;
  setUsername: (name: string) => Promise<UsernameResult>;
}

async function shrinkImage(file: File, size: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, size / Math.min(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

const USERNAME_ERRORS: Record<string, TKey> = { taken: "pe.errTaken", format: "pe.errFormat", signin: "pe.errSignin", failed: "pe.errFailed" };

export default function ProfileEditor({ open, onClose, profile, displayName, mode, updateProfile, setDisplayName, setUsername }: ProfileEditorProps) {
  const t = useT();
  const [name, setName] = useState(displayName);
  const [bio, setBio] = useState(profile.bio);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [links, setLinks] = useState<ProfileLinks>(profile.links);
  const [skills, setSkills] = useState<string[]>(profile.skills);
  const [skillInput, setSkillInput] = useState("");
  const [handle, setHandle] = useState(profile.username ?? "");
  const [handleState, setHandleState] = useState<"idle" | "saving" | "saved" | TKey>("idle");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(displayName); setBio(profile.bio); setAvatar(profile.avatar); setLinks(profile.links);
    setSkills(profile.skills); setHandle(profile.username ?? ""); setHandleState("idle"); setSkillInput("");
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  async function pickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      setAvatar(mode === "cloud" ? await uploadImage(file, "avatar") : await shrinkImage(file, 256));
    } catch {
      // keep the previous photo
    } finally {
      setUploading(false);
    }
  }

  function addSkill(raw: string) {
    const s = raw.trim();
    if (s && !skills.includes(s) && skills.length < 20) setSkills([...skills, s]);
    setSkillInput("");
  }
  function onSkillKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addSkill(skillInput); }
    else if (e.key === "Backspace" && !skillInput && skills.length) setSkills(skills.slice(0, -1));
  }

  async function claim() {
    setHandleState("saving");
    const res = await setUsername(handle);
    setHandleState(res.ok ? "saved" : USERNAME_ERRORS[res.error] ?? "pe.errFailed");
  }

  async function save() {
    const pending = skillInput.trim() && !skills.includes(skillInput.trim()) ? [...skills, skillInput.trim()] : skills;
    updateProfile({ bio: bio.trim(), avatar, links, skills: pending });
    if (name.trim() && name.trim() !== displayName) await setDisplayName(name);
    onClose();
  }

  const handleError = handleState !== "idle" && handleState !== "saving" && handleState !== "saved" ? handleState : null;

  return (
    <div className="v-overlay" role="dialog" aria-modal="true" aria-labelledby="pe-title">
      <div className="v-backdrop" onClick={onClose} />
      <div className="v-drawer">
        <div className="v-drawer-head">
          <span className="v-eyebrow">{t("pe.eyebrow")}</span>
          <button className="v-icon-btn" onClick={onClose} aria-label={t("common.close")}><IX /></button>
        </div>

        <div className="v-drawer-body">
          <h2 id="pe-title" className="v-form-title">{t("pe.title")} <em>{t("pe.titleEm")}</em></h2>
          <p style={{ color: "var(--v-muted)", marginTop: 14, fontSize: 14.5, lineHeight: 1.6 }}>{t("pe.sub")}</p>

          <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 28 }}>
            <div className="px-avatar" style={{ width: 88, height: 88, borderRadius: 22, flexShrink: 0 }}>
              {avatar ? <img src={avatar} alt="" style={{ borderRadius: 20 }} /> : <div style={{ borderRadius: 20 }}><span className="v-grad-text" style={{ fontSize: 34 }}>{monogram(name || "?")}</span></div>}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="v-btn v-btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}><ICamera /> {uploading ? t("card.uploading") : t("pe.uploadPhoto")}</button>
              {avatar && <button className="v-btn v-btn-sm v-btn-quiet" onClick={() => setAvatar(null)}>{t("common.remove")}</button>}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickAvatar} />
            </div>
          </div>

          <div className="v-field" style={{ marginTop: 26 }}>
            <label className="v-label" htmlFor="pe-name">{t("pe.name")}{mode === "cloud" && <span className="v-hint">{t("pe.nameHintCloud")}</span>}</label>
            <input id="pe-name" className="v-input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="v-field">
            <label className="v-label" htmlFor="pe-bio">{t("pe.bio")}<span className="v-hint">{bio.length}/200</span></label>
            <textarea id="pe-bio" className="v-input" rows={3} value={bio} placeholder={t("pe.bioPh")} onChange={(e) => setBio(e.target.value.slice(0, 200))} />
          </div>

          <div className="v-field">
            <label className="v-label" htmlFor="pe-user">{t("pe.username")}</label>
            <div style={{ display: "flex", gap: 8 }}>
              <div className="v-search" style={{ flex: 1 }}>
                <span style={{ position: "absolute", left: 12, fontFamily: "var(--v-mono)", fontSize: 13, color: "var(--v-faint)" }}>/u/</span>
                <input
                  id="pe-user"
                  className={`v-input${handleError ? " is-error" : ""}`}
                  style={{ paddingLeft: 38, width: "100%", height: 40 }}
                  value={handle}
                  disabled={mode !== "cloud"}
                  onChange={(e) => { setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setHandleState("idle"); }}
                  onKeyDown={(e) => { if (e.key === "Enter") claim(); }}
                  placeholder="your-name"
                  maxLength={30}
                />
              </div>
              <button className="v-btn" onClick={claim} disabled={mode !== "cloud" || handleState === "saving" || !handle || handle === profile.username}>
                {handleState === "saved" ? <><ICheck /> {t("common.saved")}</> : t("pe.claim")}
              </button>
            </div>
            {mode !== "cloud"
              ? <span className="v-hint">{t("pe.errSignin")}</span>
              : handleError ? <span className="v-error">{t(handleError)}</span> : <span className="v-hint">{t("pe.usernameHint")}</span>}
          </div>

          <div className="v-field">
            <span className="v-label">{t("pe.links")}</span>
            <div style={{ display: "grid", gap: 8 }}>
              {([["github", "GitHub", "https://github.com/…"], ["linkedin", "LinkedIn", "https://linkedin.com/in/…"], ["website", t("pe.website"), "https://"]] as const).map(([key, label, ph]) => (
                <div key={key} style={{ display: "grid", gridTemplateColumns: "92px 1fr", alignItems: "center", gap: 10 }}>
                  <span className="v-mono" style={{ fontSize: 10.5 }}>{label}</span>
                  <input className="v-input" type="url" placeholder={ph} value={links[key] ?? ""} onChange={(e) => setLinks({ ...links, [key]: e.target.value || undefined })} />
                </div>
              ))}
            </div>
          </div>

          <div className="v-field">
            <span className="v-label">{t("pe.skills")}</span>
            <div className="v-taginput">
              {skills.map((s) => (
                <span key={s} className="v-chip">{s}<button onClick={() => setSkills(skills.filter((x) => x !== s))} aria-label={`${t("common.remove")} ${s}`}><IX /></button></span>
              ))}
              <input value={skillInput} onChange={(e) => setSkillInput(e.target.value.replace(",", ""))} onKeyDown={onSkillKey} onBlur={() => skillInput && addSkill(skillInput)} placeholder={t("pe.skillPh")} />
            </div>
          </div>
        </div>

        <div className="v-drawer-foot">
          <span />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="v-btn" onClick={onClose}>{t("common.cancel")}</button>
            <button className="v-btn v-btn-primary" onClick={save}>{t("common.save")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
