import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = (p: P): P => ({
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  ...p,
});

export const IPlus = (p: P) => <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>;
export const ISearch = (p: P) => <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
export const IGrid = (p: P) => <svg {...base(p)}><rect x="4" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" /></svg>;
export const IList = (p: P) => <svg {...base(p)}><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" /></svg>;
export const ITimeline = (p: P) => <svg {...base(p)}><path d="M6 3v18" /><circle cx="6" cy="8" r="1.8" fill="currentColor" /><circle cx="6" cy="16" r="1.8" fill="currentColor" /><path d="M11 8h9M11 16h6" /></svg>;
export const IPin = (p: P) => <svg {...base(p)}><path d="M9 3.5h6l-1 6.5 3.5 3.5h-11L10 10 9 3.5Z" /><path d="M12 13.5V21" /></svg>;
export const IEdit = (p: P) => <svg {...base(p)}><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></svg>;
export const ICopy = (p: P) => <svg {...base(p)}><rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2" /><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5" /></svg>;
export const ITrash = (p: P) => <svg {...base(p)}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></svg>;
export const IArrowUpRight = (p: P) => <svg {...base(p)}><path d="M7 17 17 7M8 7h9v9" /></svg>;
export const IArrowLeft = (p: P) => <svg {...base(p)}><path d="M19 12H5m0 0 6-6m-6 6 6 6" /></svg>;
export const IX = (p: P) => <svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>;
export const ICheck = (p: P) => <svg {...base({ strokeWidth: 2.4, ...p })}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
export const IDownload = (p: P) => <svg {...base(p)}><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" /></svg>;
export const IUpload = (p: P) => <svg {...base(p)}><path d="M12 20V9m0 0-4 4m4-4 4 4M5 4h14" /></svg>;
export const ICamera = (p: P) => <svg {...base(p)}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>;
export const ILock = (p: P) => <svg {...base(p)}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
export const IUnlock = (p: P) => <svg {...base(p)}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 7.5-2" /></svg>;
export const ISelect = (p: P) => <svg {...base(p)}><rect x="4" y="4" width="16" height="16" rx="4" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>;
export const IEye = (p: P) => <svg {...base(p)}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>;
export const IShield = (p: P) => <svg {...base(p)}><path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" /></svg>;
export const IGlobe = (p: P) => <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" /></svg>;
export const IUsers = (p: P) => <svg {...base(p)}><circle cx="9" cy="8" r="3.2" /><path d="M3 19c.6-3.2 3-5 6-5s5.4 1.8 6 5" /><circle cx="17" cy="9" r="2.5" /><path d="M16.5 14.1c2.3.3 3.9 1.9 4.5 4.4" /></svg>;
export const IShare = (p: P) => <svg {...base(p)}><circle cx="18" cy="5.5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="18.5" r="2.5" /><path d="m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1" /></svg>;
export const IPalette = (p: P) => <svg {...base(p)}><path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2 0-1.3-1-1.6-1-2.8 0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4C21 6.5 17 3 12 3Z" /><circle cx="7.5" cy="11" r="1.2" fill="currentColor" /><circle cx="10" cy="7" r="1.2" fill="currentColor" /><circle cx="15" cy="7.5" r="1.2" fill="currentColor" /></svg>;
export const IKeyboard = (p: P) => <svg {...base(p)}><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" /></svg>;
export const IGithub = (p: P) => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
  </svg>
);

export function LockerMark(p: P) {
  return (
    <svg viewBox="0 0 1024 1024" fill="none" aria-hidden {...p}>
      <defs>
        <linearGradient id="locker-mark-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: "var(--v-c1)" }} />
          <stop offset="0.5" style={{ stopColor: "var(--v-c2)" }} />
          <stop offset="1" style={{ stopColor: "var(--v-c3)" }} />
        </linearGradient>
      </defs>
      {/* Same mark as the app icon (public/icon.svg), tinted by the active theme */}
      <rect width="1024" height="1024" rx="232" fill="url(#locker-mark-grad)" />
      <rect x="322" y="232" width="380" height="560" rx="70" fill="#fff" fillOpacity="0.16" stroke="#fff" strokeWidth="48" />
      <g stroke="#fff" strokeWidth="34" strokeLinecap="round" strokeOpacity="0.92">
        <line x1="394" y1="324" x2="560" y2="324" />
        <line x1="394" y1="384" x2="520" y2="384" />
      </g>
      <circle cx="512" cy="548" r="70" fill="#fff" />
      <path d="M480 590 H544 L566 702 H458 Z" fill="#fff" />
      <circle cx="630" cy="324" r="30" fill="#3dffa8" stroke="#fff" strokeWidth="8" />
    </svg>
  );
}
