export const APP_VERSION = "1.0.5"
export const BUILD_NUMBER = "2026.04.08.01"

export type ChangelogItem = {
  version: string;
  date: string;
  title: string;
  notes: string[];
}

export const CHANGELOG: ChangelogItem[] = [
  {
    version: "1.0.5",
    date: "2026-04-08",
    title: "Data Integrity & Capital Protection",
    notes: [
      "Implemented 'Capital Protection Lock' to prevent deletion of loans with active balances.",
      "Optimized Dashboard Cash Flow data fetching for faster cold starts.",
      "Refined Auth defaults and biometric security handshakes.",
      "Fixed UI layout inconsistencies in Customer Detail view."
    ]
  },
  {
    version: "1.0.4",
    date: "2026-04-06",
    title: "Executive Cash Flow Analysis",
    notes: [
      "Transformed Dashboard chart into dual-stream Cash Flow monitor.",
      "Added 'Money In' (Returns) vs 'Money Out' (Investments) comparison.",
      "High-contrast financial color coding (Green/Red).",
      "Interactive legend positioned for executive-grade ergonomics."
    ]
  },
  {
    version: "1.0.3",
    date: "2026-04-05",
    title: "Premium Payments Visualization",
    notes: [
      "Upgraded History tab to high-performance Bezier Area Charts.",
      "Implemented smooth horizontal panning for 12-month data visibility.",
      "Added Monthly Detail Watcher with haptic point interaction.",
      "Audit-grade typography and minimalist axes."
    ]
  },
  {
    version: "1.0.2",
    date: "2026-04-05",
    title: "Staggered Flow Animations",
    notes: [
      "Implemented premium 'Waterflow' entrance animations for all lists.",
      "Redesigned Dashboard charts with horizontal swipe interactivity.",
      "Added dynamic date-range filtering (7D to 6M) for analytics.",
      "Optimized tab-switching performance with spring-based transitions."
    ]
  },
  {
    version: "1.0.1",
    date: "2026-04-03",
    title: "Midnight Precision Redesign",
    notes: [
      "Implemented 'Executive Minimalist' bottom navigation architecture.",
      "Pixel-perfect icon/label alignment with zero-gap containers.",
      "Resolved route unmatched errors for specialized settings flow.",
      "Enhanced biometric security handshakes."
    ]
  },
  {
    version: "1.0.0",
    date: "2026-04-02",
    title: "Initial Audit-Grade Release",
    notes: [
      "Core loan management engine with interest calculation models.",
      "Supabase real-time cloud database integration.",
      "Biometric security and encrypted authentication flow."
    ]
  }
]
