"use client";

import { useState } from "react";
import { coverCode, coverVars, monogram } from "@/lib/projectMeta";

/** Screenshot of a live site via Microlink; returns null for anything that isn't an http(s) URL. */
export function liveScreenshotUrl(liveUrl?: string | null): string | null {
  if (!liveUrl || !/^https?:\/\//i.test(liveUrl)) return null;
  return `https://api.microlink.io/?url=${encodeURIComponent(liveUrl)}&screenshot=true&meta=false&embed=screenshot.url`;
}

export default function Cover({ name, src, liveUrl, showCode = true }: {
  name: string;
  src?: string | null;
  liveUrl?: string | null;
  showCode?: boolean;
}) {
  const auto = src ? null : liveScreenshotUrl(liveUrl);
  const [failed, setFailed] = useState<string | null>(null);
  const image = src ?? auto;

  if (image && failed !== image) {
    return (
      <>
        <Generated name={name} showCode={false} />
        <img src={image} alt={`${name} preview`} className="v-cover-img" loading="lazy" onError={() => setFailed(image)} />
      </>
    );
  }
  return <Generated name={name} showCode={showCode} />;
}

function Generated({ name, showCode }: { name: string; showCode: boolean }) {
  return (
    <div className="v-cover" style={coverVars(name)} aria-hidden>
      <span className="v-cover-glyph">{monogram(name)}</span>
      {showCode && <span className="v-cover-code">{coverCode(name)}</span>}
    </div>
  );
}
