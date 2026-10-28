const base = { viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', 'aria-hidden': true } as const;

export const PlusIcon = () => (
  <svg {...base} strokeWidth={1.7} strokeLinecap="round">
    <path d="M8 3v10M3 8h10" />
  </svg>
);

export const SunIcon = () => (
  <svg {...base} strokeWidth={1.5} strokeLinecap="round">
    <circle cx="8" cy="8" r="3" />
    <path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" />
  </svg>
);

export const MoonIcon = () => (
  <svg {...base} strokeWidth={1.5} strokeLinejoin="round">
    <path d="M13.5 9.6A5.6 5.6 0 0 1 6.4 2.5a5.6 5.6 0 1 0 7.1 7.1Z" />
  </svg>
);

export const DownloadIcon = () => (
  <svg {...base} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13.5h10" />
  </svg>
);

export const ShareIcon = () => (
  <svg {...base} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 10V2.5M5 5.5 8 2.5l3 3M3 8.5v4a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-4" />
  </svg>
);

export const ExpandIcon = () => (
  <svg {...base} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2.5h4v4M13.5 2.5 9 7M6.5 13.5h-4v-4M2.5 13.5 7 9" />
  </svg>
);

export const CloseIcon = () => (
  <svg {...base} strokeWidth={1.8} strokeLinecap="round">
    <path d="m4 4 8 8M12 4l-8 8" />
  </svg>
);

export const ChevronLeftIcon = () => (
  <svg {...base} strokeWidth={1.8} strokeLinecap="round">
    <path d="M10 3 5 8l5 5" />
  </svg>
);

export const ChevronRightIcon = () => (
  <svg {...base} strokeWidth={1.8} strokeLinecap="round">
    <path d="m6 3 5 5-5 5" />
  </svg>
);

export const CheckIcon = () => (
  <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M2.5 6.2 5 8.6l4.6-5" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const LogoutIcon = () => (
  <svg {...base} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 2.5h-3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3M10 5l3 3-3 3M6 8h7" />
  </svg>
);

export const CloudIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" aria-hidden="true">
    <path d="M7 18.5a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 17 9.5a4.5 4.5 0 0 1 .5 9H7Z" />
    <path d="M9.5 14.5l2 2 3.5-4" strokeLinecap="round" />
  </svg>
);

/** Google 브랜드 'G' */
export const GoogleIcon = () => (
  <svg viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
    <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33Z" />
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
  </svg>
);
