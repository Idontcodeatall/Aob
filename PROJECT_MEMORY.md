# PROJECT_MEMORY.md — Archive of Our Books (Ao²B)

> **Last Updated:** 2026-06-20 (v9 — Montag AI Librarian, Library Persistence, Settings Sync)
> **Maintained By:** Lead Technical Architect
> **Purpose:** Living document capturing every feature, its business logic, technical stack, data schema, and the design rationale. A future developer should be able to read this file and understand *what* was built, *why*, and *in what order*.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technical Foundation](#2-technical-foundation)
3. [Design System & Why Log](#3-design-system--why-log)
4. [Implementation Order](#4-implementation-order)
5. [Feature Registry](#5-feature-registry)
   - 5.1 Global Data Layer (ReviewContext)
   - 5.2 Analytics Engine
   - 5.3 Sidebar Navigation & Mobile Navigation
   - 5.4 Home Feed
   - 5.5 My Library Grid
   - 5.6 Deep Review Creator
   - 5.7 Profile Analytics Dashboard
   - 5.8 Browse Discovery Engine
   - 5.9 Media Handling Layer
   - 5.10 Settings Modal
   - 5.11 Ao²B Logo Component
   - 5.12 BookCover Smart Component
   - 5.13 Story Viewer
   - 5.14 Mobile Header
   - 5.15 Montag AI Librarian API
6. [Data Schema Reference](#6-data-schema-reference)
7. [API Reference](#7-api-reference)
8. [Key Architectural Decisions](#8-key-architectural-decisions)
9. [Dead Code & Vestigial Artifacts](#9-dead-code--vestigial-artifacts)
10. [Open Issues & Future Work](#10-open-issues--future-work)

---

## 1. Project Overview

**App Name:** Archive of our Books (Ao²B)
**Tagline:** A mobile-first web app for book lovers
**Logo:** `Ao²B` — AO3-inspired monogram, left-aligned, serif high-contrast. The superscript `2` represents "of our".
**Terminology:** Content published by users is called a **Post** (formerly "Photo Post").
**Vision:** An Instagram-meets-Goodreads social platform where readers discover, review, and curate books with premium, data-driven analytics, powered by a real AI librarian named Montag.

**Core Pillars:**
- **Social-first feed** — Visual posts, deep reviews, and finished-book announcements in an interleaved timeline.
- **Data-driven reading identity** — Genre doughnuts, radar charts, and reading challenge tracking give users a quantified reading persona.
- **AI-assisted discovery** — Montag, a personal AI librarian powered by Claude (Anthropic) and the user's own Supabase library data, recommends books contextually via a streaming chat interface.

---

## 2. Technical Foundation

### Framework & Runtime
| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.1 |
| Language | TypeScript | ^5 |
| React | React 19 | 19.2.4 |
| Bundler | Turbopack | 2.x (built-in) |

### Styling
| Tool | Version | Notes |
|---|---|---|
| Tailwind CSS | v4 | Using `@import "tailwindcss"` + `@theme` block for custom tokens |
| PostCSS Plugin | @tailwindcss/postcss v4 | |
| Google Fonts | Inter (sans), Playfair Display (serif) | Loaded via `next/font/google` with CSS variable injection |

### UI & Animation
| Library | Version | Usage |
|---|---|---|
| Framer Motion | ^12.38.0 | Page transitions (AnimatePresence), layout animations, spring-based tab underlines, modal enter/exit, double-tap heart |
| Lucide React | ^1.6.0 | Full icon library — Heart, BookOpen, Star, Compass, Bot, Sparkles, etc. |

### Data Visualization
| Library | Version | Usage |
|---|---|---|
| Chart.js | ^4.5.1 | Core renderer for Radar and Doughnut charts |
| react-chartjs-2 | ^5.3.1 | React bindings for Chart.js |

### Rich Text
| Library | Version | Usage |
|---|---|---|
| @tiptap/react | ^3.22.3 | Core TipTap editor |
| @tiptap/starter-kit | ^3.22.3 | Bold, italic, lists, etc. |
| @tiptap/extension-underline | ^3.22.3 | Underline formatting |
| @tiptap/extension-subscript | ^3.22.3 | Sub formatting |
| @tiptap/extension-superscript | ^3.22.3 | Superscript formatting |
| react-markdown | ^10.1.0 | Renders saved review HTML in feed |

### AI
| Library | Version | Usage |
|---|---|---|
| @anthropic-ai/sdk | ^0.104.1 | Powers the Montag AI Librarian via streaming API route |

### External APIs & Backend
| API/Service | Purpose | Key Constants |
|---|---|---|
| Google Books API | Book search on Browse page and in Settings | maxResults=20, endpoint: googleapis.com/books/v1/volumes |
| NYT Books API | Trending / bestseller lists | Lists: hardcover-fiction, hardcover-nonfiction |
| Open Library Covers | Fallback cover images via ISBN | Pattern: covers.openlibrary.org/b/isbn/{ISBN}-L.jpg |
| **Supabase** | Auth + PostgreSQL database | Project: uskmwaoqrezevpghxgwm.supabase.co; Client: @supabase/supabase-js v2.106.2 |
| **Anthropic Claude** | Montag AI Librarian — streaming book recommendations | Model: claude-sonnet-4-5; routed via /api/librarian |

---

## 3. Design System & Why Log

### Brand Tokens (defined in `globals.css` → `@theme`)

| Token | Value | Rationale |
|---|---|---|
| `--color-brand-bg` | `#121212` | Near-black background for premium dark-mode feel |
| `--color-brand-accent` | `#800000` | **Maroon** — literary sophistication; evokes old leather-bound books and academic gravitas |
| `--color-brand-text` | `#E5E5E5` | Warm off-white for readability against dark bg |
| `--font-sans` | Inter | Clean, modern sans-serif for UI elements |
| `--font-serif` | Playfair Display | Literary elegance for headings, book titles, author names |

### Key UI Decisions

| Decision | Rationale |
|---|---|
| **4:5 aspect ratio** for Visual posts | Instagram-standard portrait ratio |
| **2:3 aspect ratio** for book cover cards | Standard book cover proportions |
| **1:1 aspect ratio** for Profile visual post grid | Instagram profile grid convention |
| **Sidebar + Bottom Navigation** | Sidebar collapses to 64px on desktop; bottom nav on mobile (<768px) |
| **Double-tap heart animation** | Instagram muscle-memory. Maroon heart, 800ms duration |
| **Interleaved feed** | 1 Visual post after every 2 Deep Reviews |
| **Glowing progress bar** on Library | box-shadow: 0 0 8px rgba(128, 0, 0, 0.6) |
| **Cascading cover zoom** (zoom=3→2→1) | BookCover attempts highest resolution first and gracefully degrades |
| **Genre-specific color palette** | Sci-Fi: Indigo, Fantasy: Violet, Literary Fiction: Pink, Non-Fiction: Teal, etc. |
| **Montag persona** for AI Librarian | Named after Guy Montag from Fahrenheit 451. Wit is a first-class design requirement. |

---

## 4. Implementation Order

| # | Feature | Key Files | Approx. Date |
|---|---|---|---|
| 1 | **Project Scaffolding** | package.json, layout.tsx, globals.css | 2026-03-25 |
| 2 | **Design System & Token Layer** | globals.css, Google Fonts | 2026-03-25 |
| 3 | **Sidebar Navigation** | components/Navigation.tsx | 2026-03-25 |
| 4 | **Global Data Layer (ReviewContext)** | lib/ReviewContext.tsx | 2026-03-25 |
| 5 | **Home Feed — Deep Review + Social Posts** | components/Feed.tsx | 2026-03-25 |
| 6 | **Search-to-Review Workflow (Browse v1)** | app/browse/page.tsx | 2026-03-25 |
| 7 | **Deep Review Creator** | app/post/review/page.tsx | 2026-03-25 |
| 8 | **Analytics Engine** | lib/analytics.ts | 2026-03-25 |
| 9 | **Profile Analytics Dashboard (v1)** | app/profile/page.tsx | 2026-03-26 |
| 10 | **Library Management (v1)** | app/library/page.tsx | 2026-03-26 |
| 11 | **Currently Reading Widget** | components/CurrentlyReading.tsx | 2026-03-26 |
| 12 | **Stories Line** | components/StoriesLine.tsx | 2026-03-26 |
| 13 | **Visual Posts (Instagram-style)** | components/Feed.tsx | 2026-03-26 |
| 14 | **Browse — Dynamic Trending Feed (NYT API)** | app/browse/page.tsx | 2026-03-30 |
| 15 | **Browse — AI Librarian Chat Bar (mock)** | app/browse/page.tsx | 2026-03-30 |
| 16 | **Library Redesign — Premium Grid** | app/library/page.tsx | 2026-04-01 |
| 17 | **Profile Redesign — Social Header** | app/profile/page.tsx | 2026-04-01 |
| 18 | **Profile — Visual Post Grid** | app/profile/page.tsx | 2026-04-01 |
| 19 | **Feed Interleaving Logic** | lib/ReviewContext.tsx | 2026-04-01 |
| 20 | **Media Uploader Component** | components/MediaUploader.tsx | 2026-04-04 |
| 21 | **New Photo Post Page** | app/post/photo/page.tsx | 2026-04-04 |
| 22 | **Story Canvas Page** | app/post/story/page.tsx | 2026-04-04 |
| 23 | **Smart Book Title Search** | app/post/review/page.tsx, hooks/useDebounce.ts | 2026-04-04 |
| 24 | **Unified Post Refactor — Feed** | components/Feed.tsx | 2026-04-13 |
| 25 | **UserProfile & Settings Modal** | lib/ReviewContext.tsx, components/SettingsModal.tsx, components/AppShell.tsx | 2026-04-13 |
| 26 | **Profile Grid Refactor** | app/profile/page.tsx | 2026-04-13 |
| 27 | **Library Review-Aware Hover** | app/library/page.tsx | 2026-04-13 |
| 28 | **Story Editor Color Picker** | app/create/story/page.tsx, app/post/story/page.tsx | 2026-04-13 |
| 29 | **Rich Text Editor v2 (TipTap)** | components/RichTextEditor.tsx | 2026-04-14 |
| 30 | **Workflow Polish & HTML Fixes** | app/post/review/page.tsx, components/Feed.tsx | 2026-04-14 |
| 31 | **Search & Resolution Polish** | lib/utils.ts, app/browse/page.tsx | 2026-04-14 |
| 32 | **Mobile Responsive Bottom Nav** | components/MobileNavBar.tsx, components/MobileHeader.tsx | 2026-05-01 |
| 33 | **Supabase Auth Integration** | utils/supabaseClient.ts, lib/ReviewContext.tsx, app/profile/page.tsx | 2026-06-04 |
| 34 | **Profile DB Sync** | lib/ReviewContext.tsx — hydrate userProfile from profiles table on login | 2026-06-05 |
| 35 | **`author: string` Refactor** | lib/ReviewContext.tsx and all consumers — matches library.author (text) Supabase column | 2026-06-06 |
| 36 | **Library DB Persistence** | lib/ReviewContext.tsx — fetch user library rows from Supabase on login; browse/page.tsx — Supabase insert + optimistic update | 2026-06-06 |
| 37 | **Remove from Library** | lib/ReviewContext.tsx (removeFromLibrary), app/library/page.tsx — trash icon + Supabase delete | 2026-06-06 |
| 38 | **Settings Persistence** | components/SettingsModal.tsx — handleSave writes all fields to Supabase profiles table when session is active | 2026-06-07 |
| 39 | **Ao²B Logo Component** | components/Logo.tsx — custom serif monogram with superscript 2 and collapsible mode | 2026-06-07 |
| 40 | **BookCover Smart Component** | components/BookCover.tsx — cascading zoom=3 to 2 to 1 fallback with placeholder | 2026-06-07 |
| 41 | **Story Viewer** | components/StoryViewer.tsx — full-screen story playback with progress bars, auto-advance | 2026-06-07 |
| 42 | **Montag AI Librarian API** | app/api/librarian/route.ts — real Anthropic streaming endpoint replacing mock; JWT auth; reader context from Supabase | 2026-06-20 |
| 43 | **`updateLibraryItem`** | lib/ReviewContext.tsx — general-purpose partial updater for library items | 2026-06-20 |

---

## 5. Feature Registry

### 5.1 Global Data Layer — ReviewContext

**File:** `src/lib/ReviewContext.tsx`
**Business Logic:** Single source of truth for all application state. React Context + useState. On Supabase auth session start, fetches profiles and library tables to hydrate local state.

**Key Exports:**
- `ReviewProvider` — wraps the app in layout.tsx
- `useReviews()` — hook exposing the full ReviewContextType

**Context Shape (ReviewContextType):**

```typescript
type ReviewContextType = {
  posts: Post[];
  addPost: (post: Post) => void;
  library: LibraryItem[];
  addToLibrary: (item: LibraryItem) => void;
  removeFromLibrary: (id: string) => void;         // Optimistic + Supabase delete
  updateLibraryItem: (id: string, updates: Partial<LibraryItem>) => void;
  updateLibraryProgress: (id: string, pagesRead: number) => void;
  readingChallenge: { target: number; setTarget: (n: number) => void };
  stories: Story[];
  addStory: (story: Story) => void;
  userProfile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  session: Session | null;
  authLoading: boolean;
  signOut: () => Promise<void>;
};
```

**Auth + Data Lifecycle:**
1. `supabase.auth.getSession()` resolves on mount — sets session, clears authLoading
2. `onAuthStateChange` keeps session in sync
3. `useEffect([session])` — fetches profiles row — hydrates userProfile
4. `useEffect([session?.user?.id])` — fetches all library rows for the user — replaces seed data
5. On logout — resets to mock seed state

**Design Decisions:**
- `author: string` (not `authors: string[]`) — matches the Supabase library.author (text) column exactly
- `addToLibrary` performs upsert — if a book with the same id exists, it updates rather than duplicates
- Library `id` = Google Books volume ID string (= book_id in Supabase); Supabase library.id is auto-increment int8
- Profile fetch handles PGRST116 (no row) separately from real DB errors; upserts with onConflict: "id"
- Seed data only shown to unauthenticated users; real DB data replaces it on login

**Seed Data (unauthenticated):** 2 initial posts, 7 library items (1 Reading, 6 Finished), 6 seed reviews, 4 Visual posts

---

### 5.2 Analytics Engine

**File:** `src/lib/analytics.ts`

| Function | Input | Output | Purpose |
|---|---|---|---|
| `getGenreFrequency` | LibraryItem[] (finished books) | GenreFrequency[] sorted desc | Powers the Doughnut chart |
| `getAggregateRadar` | Post[] (reviews with ratings) | AggregateRadar (5-axis averages) | Powers the Radar chart |
| `getChallengeStatus` | finishedCount, target | string status message | Day-of-year pacing calculation |

**Dual-Schema Rating System:**
- **Fiction:** Pacing, Characters, Plot, Prose, Vibe
- **Non-Fiction:** Pacing, Persona, Insight, Prose, Vibe
- Stored internally as pacing, metricTwo, metricThree, prose, vibe

---

### 5.3 Sidebar Navigation & Mobile Navigation

**Files:** `src/components/Navigation.tsx`, `src/components/MobileNavBar.tsx`, `src/components/MobileHeader.tsx`

**Desktop Sidebar (Navigation.tsx):**
- Sticky, full-height, collapses between 256px (expanded) and 64px (icon-only) via Framer Motion
- Contains Logo component (collapsed/expanded state passed as prop)
- "Create" button opens a flyout submenu; Settings button opens SettingsModal globally
- Hidden on mobile (hidden md:flex)

**Routes:**
| Label | Path | Icon |
|---|---|---|
| Home | `/` | Home |
| My Library | `/library` | Library |
| Browse with Librarian | `/browse` | Compass |
| Profile | `/profile` | User |
| Settings | (Modal) | Settings |

**Create Menu Options:** New Post (/post/photo), Add to Story (/create/story), Write Deep Review (/post/review)

**Mobile Bottom Nav (MobileNavBar.tsx):**
- Fixed bottom bar, visible only on < md
- 5 tabs: Home, Browse, Create (center + button), Library, Profile
- Active route highlighted with text-brand-accent
- iOS safe-area inset: h-[env(safe-area-inset-bottom)]

**Mobile Header (MobileHeader.tsx):**
- Sticky top bar, visible only on < md, hidden on /profile and /post/* routes
- Context-aware right side: Home → currently-reading title, Browse → "BROWSE" label, Library → finished count

---

### 5.4 Home Feed

**Files:** `src/app/page.tsx`, `src/components/Feed.tsx`, `src/components/CurrentlyReading.tsx`, `src/components/StoriesLine.tsx`

**Layout (top to bottom):**
1. **Currently Reading** — first status === "Reading" book; inline page-number input for quick progress updates
2. **Stories Line** — horizontally scrolling avatar circles; 12 mock users; unread ring every 3rd; tapping opens StoryViewer
3. **Feed** — UnifiedPostCard for all post types:
   - "Visual" — user-uploaded imageUrl as hero
   - "DeepReview" — coverUrl as hero with radar overlay, star rating pill, green-bracket quote
   - "Social" — coverUrl as hero with gradient showing book title + author + stars

**Interaction States:** Like (toggle heart fill #800000), Save (toggle bookmark), double-tap heart overlay (800ms), caption expand at 120 chars

---

### 5.5 My Library Grid

**File:** `src/app/library/page.tsx`

**Tab System:** ["TBR", "Reading", "Finished", "DNF"] — count badges, animated underline via layoutId="library-tab-underline"

**BookCard Component:**
- 2:3 aspect ratio via BookCover component (cascading zoom fallback)
- Hover overlay: Update Progress, Write Review, Favorite, **Remove/Trash**
- Reading items: floating stats overlay + glowing bottom progress bar
- Framer Motion layout animation for smooth reordering

**Remove from Library:**
- Optimistic: removeFromLibrary(id) fires immediately
- Async Supabase delete: .delete().eq('book_id', id).eq('user_id', session.user.id)
- Errors go to console.error only

**Empty States:** Each tab has a contextual icon, title, and witty subtext

---

### 5.6 Deep Review Creator

**File:** `src/app/post/review/page.tsx`
**Depends on:** `src/hooks/useDebounce.ts`

**Layout:** 12-column grid — 7 cols for form, 5 cols for sticky live preview

**Smart Book Title Search:**
- Debounced input (400ms); fires when input >= 3 chars
- Dropdown: top 5 results with cover thumbnail, title, author, categories
- Auto-fills Author, Fiction/Non-Fiction, cover
- Cancelled fetch guard prevents stale overwrites

**Form Sections:**
1. Book Details — Title (smart search), Author, Fiction/Non-Fiction toggle
2. General Rating — 1-5 star selector
3. Deep Analysis — 5 range sliders (1-5) with tooltip definitions
4. The Essay — TipTap Rich Text Editor (Bold, Italic, Underline, Strikethrough, Sub/Superscript, lists, emoji picker)
5. Flexible Media — toggle between API cover and custom upload via MediaUploader

**Live Preview Card:** 4:5 aspect ratio, blurred cover background, live-updating Radar chart, SVG noise texture at 20% opacity

---

### 5.7 Profile Analytics Dashboard

**File:** `src/app/profile/page.tsx`

**Auth Flow:**
- Unauthenticated — sign-in/sign-up form
- On signup: inserts minimal profiles row, upserts enriched defaults
- On login: ReviewContext fetches profiles row — hydrates userProfile immediately
- Sign-out — resets to mock/seed state

**Header Section:** 128px avatar circle, Name + Edit Profile button (opens SettingsModal), Stats row (Finished, Review count, Followers, Following), Bio, external link, compact Reading Challenge widget

**Analytics Section (12-col grid):**
| Column | Component | Chart |
|---|---|---|
| Left (5 cols) | Genre Profile | Doughnut — 65% cutout, centered book count |
| Right (7 cols) | Reading Moods | Radar — 5-axis, white border + maroon fill, interactive tooltip labels |

**Visual Post Grid:** 3-column square grid; Type-aware hover: Photo posts — Star Rating only; DeepReview — Mini Radar + Star Rating

---

### 5.8 Browse Discovery Engine

**File:** `src/app/browse/page.tsx`

**View States:** "trending" | "search" | "ai" — AnimatePresence transitions

**Mode 1: Trending Now**
- NYT Books API: hardcover-fiction + hardcover-nonfiction via Promise.all, shuffled
- Cover: NYT book_image → fallback Open Library via ISBN
- Genre pills: ["All", "Fiction", "Non-Fiction"]

**Mode 2: Search**
- Google Books API — maxResults=20; triggered on form submit

**Mode 3: AI Librarian (Montag)**
- Fixed bottom chat bar with Bot icon, maroon glow on focus
- **Powered by real /api/librarian** — Anthropic Claude streaming responses
- Chat history maintained in component state
- Responses stream token-by-token into the UI
- Sends user's JWT as Authorization: Bearer <token>

**Book Detail Modal:**
- Triggered on any book card click
- Action buttons: Start Deep Review → /post/review?title=...&author=...&cover=...&categories=...
- Library quick-add (TBR / Reading / Finished / DNF):
  - Optimistic addToLibrary + Supabase upsert using book_id as conflict key
  - Button shows "..." during insert, "checkmark Added" on success, rolls back if insert fails

---

### 5.9 Media Handling Layer

**Files:** `src/components/MediaUploader.tsx`, `src/app/post/photo/page.tsx`, `src/app/post/story/page.tsx`, `src/app/create/story/page.tsx`

**MediaUploader:** Dual hidden file input (gallery + camera), drag-and-drop, returns dataURL via onImageSelect callback

**Photo Post (/post/photo):** Upload → Compose (caption, optional book quote with green bracket accent, book attribution) → addPost → /

**Story Canvas (/post/story and /create/story):**
- HTML5 Canvas editor (9:16)
- Move, Text, and Markup (freehand brush) tools
- Full-spectrum color picker for Draw and Text
- Touch events handled for mobile

---

### 5.10 Settings Modal

**Files:** `src/components/SettingsModal.tsx`, `src/components/AppShell.tsx`

**Modal Fields:**
| Field | Type | Notes |
|---|---|---|
| Avatar | File upload + circle preview | Stores as dataURL |
| Display Name | Text input | Auto-computes initials |
| Bio | Textarea (max 150 chars) | Live character counter |
| Favourite Genres | Text input | Comma-separated; stored as text[] in Supabase |
| Personal Link | URL input | |
| Currently Reading | Google Books search (debounced 600ms) | Stores { title, author, coverUrl } |
| All-Time Favourite | Google Books search (debounced 600ms) | Same UX |
| Yearly Reading Goal | Number input | Updates readingChallenge.target |
| Public Profile | Toggle switch | Controls is_public in Supabase |

**Persistence (handleSave):**
- When session is active: writes all fields to Supabase profiles table via .update() BEFORE updating context
- Shows "Saving..." spinner during async write
- Sign Out button visible only when session is active

---

### 5.11 Ao²B Logo Component

**File:** `src/components/Logo.tsx`

- Custom serif monogram: A + italic maroon o with bold superscript 2 + B
- Accepts collapsed?: boolean prop — smaller font sizes when sidebar is collapsed; hides "ARCHIVE OF OUR BOOKS" subtext
- Link wraps to /

---

### 5.12 BookCover Smart Component

**File:** `src/components/BookCover.tsx`

- Attempts zoom=3 (highest resolution) first via getHighResCover(url, 3)
- On error, cascades to zoom=2, then zoom=1
- If all fail, shows a placeholder with ImageIcon and the book title
- aspectRatio prop (default "aspect-[2/3]") for flexible usage
- Used in Library cards, Browse cards, Settings Modal book search results

---

### 5.13 Story Viewer

**File:** `src/components/StoryViewer.tsx`

- Full-screen overlay (z-[110], fixed inset-0)
- Auto-advances through stories at 5s intervals with animated progress bars
- Left/right tap regions for manual navigation (mobile); ChevronLeft/Right buttons on desktop
- AnimatePresence + motion.img for slide transitions
- Displays author avatar (initial letter), name, timestamp
- Triggered from StoriesLine when user taps a story avatar

---

### 5.14 Mobile Header

**File:** `src/components/MobileHeader.tsx`

- Sticky top bar (md:hidden)
- Suppressed on /profile and /post/* routes
- Shows Logo (expanded) on the left; context-aware right side per route

---

### 5.15 Montag AI Librarian API

**File:** `src/app/api/librarian/route.ts`

**Overview:** A Next.js POST route that powers the AI Librarian chat in Browse mode. Uses Anthropic Claude with a carefully crafted system prompt, real user library context from Supabase, and server-sent event streaming.

**Authentication:**
- Reads Authorization: Bearer <token> header
- Decodes the JWT payload locally (base64url → JSON → sub claim) — no extra network call
- Builds a Supabase client with the user's JWT forwarded — RLS enforces ownership automatically

**Context Building (buildContextString):**
- Fetches profiles (favourite genres, all-time fav, yearly reading goal) and library (all books with status + rating) in parallel
- Distils into a [READER CONTEXT] block prepended to each user message
- Context is invisible to the user — Montag uses it but never references it explicitly

**Montag Persona:**
- Named after Guy Montag from Fahrenheit 451
- Witty, intellectually sharp, no filler phrases
- Does not say "I loved this" — analyses and recommends without personal affect
- Stays strictly within the world of books and reading
- Uses claude-sonnet-4-5, max_tokens 1024, streaming

**Streaming:**
- Anthropic SDK messages.stream() piped to ReadableStream returned as text/event-stream
- Browse page reads the stream incrementally and appends tokens in real-time

---

## 6. Data Schema Reference

### Post (Feed Item)
```typescript
type Post = {
  id: string;
  type: "DeepReview" | "Social" | "Visual";
  author: string;
  authorInitials: string;
  timeAgo: string;
  bookTitle: string;
  bookAuthor: string;
  content: string;
  coverUrl?: string;
  customCoverUrl?: string;   // User-uploaded photo for Deep Reviews
  ratings?: {
    pacing: number;          // 1-5
    metricTwo: number;       // Characters (Fiction) or Persona (Non-Fiction)
    metricThree: number;     // Plot (Fiction) or Insight (Non-Fiction)
    prose: number;
    vibe: number;
  };
  isFiction?: boolean;
  generalRating?: number;    // 1-5 stars
  location?: string;
  imageUrl?: string;
  likeCount?: number;
  likesCount?: number;
  commentsCount?: number;
  overlayQuote?: string;
};
```

### LibraryItem (v9)
```typescript
type LibraryItem = {
  id: string;           // Google Books volume ID (= book_id in Supabase)
  title: string;
  author: string;       // Single string — matches Supabase library.author (text)
  thumbnail?: string;
  status: "TBR" | "Reading" | "Finished" | "DNF";
  totalPages: number;
  pagesRead: number;
  genres?: string[];
  rating?: number;
  reviewText?: string;
  favoriteQuote?: string;
  rPacing?: number;
  rVibe?: number;
  rProse?: number;
  rPlotInsight?: number;
  rCharPersona?: number;
  bookType?: string;
  userImageUrl?: string;
};
```

### UserProfile
```typescript
type UserProfile = {
  displayName: string;
  initials: string;          // Auto-computed from displayName
  bio: string;
  favGenres?: string[];
  avatarUrl?: string;        // dataURL from file upload
  personalLink: string;
  currentlyReadingFav?: { title: string; author: string; coverUrl: string };
  allTimeFav?: { title: string; author: string; coverUrl: string };
  isPublic?: boolean;
};
```

### Story
```typescript
type Story = {
  id: string;
  imageUrl: string;
  timestamp: string;
  author: string;
};
```

### public.profiles (Supabase — canonical truth)

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, FK → auth.users.id on delete cascade |
| updated_at | timestamptz | |
| username | text | Auto-generated on signup |
| display_name | text | |
| bio | varchar | |
| avatar_url | text | |
| fav_genres | text[] | Comma-split in UI, stored as array |
| all_time_fav_book | jsonb | { title, author, coverUrl } |
| curr_reading_info | jsonb | { title, author, coverUrl } |
| yearly_chall_goal | int4 | |
| yearly_chall_curr | int4 | |
| is_public | bool | Controlled by Settings toggle |
| personal_link | text | |

### public.library (Supabase — canonical truth)

| Column | Type | Notes |
|---|---|---|
| id | int8 | Auto-increment PK (DB-generated, never used by app) |
| user_id | uuid | FK → auth.users.id |
| book_id | text | Google Books volume ID — used for upsert conflicts and deletes |
| title | text | |
| author | text | Single string (not array) |
| cover_url | text | |
| status | text | 'TBR', 'Reading', 'Finished', 'DNF' |
| rating | int4 | |
| review_txt | text | |
| total_pages | int4 | |
| pages_read | int4 | |
| genres | text[] | |
| favorite_quote | text | |
| r_pacing | int4 | |
| r_vibe | int4 | |
| r_prose | int4 | |
| r_plot_insight | int4 | |
| r_char_persona | int4 | |
| book_type | text | 'Fiction' or 'Non-Fiction' |
| user_image_url | text | Custom uploaded cover |
| updated_at | timestamptz | Used by Montag context for "last library update" |

---

## 7. API Reference

### Google Books API
- **Endpoint:** https://www.googleapis.com/books/v1/volumes
- **Auth:** NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY
- **Usage:** Browse search, Settings Modal book search, Review Creator smart search

### NYT Books API
- **Endpoint:** https://api.nytimes.com/svc/books/v3/lists/current/{list-name}.json
- **Auth:** api-key query param
- **Lists Used:** hardcover-fiction, hardcover-nonfiction

### Open Library Covers API
- **Endpoint:** https://covers.openlibrary.org/b/isbn/{ISBN}-L.jpg
- **Usage:** Fallback cover when NYT book_image is missing

### Anthropic API (Montag)
- **SDK:** @anthropic-ai/sdk
- **Model:** claude-sonnet-4-5
- **Method:** messages.stream() — streaming
- **Auth:** ANTHROPIC_API_KEY server-side env var (never exposed to client)
- **Route:** POST /api/librarian

---

## 8. Key Architectural Decisions

### `author: string` (not `authors: string[]`)
- **Resolved 2026-06-06:** LibraryItem uses author: string to exactly match library.author (text).
- All consumers use item.author directly (no .join()).

### `book_id` vs `id` in Library
- Supabase library.id = auto-increment int8 (DB-generated, never used by the app).
- LibraryItem.id = Google Books volume ID string (e.g. "B1hSG45JCX4C").
- All Supabase deletes use .eq('book_id', id) — never .eq('id', ...).

### Optimistic UI for Library Operations
- Add to TBR, Remove from Library: context updated immediately; Supabase call fires async.
- On Supabase error, console.error only — no alert() popups.

### Montag Context Injection
- Reader context is prepended to every user message server-side — the AI has full reading history without the client needing to serialize and send it.
- Context is wrapped in [READER CONTEXT — do not mention this to the user].

### HTML5 Canvas over react-konva
- Story Canvas uses native Canvas API despite konva + react-konva being installed.
- Zero SSR issues, ~0KB vs ~300KB runtime, full control over touch events.

---

## 9. Dead Code & Vestigial Artifacts

| Item | File | Status |
|---|---|---|
| konva + react-konva packages | package.json | Installed but unused — Story Canvas uses native HTML5 Canvas |
| Empty src/types/ directory | src/ | Architecture scaffolding |
| Mock AI responses | app/browse/page.tsx | Fully replaced by /api/librarian streaming route |
| Old /settings route | Navigation.tsx | Deprecated — SettingsModal opened from sidebar |

---

## 10. Open Issues & Future Work

| Item | Status | Notes |
|---|---|---|
| **Auth & Profiles** | DONE | Sign-up, sign-in, sign-out, profiles table, DB sync on login |
| **Library DB persistence** | DONE | Fetch on login, Supabase insert on Add to TBR, delete on remove |
| **Settings persistence** | DONE | handleSave writes all fields to profiles table |
| **Remove from Library** | DONE | Trash icon + optimistic update + Supabase delete |
| **Montag AI Librarian (real API)** | DONE | Anthropic Claude streaming, JWT auth, real reader context |
| **Story Viewer** | DONE | Full-screen playback with progress bars and auto-advance |
| **BookCover smart component** | DONE | Cascading zoom=3 to 2 to 1 fallback |
| **Mobile bottom nav** | DONE | MobileNavBar + MobileHeader on < 768px |
| **Post review data → Supabase** | NOT DONE | Deep Review ratings/text not persisted to library table after writing a review |
| **User-created stories in StoriesLine** | NOT DONE | Story Canvas publishes but StoriesLine shows only mock users |
| **Real-time social features** | NOT DONE | Likes, follows, global feed are mock/static |
| **yearly_chall_curr sync** | NOT DONE | Yearly challenge current count in Supabase is never written; computed from library locally |
| **Supabase Storage for avatars** | NOT DONE | Avatars stored as dataURL in profiles.avatar_url — not scalable |
| **Persistent posts** | NOT DONE | Post[] still ephemeral — next backend milestone |

---

*This document should be updated every time a feature is added, modified, or deprecated.*
