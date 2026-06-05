# Archive of our Books (Ao²B) — Project Memory

## Project Overview
Archive of our Books (Ao²B) is a premium, book-focused social media platform designed for high-fidelity book tracking and visual reviews.

---

## 🎨 Branding & Terminology
- **Global Logo**: $Ao^2B$ (AO3-inspired, left-aligned, serif high-contrast). The superscript 2 represents "of our".
- **Terminology**: Content published by users is called a "Post" (formerly known as 'Photo Post').

---

## 🛠 Tech Stack
- **Framework**: Next.js 16.2 (App Router)
- **Styling**: Vanilla CSS + Tailwind Utility Classes
- **Rich Text**: TipTap Editor
- **Icons**: Lucide React
- **Charts**: Chart.js (Radar Charts for book aesthetics)
- **Backend/Auth**: Supabase (PostgreSQL + Auth)
- **APIs**: 
  - Google Books API (Search & Metadata)
  - NYT Books API (Trending Lists)

---

## ✨ Key Features (Frontend Phase)
- **Unified Post Creator**: Support for visual posts and "Deep Reviews" with aesthetic rating sliders.
- **Smart Book Covers**: Cascading fallback logic (Zoom 3 → 2 → 1) to ensure high-resolution covers from Google API.
- **Rich Text Editing**: Captions with bold, italic, underline, and emoji support.
- **Dynamic Profile**: Instagram-inspired grid with hover stats and aggregate reading mood charts.
- **Library Management**: Status tracking (TBR, Reading, Finished) with reading progress markers.

---

## 🔐 Authentication & Backend (Supabase — v5, 2026-06)
- **Auth Provider**: Supabase Auth (`@supabase/supabase-js` v2.106.2)
- **API Key Format**: New `sb_publishable_...` key (not legacy JWT anon key)
- **Client**: `src/utils/supabaseClient.ts` — reads `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `.env.local`
- **Session Management**: `supabase.auth.onAuthStateChange` listener in `ReviewContext.tsx` drives `session` state globally
- **Profile Table** (`public.profiles`):
  | Column | Type | Notes |
  |---|---|---|
  | `id` | `uuid` | FK → `auth.users.id` |
  | `username` | `text` | Derived from email prefix on signup |
  | `display_name` | `text` | Display name shown in UI |
  | `bio` | `text` | User bio |
  | `personal_link` | `text` | External link |
  | `avatar_url` | `text` | URL/dataURL for avatar |
  | `currently_reading_fav` | `jsonb` | `{ title, author, coverUrl }` |
  | `all_time_fav` | `jsonb` | `{ title, author, coverUrl }` |
- **Signup Flow** (`profile/page.tsx` → `handleAuthSubmit`): 
  1. `supabase.auth.signUp()` 
  2. Insert minimal `{ id, username: "", display_name: "" }` row immediately
  3. Upsert enriched defaults (email-derived display name, default bio)
  4. `onConflict: "id"` prevents duplicate-row errors on email-confirm retries
- **Login Flow** (`ReviewContext.tsx` → `fetchProfile`):
  1. Session fires `onAuthStateChange`
  2. Fetch `profiles` row for `session.user.id`
  3. `PGRST116` (no row) → upsert defaults silently
  4. Row found → map all columns to `userProfile` state (replaces all hardcoded mock data)
- **TypeScript Build Fix** (2026-06-05): Split `useReviews()` destructure in `profile/page.tsx` so `library` is declared as a standalone `const` before any `useMemo` references it — resolves Vercel build error "Block-scoped variable 'library' used before its declaration"

---

## 🚀 Deployment & Hosting
- **Status**: Auth-integrated build passing. Deployed on Vercel.
- **Hosting**: Vercel
- **Demo URL**: [To be added by user]
- **Env Vars Required**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY`, `NEXT_PUBLIC_NYT_API_KEY`

---

## 🗺 Future Roadmap (Backend Phase)
- **Persistent Library & Posts**: Save `LibraryItem[]` and `Post[]` to Supabase tables per user.
- **Social**: Real-time likes, follows, and global feed.
- **AI Integration**: Living "Librarian" AI using actual library data for recommendations.
- **Settings Persistence**: Save `SettingsModal` changes to the `profiles` table.
