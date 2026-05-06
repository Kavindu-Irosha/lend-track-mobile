# 🚀 LendTrack Professional Setup Guide

Thank you for purchasing LendTrack! This guide will help you get your premium loan management system up and running in minutes.

## 1. Prerequisites
- **Node.js** (v18+)
- **Expo CLI** (`npm install -g expo-cli`)
- **Supabase Account** (Free tier works perfectly)

## 2. Supabase Configuration
LendTrack uses Supabase as a secure, real-time backend.

1.  Create a new project at [supabase.com](https://supabase.com).
2.  Go to the **SQL Editor** in your Supabase dashboard.
3.  Copy the contents of `schema.sql` (found in the root of this project) and run it. This will create all tables and Security Policies.
4.  Go to **Project Settings > API**.
5.  Copy your `Project URL` and `anon public` key.

## 3. Environment Variables
Create a `.env` file in the root of the project:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 4. Installation & Launch
Run the following commands in your terminal:

```bash
# Install dependencies
npm install

# Start the development server
npx expo start
```

- Press **'a'** for Android Emulator
- Press **'i'** for iOS Simulator
- Scan the QR code with the **Expo Go** app on your physical device.

## 5. Security Features
LendTrack comes with built-in biometric protection:
- **App Lock**: Enable this in Settings > Privacy.
- **Data Masking**: Sensitive info like NIC numbers are masked by default (can be toggled in code).

## 6. Customization
- **Theme**: Edit `src/context/ThemeContext.tsx` to change default colors.
- **Currency**: Change the default currency in Settings > Business within the app.

---
*For support or custom feature requests, contact the developer through Gumroad.*
