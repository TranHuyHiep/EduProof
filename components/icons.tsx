// A small, consistent icon set.
//
// Written out rather than pulled from a library: the app needs a dozen glyphs,
// and a dependency would cost more in bundle size than these lines cost to
// keep. Emoji were the previous stand-in — they render differently on every
// platform and read as unfinished.
//
// All icons inherit `currentColor` and size from `em`, so they line up with
// the text they sit beside.

interface IconProps {
  className?: string;
  /** Multiplier on the current font size. */
  size?: number;
}

function Svg({
  children,
  className = "",
  size = 1,
  filled = false,
}: IconProps & { children: React.ReactNode; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={{ width: `${size}em`, height: `${size}em`, flexShrink: 0 }}
    >
      {children}
    </svg>
  );
}

export const IconLock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
    <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
);

export const IconX = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </Svg>
);

/** Verified issuer, trust, authenticity. */
export const IconShield = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5 5 6.2v5.4c0 4.1 2.8 7.6 7 8.9 4.2-1.3 7-4.8 7-8.9V6.2Z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </Svg>
);

/** The institution. */
export const IconBuilding = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 20.5h17M12 3.5l7.5 4v13h-15v-13Z" />
    <path d="M9.5 20.5v-4h5v4M9.5 11h1.5M13 11h1.5" />
  </Svg>
);

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </Svg>
);

export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5.5v13M5.5 12h13" />
  </Svg>
);

export const IconTrash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 7h15M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7" />
    <path d="M6.5 7v12A1.5 1.5 0 0 0 8 20.5h8a1.5 1.5 0 0 0 1.5-1.5V7" />
  </Svg>
);

export const IconCopy = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M15 6.5A2.5 2.5 0 0 0 12.5 4h-6A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15" />
  </Svg>
);

export const IconArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h13M13 6.5 18.5 12 13 17.5" />
  </Svg>
);

export const IconArrowLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19 12H6M11 6.5 5.5 12 11 17.5" />
  </Svg>
);

export const IconAlert = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5v5M12 16h.01" />
  </Svg>
);

/** Wallet — replaces the sign-in metaphor. */
export const IconWallet = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 8.5A2 2 0 0 1 5.5 6.5h13a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z" />
    <path d="M3.5 10h17M16 14.5h.01" />
  </Svg>
);

/** A generated proof. */
export const IconSeal = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="10" r="6" />
    <path d="m9 15.5-1 5 4-2 4 2-1-5M9.5 10l1.8 1.8L14.5 8.5" />
  </Svg>
);

export const IconClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 1.8" />
  </Svg>
);
