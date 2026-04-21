import Constants from 'expo-constants'

export const APP_VERSION = Constants.expoConfig?.version || '2.3.0'
export const BUILD_NUMBER = "2026.04.12.01"
export const LAST_OTA_UPDATE = "2026-04-12 01:12"

export type ChangelogItem = {
  version: string;
  date: string;
  title: string;
  notes: string[];
}

export const CHANGELOG: ChangelogItem[] = [
  {
    version: "2.4.0",
    date: "2026-04-21",
    title: "Automated Push & SMS Engine",
    notes: [
      "Enterprise SMS Automation: Integrated Text.lk backend bridge via Supabase Edge Functions.",
      "Event-Driven Triggers: Instant SQL Webhooks for Loan Issued and Payment Received notifications.",
      "Scheduled Campaigns: Integrated pg_cron scheduling for 8 AM daily overdue and due-tomorrow reminders.",
      "Push Navigation Prep: Installed expo-notifications and expo-device with custom SDK 53 Go bypass.",
      "Secure Tokens: Upgraded architecture to store Expo Push Tokens in isolated Supabase user_devices table.",
      "Security Hardening: Abstracted hardcoded API keys into secure local .env configurations.",
      "TypeScript Hardening: Resolved NotificationFeedbackType and base-64 compiler conflicts.",
    ]
  },
  {
    version: "2.3.0",
    date: "2026-04-12",
    title: "System Stability & UX Polish",
    notes: [
      "Haptic Refactor: Fixed haptic on/off toggle behavior across the core navigation bar and all dashboard modules.",
      "Navigation Guard: Fixed rare double-tap glitch that caused duplicate screens to render in the settings stack.",
      "Reference Fixes: Resolved all 'Haptics is not defined' and 'triggerHapticImpact' compilation errors across the project.",
      "Unified Feedback: Migrated all remaining direct Haptics calls to the centralized Settings-aware utility layer.",
      "Visual Polish: Finalized shadow and color tokens for the Light Theme Elite design system.",
    ]
  },
  {
    version: "2.2.0",
    date: "2026-04-11",
    title: "Enterprise Audit & Premium UI",
    notes: [
      "Financial Engine: Implemented Monthly Interest Rate scaling with penny-drift protection.",
      "Performance Mode: Integrated dynamic animation & haptic scaling for low-end devices.",
      "Premium UI Refinement: Redesigned Light Theme with soft primary accents and glassmorphic borders.",
      "Compact Mode: High-density layout option for power users with responsive card scaling.",
      "Security Resilience: Added 'Sign Out' emergency bypass to Biometric Guard to prevent lockout.",
      "Global Error Handling: Integrated ErrorBoundary with recovery screen for all critical crashes.",
      "Smart Caching: Integrated DashboardContext with 1-min intelligent data retention.",
    ]
  },
  {
    version: "2.1.0",
    date: "2026-04-11",
    title: "EAS Automation & UI Polish",
    notes: [
      "Dynamic versioning system — no more hardcoded version strings.",
      "Automated CI/CD with GitHub Actions for OTA updates.",
      "Redesigned Alerts summary layout for better space utilization.",
      "Added Deployment Status to Settings for tracking 'Magic Updates'.",
      "Removed native splash icon to prevent logo flicker.",
    ]
  },
  {
    version: "2.0.0",
    date: "2026-04-10",
    title: "Elite FinTech Command Center",
    notes: [
      "Complete UI overhaul across all screens — premium dark/light mode design system.",
      "Dashboard Hero Card with dynamic glow, dual-stream Cash Flow chart, and social-feed activity timeline.",
      "Customer Directory: rich avatar cards, inline financial quick-view, and filter tabs with live count badges.",
      "Loans Index: portfolio summary ribbon, status filter tabs with auto-sizing scroll, and staggered card animations.",
      "Loan Wizard: 3-step visual progress indicator, live EMI calculator hero card, and polished success state.",
      "Payments Center: stats strip (Today/All-Time/Records), card-based monthly breakdown, and premium chart interactions.",
      "Record Payment: rich loan selector with quick stats, double-ring success animation, and receipt summary card.",
      "Add Customer: sectioned layout (Personal/Identity/Details), side-by-side NIC capture with verified badges.",
      "Alerts Center: priority-sorted cards with severity indicators, urgency tags, and quick-action buttons.",
      "Settings Hub: glassmorphic profile card, segmented theme controller, security vault, and full changelog viewer.",
      "Custom Alert & Toast: triple-ring icon system, bouncing animations, colored accent bars, and elevated shadows.",
    ]
  },
  {
    version: "1.0.6",
    date: "2026-04-09",
    title: "Enterprise Security Hardening",
    notes: [
      "Enabled Supabase Row-Level Security (RLS) for strict multi-tenant isolation.",
      "Implemented localized 5-strike brute-force login lockouts.",
      "Added Data Masking (PII) to visually obscure Phone and NIC metrics.",
      "Integrated Babel stripping to remove internal logs from production builds.",
      "Strict logical bounding on negative loans and aggressive payment injections."
    ]
  },
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
