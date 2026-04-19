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

## 🚀 Deployment & Hosting
- **Status**: Frontend demo is production-ready.
- **Hosting**: Vercel
- **Demo URL**: [To be added by user]
- **Note**: This version is a **Frontend-only Demo**. Data is managed via local React context and will reset on page refresh.

---

## 🗺 Future Roadmap (Backend Phase)
- **Authentication**: User accounts via Supabase or Firebase.
- **Database**: Persistent storage for posts, reviews, and library state.
- **Social**: Real-time likes, follows, and global feed.
- **AI Integration**: Living "Librarian" AI using actual library data for recommendations.
