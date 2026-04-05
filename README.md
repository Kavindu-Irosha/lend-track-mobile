# 💳 LendTrack - Premium Loan Management System

LendTrack is a cutting-edge mobile application designed for micro-lenders and financial managers. Built with **React Native** and **Expo SDK 54**, it offers a professional, high-performance experience to track loans, manage customers, and monitor financial health with precision.

![LendTrack Banner](https://images.unsplash.com/photo-1554224155-1696413575b3?auto=format&fit=crop&q=80&w=1200&h=400)

---

## ✨ Features

- **📊 Advanced Analytics Dashboard**: Real-time overview of total lending, collections, and overdue payments with dynamic charts.
- **👥 Customer CRM**: Comprehensive management of borrower profiles, including contact details and history.
- **💰 Smart Loan Tracking**: Create and manage multiple loan types with automated interest calculations and status tracking.
- **💸 Seamless Payment Management**: Log payments and track transaction history with instant balance updates.
- **🔔 Intelligent Alerts**: Stay notified about upcoming deadlines, overdue payments, and system updates.
- **📑 Financial Reports**: Generate detailed performance reports using optimized financial utilities.
- **🔒 Secure Authentication**: Powered by **Supabase** for enterprise-grade security and real-time database synchronization.
- **🎨 Premium UI/UX**: A sleek, dark-themed interface built with **Lucide Icons** and **Reanimated** for smooth interactions.

---

## 🛠️ Technology Stack

- **Framework**: [Expo SDK 54](https://expo.dev/) (React Native)
- **Navigation**: Expo Router (File-based routing)
- **Backend**: [Supabase](https://supabase.com/) (Database & Auth)
- **Styling**: Vanilla React Native Styles with Premium Design Tokens
- **Icons**: [Lucide React Native](https://lucide.dev/)
- **Charts**: [React Native Chart Kit](https://github.com/indiespirit/react-native-chart-kit)
- **Animations**: [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- **Utils**: [date-fns](https://date-fns.org/) for precise date manipulation

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo Go app on your mobile device (to preview)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Kavindu-Irosha/lend-track-mobile.git
   cd lend-track-mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Database Setup:**
   - Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
   - Create a new project.
   - Run the SQL queries provided in `migration.sql` within the SQL Editor to set up the necessary table schema extensions.

4. **Configure Environment Variables:**
   Create a `.env` file in the root and add your Supabase credentials (or configure them in `src/lib/supabase.ts`):
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

5. **Start the development server:**
   ```bash
   npm run start
   ```

6. **Run on a device/emulator:**
   - Press `a` for Android Emulator
   - Press `i` for iOS Simulator
   - Scan the QR code with Expo Go for physical devices

---

## 📁 Project Structure

```text
├── app/                  # Expo Router directory (Navigation & Screens)
│   ├── (auth)/           # Authentication screens (Login, Signup)
│   ├── (tabs)/           # Main application tab navigation
│   │   ├── loans/        # Loan management module
│   │   ├── payments/     # Payment tracking module
│   │   └── customers/    # Customer management module
│   └── _layout.tsx       # Root layout provider
├── src/
│   ├── components/       # Reusable UI components
│   ├── constants/        # Design system & theme constants
│   ├── context/          # State management (Auth, Alert, etc.)
│   ├── lib/              # Business logic, helpers & API services
│   └── types/            # TypeScript interface & type definitions
├── assets/               # Branding, images, and fonts
└── app.json              # Expo application configuration
```

---

## 📱 Screenshots

| Dashboard | Loan List | Add Payment |
| :---: | :---: | :---: |
| ![Dashboard](https://via.placeholder.com/200x400/09090b/ffffff?text=Dashboard) | ![Loan List](https://via.placeholder.com/200x400/09090b/ffffff?text=Loan+Tracking) | ![Add Payment](https://via.placeholder.com/200x400/09090b/ffffff?text=Payment+Entry) |

---

## 🎯 Roadmap

- [ ] Export reports to PDF/CSV
- [ ] Multi-currency support
- [ ] Offline-first sync capability
- [ ] Biometric authentication (FaceID/Fingerprint)
- [ ] Push Notifications for overdue payments

---

## 📄 License

This project is licensed under the MIT License - see the `LICENSE` file for details.

---

### Developed by **Kavindu Irosha** 🚀
*Empowering financial independence through technology.*
