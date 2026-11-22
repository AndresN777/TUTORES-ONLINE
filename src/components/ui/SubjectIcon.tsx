type Props = { slug: string; size?: number; className?: string };

/** Line icons per subject (stroke = currentColor). Unknown subjects get a book. */
export function SubjectIcon({ slug, size = 48, className = "" }: Props) {
  const common = { width: size, height: size, viewBox: "0 0 48 48", fill: "none", stroke: "currentColor", "aria-hidden": true, className };
  switch (slug) {
    case "matematicas":
      return (
        <svg {...common} strokeWidth="2.4" strokeLinecap="round">
          <rect x="3" y="3" width="18" height="18" rx="3" /><rect x="27" y="3" width="18" height="18" rx="3" />
          <rect x="3" y="27" width="18" height="18" rx="3" /><rect x="27" y="27" width="18" height="18" rx="3" />
          <path d="M12 7v10M7 12h10M31 12h10M8 41l8-10M32 31l8 8M40 31l-8 8" />
        </svg>
      );
    case "fisica":
      return (
        <svg {...common} strokeWidth="2.2">
          <ellipse cx="24" cy="24" rx="21" ry="8" /><ellipse cx="24" cy="24" rx="21" ry="8" transform="rotate(60 24 24)" />
          <ellipse cx="24" cy="24" rx="21" ry="8" transform="rotate(-60 24 24)" /><circle cx="24" cy="24" r="4" fill="currentColor" />
        </svg>
      );
    case "quimica":
      return (
        <svg {...common} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round">
          <path d="M18 4h12M20 4v14L8 40a3 3 0 003 4h26a3 3 0 003-4L28 18V4" /><path d="M13 31h22" />
        </svg>
      );
    case "ingles":
      return (
        <svg {...common} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
          <path d="M4 8h24v16H16l-6 6v-6H4z" /><path d="M20 28v4h12l6 6v-6h6V16H32" /><path d="M11 20l5-9 5 9M13 17h6" />
        </svg>
      );
    case "biologia":
      return (
        <svg {...common} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 42C6 20 18 6 40 6c0 10-3 18-9 23" /><path d="M6 42L26 22M14 26h8M20 18v8" />
          <circle cx="33" cy="33" r="7" /><path d="M38 38l6 6" />
        </svg>
      );
    default:
      return (
        <svg {...common} strokeWidth="2.4" strokeLinejoin="round">
          <path d="M24 10C18 6 10 6 4 8v32c6-2 14-2 20 2 6-4 14-4 20-2V8c-6-2-14-2-20 2z" /><path d="M24 10v32M10 16h8M10 22h8M30 16h8M30 22h8" />
        </svg>
      );
  }
}
