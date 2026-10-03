import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 16, ...rest }: P) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...rest,
  };
}

export const IconCheckCircle = (p: P) => (
  <svg {...base(p)}>
    <circle cx="8" cy="8" r="6.25" />
    <path d="m5.5 8.2 1.7 1.7 3.3-3.6" />
  </svg>
);
export const IconHalfCircle = (p: P) => (
  <svg {...base(p)}>
    <circle cx="8" cy="8" r="6.25" />
    <path d="M8 1.75a6.25 6.25 0 0 0 0 12.5Z" fill="currentColor" stroke="none" />
  </svg>
);
export const IconDashedCircle = (p: P) => (
  <svg {...base(p)}>
    <circle cx="8" cy="8" r="6.25" strokeDasharray="2.2 2.2" />
  </svg>
);
export const IconXCircle = (p: P) => (
  <svg {...base(p)}>
    <circle cx="8" cy="8" r="6.25" />
    <path d="m5.8 5.8 4.4 4.4m0-4.4-4.4 4.4" />
  </svg>
);
export const IconWarning = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 2.2 14.3 13.3H1.7Z" />
    <path d="M8 6.5v3.2M8 11.4v.1" />
  </svg>
);
export const IconInfo = (p: P) => (
  <svg {...base(p)}>
    <circle cx="8" cy="8" r="6.25" />
    <path d="M8 7.2v3.6M8 5.1v.1" />
  </svg>
);
export const IconChevronLeft = (p: P) => (
  <svg {...base(p)}>
    <path d="m9.5 4-4 4 4 4" />
  </svg>
);
export const IconChevronRight = (p: P) => (
  <svg {...base(p)}>
    <path d="m6.5 4 4 4-4 4" />
  </svg>
);
export const IconChevronDown = (p: P) => (
  <svg {...base(p)}>
    <path d="m4 6.5 4 4 4-4" />
  </svg>
);
export const IconPlus = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 3.5v9M3.5 8h9" />
  </svg>
);
export const IconX = (p: P) => (
  <svg {...base(p)}>
    <path d="m4.5 4.5 7 7m0-7-7 7" />
  </svg>
);
export const IconShield = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 1.8 13 3.6v4.1c0 3-2.1 5.4-5 6.5-2.9-1.1-5-3.5-5-6.5V3.6Z" />
    <path d="m5.8 8 1.5 1.5 2.9-3" />
  </svg>
);
export const IconUpload = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 10.5V2.8M5 5.6 8 2.6l3 3M2.8 10.5v2.7h10.4v-2.7" />
  </svg>
);
export const IconFile = (p: P) => (
  <svg {...base(p)}>
    <path d="M9.2 1.8H4a1 1 0 0 0-1 1v10.4a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5.6Z" />
    <path d="M9.2 1.8v3.8H13" />
  </svg>
);
export const IconLink = (p: P) => (
  <svg {...base(p)}>
    <path d="M6.8 9.2a2.6 2.6 0 0 0 3.7 0l2.2-2.2a2.6 2.6 0 0 0-3.7-3.7l-.8.8M9.2 6.8a2.6 2.6 0 0 0-3.7 0L3.3 9a2.6 2.6 0 0 0 3.7 3.7l.8-.8" />
  </svg>
);
export const IconSplit = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 6h10M3 10h10M8 2.5v11" />
  </svg>
);
export const IconUser = (p: P) => (
  <svg {...base(p)}>
    <circle cx="8" cy="5.6" r="2.6" />
    <path d="M2.9 13.6c.6-2.4 2.6-3.9 5.1-3.9s4.5 1.5 5.1 3.9" />
  </svg>
);
export const IconList = (p: P) => (
  <svg {...base(p)}>
    <path d="M5.5 4h8M5.5 8h8M5.5 12h8M2.6 4h.1M2.6 8h.1M2.6 12h.1" />
  </svg>
);
export const IconSliders = (p: P) => (
  <svg {...base(p)}>
    <path d="M2.5 4.5h6m3 0h2M2.5 11.5h2m3 0h6" />
    <circle cx="10" cy="4.5" r="1.5" />
    <circle cx="6" cy="11.5" r="1.5" />
  </svg>
);
export const IconTrash = (p: P) => (
  <svg {...base(p)}>
    <path d="M2.8 4.2h10.4M6.2 4.2V2.6h3.6v1.6M4.2 4.2l.6 9.2h6.4l.6-9.2" />
  </svg>
);
export const IconExternal = (p: P) => (
  <svg {...base(p)}>
    <path d="M9.5 2.5h4v4M13.5 2.5 7.8 8.2M11.5 9.5v3.8H2.7V4.5h3.8" />
  </svg>
);
export const IconBriefcase = (p: P) => (
  <svg {...base(p)}>
    <rect x="1.8" y="4.6" width="12.4" height="9" rx="1.4" />
    <path d="M5.6 4.6V3.2c0-.6.4-1 1-1h2.8c.6 0 1 .4 1 1v1.4M1.8 8.6h12.4" />
  </svg>
);
export const IconSearch = (p: P) => (
  <svg {...base(p)}>
    <circle cx="7" cy="7" r="4.6" />
    <path d="m10.4 10.4 3.4 3.4" />
  </svg>
);
export const IconPlusSquare = (p: P) => (
  <svg {...base(p)}>
    <rect x="2" y="2" width="12" height="12" rx="2" />
    <path d="M8 5.2v5.6M5.2 8h5.6" />
  </svg>
);
export const IconBookmark = ({ filled, ...p }: P & { filled?: boolean }) => (
  <svg {...base(p)}>
    <path d="M4 2.2h8v11.6L8 11 4 13.8Z" fill={filled ? "currentColor" : "none"} />
  </svg>
);
export const IconMapPin = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 14.2s4.6-4.1 4.6-7.6a4.6 4.6 0 0 0-9.2 0c0 3.5 4.6 7.6 4.6 7.6Z" />
    <circle cx="8" cy="6.6" r="1.6" />
  </svg>
);
export const IconBanknote = (p: P) => (
  <svg {...base(p)}>
    <rect x="1.6" y="4" width="12.8" height="8" rx="1.2" />
    <circle cx="8" cy="8" r="1.8" />
    <path d="M4 6.4v3.2M12 6.4v3.2" />
  </svg>
);
export const IconTrending = (p: P) => (
  <svg {...base(p)}>
    <path d="m1.8 11.6 4.2-4.2 2.8 2.8 5.4-5.4M10.2 4.8h4v4" />
  </svg>
);
export const IconClock = (p: P) => (
  <svg {...base(p)}>
    <circle cx="8" cy="8" r="6.25" />
    <path d="M8 4.6V8l2.4 1.6" />
  </svg>
);
export const IconPencil = (p: P) => (
  <svg {...base(p)}>
    <path d="m10.6 2.6 2.8 2.8-8.2 8.2H2.4v-2.8Z" />
  </svg>
);
export const IconSparkle = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 1.8 9.4 6.6 14.2 8l-4.8 1.4L8 14.2 6.6 9.4 1.8 8l4.8-1.4Z" />
  </svg>
);
export const IconTarget = (p: P) => (
  <svg {...base(p)}>
    <circle cx="8" cy="8" r="6.25" />
    <circle cx="8" cy="8" r="3.4" />
    <circle cx="8" cy="8" r=".6" fill="currentColor" />
  </svg>
);
export const IconGrid = (p: P) => (
  <svg {...base(p)}>
    <rect x="2" y="2" width="5" height="5" rx="1" />
    <rect x="9" y="2" width="5" height="5" rx="1" />
    <rect x="2" y="9" width="5" height="5" rx="1" />
    <rect x="9" y="9" width="5" height="5" rx="1" />
  </svg>
);
