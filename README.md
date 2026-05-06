# 💳 LendTrack - Premium Loan Management System (v2.4.0)

LendTrack is an enterprise-grade mobile application designed for micro-lenders and financial managers. Built with **React Native** and **Expo SDK 54**, it offers a professional, high-performance experience to track loans, manage customers, and monitor financial health with precision.

![LendTrack Banner](https://images.unsplash.com/photo-1554224155-1696413575b3?auto=format&fit=crop&q=80&w=1200&h=400)

---

## ✨ Premium Features (v2.4.0)

- **📊 Advanced Analytics Dashboard**: Real-time overview of total lending, collections, and overdue payments with a redesigned "Premium Hero" card and dual-stream Cash Flow charts.
- **🔍 Global Search Engine**: Instantly find customers or specific loans using the new unified search architecture.
- **🧮 Professional Loan Calculator**: Built-in tool for generating quick quotes using both **Flat Interest** and **Reducing Balance (EMI)** models.
- **📂 Advanced Data Portability**: Export your entire loan portfolio and payment history directly to **CSV/Excel** for external auditing.
- **👥 Customer CRM**: Comprehensive management of borrower profiles, including identity verification and history.
- **💰 Smart Loan Tracking**: Support for daily, weekly, and monthly installments with automated interest and penalty calculations.
- **🔒 Enterprise Security**: Biometric (Fingerprint/FaceID) App Lock, Data Masking (PII protection), and localized brute-force protection.
- **🎨 Premium UI/UX**: A sleek interface with glassmorphic accents, staggered entrance animations, and a high-density **Compact Mode** for power users.

---

## 🛠️ Technology Stack

- **Framework**: [Expo SDK 54](https://expo.dev/) (React Native)
- **Navigation**: Expo Router (File-based routing)
- **Backend**: [Supabase](https://supabase.com/) (PostgreSQL & Auth)
- **State**: DashboardContext with 1-min intelligent data retention
- **Icons**: [Lucide React Native](https://lucide.dev/)
- **Charts**: [React Native Chart Kit](https://github.com/indiespirit/react-native-chart-kit)
- **Animations**: [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Supabase Account** (Free tier supported)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Kavindu-Irosha/lend-track-mobile.git
   cd lend-track-mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Database Setup:**
   - Create a new project in your [Supabase Dashboard](https://supabase.com/dashboard).
   - Go to the **SQL Editor**.
   - Copy and run the contents of `schema.sql` (found in the project root) to initialize tables, RLS policies, and storage buckets.

4. **Configure Environment Variables:**
   Create a `.env` file in the root:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

5. **Launch the app:**
   ```bash
   npx expo start
   ```

---

## 📁 Project Structure

```text
├── app/                  # Expo Router (Navigation & Screens)
│   ├── (auth)/           # Authentication (Login, Signup)
│   ├── (tabs)/           # Main App Hub (Dashboard, Loans, Customers)
│   ├── calculator.tsx    # Standalone Loan Calculator
│   └── search.tsx        # Global Search Engine
├── src/
│   ├── components/       # Reusable Premium UI Components
│   ├── context/          # State Management (Auth, Theme, Security)
│   ├── lib/              # Financial Engine & API Services
│   └── types/            # Strict TypeScript Definitions
├── schema.sql            # One-click Database Blueprint
└── GUMROAD_SETUP.md      # Commercial Deployment Guide
```

---

## 🎯 Release Roadmap

- [x] Export reports to CSV
- [x] Standalone Loan Calculator
- [x] Global Search Engine
- [x] Biometric Authentication (App Lock)
- [x] High-Density Compact Mode
- [ ] Push Notifications for overdue payments
- [ ] Multi-currency localization

---

## 📄 License

This project is licensed under the MIT License - see the `LICENSE` file for details.

---

### Developed by **Kavindu Irosha** 🚀
*Empowering financial independence through technology.*
