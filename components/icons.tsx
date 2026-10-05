const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

type P = { size?: number };
const s = (size?: number) => (size ? { width: size, height: size } : {});

export const IconSearch = ({ size }: P) => (
  <svg {...base} {...s(size)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);
export const IconArrow = ({ size }: P) => (
  <svg {...base} {...s(size)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const IconClose = ({ size }: P) => (
  <svg {...base} {...s(size)}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
export const IconMic = ({ size }: P) => (
  <svg {...base} {...s(size)}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);
export const IconFilm = ({ size }: P) => (
  <svg {...base} {...s(size)}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4" />
  </svg>
);
export const IconPerson = ({ size }: P) => (
  <svg {...base} {...s(size)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </svg>
);
export const IconSpark = ({ size }: P) => (
  <svg {...base} {...s(size)}>
    <path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z" />
  </svg>
);
export const IconStar = ({ size = 12 }: P) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden
  >
    <path d="m12 2.5 2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
  </svg>
);
export const IconPlay = ({ size = 14 }: P) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden
  >
    <path d="M7 4.5v15l12.5-7.5z" />
  </svg>
);
export const IconExternal = ({ size = 14 }: P) => (
  <svg {...base} {...s(size)}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
);
export const IconPlus = ({ size }: P) => (
  <svg {...base} {...s(size)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const IconCheck = ({ size }: P) => (
  <svg {...base} {...s(size)}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </svg>
);
export const IconShare = ({ size }: P) => (
  <svg {...base} {...s(size)}>
    <path d="M12 3v13M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
  </svg>
);
export const IconChevron = ({
  size,
  dir = "right",
}: P & { dir?: "left" | "right" }) => (
  <svg {...base} {...s(size)}>
    <path d={dir === "right" ? "m9 6 6 6-6 6" : "m15 6-6 6 6 6"} />
  </svg>
);
export const IconShuffle = ({ size }: P) => (
  <svg {...base} {...s(size)}>
    <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
  </svg>
);
export const IconBookmark = ({ size }: P) => (
  <svg {...base} {...s(size)}>
    <path d="M6 3h12v18l-6-4-6 4z" />
  </svg>
);
export const IconWand = ({ size }: P) => (
  <svg {...base} {...s(size)}>
    <path d="m15 4 5 5L9 20H4v-5zM13 6l5 5" />
  </svg>
);

export function Logo({ size = 30 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <defs>
        <linearGradient id="dm-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff4d5e" />
          <stop offset="1" stopColor="#c8102e" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="42" height="42" rx="12" fill="url(#dm-logo)" />
      <path d="M18 14.5v19l15.5-9.5z" fill="#fff" />
      <circle cx="35.5" cy="12.5" r="3.2" fill="#ffc94d" />
    </svg>
  );
}
