import { coverCode, coverVars, monogram } from "@/lib/projectMeta";

export default function Cover({ name, src, showCode = true }: { name: string; src?: string | null; showCode?: boolean }) {
  if (src) return <img src={src} alt={`${name} preview`} className="v-cover-img" />;
  return (
    <div className="v-cover" style={coverVars(name)} aria-hidden>
      <span className="v-cover-glyph">{monogram(name)}</span>
      {showCode && <span className="v-cover-code">{coverCode(name)}</span>}
    </div>
  );
}
