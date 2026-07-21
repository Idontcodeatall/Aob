"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { getHighResCover } from "./utils";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/utils/supabaseClient";

export type Post = {
  id: string;
  type: "DeepReview" | "Social" | "Visual";
  author: string;
  authorInitials: string;
  timeAgo: string;
  bookTitle: string;
  bookAuthor: string;
  content: string;
  coverUrl?: string;
  customCoverUrl?: string; // User-uploaded photo for Deep Reviews
  ratings?: {
    pacing: number;
    metricTwo: number;
    metricThree: number;
    prose: number;
    vibe: number;
  };
  isFiction?: boolean;
  generalRating?: number;
  // Visual post fields
  location?: string;
  imageUrl?: string;
  likeCount?: number;
  likesCount?: number;
  commentsCount?: number;
  overlayQuote?: string;
};

export type Story = {
  id: string;
  imageUrl: string;
  timestamp: string;
  author: string;
};

export type UserProfile = {
  displayName: string;
  initials: string;
  bio: string;
  favGenres?: string[];
  avatarUrl?: string;
  personalLink: string;
  currentlyReadingFav?: { title: string; author: string; coverUrl: string };
  allTimeFav?: { title: string; author: string; coverUrl: string };
  isPublic?: boolean;
  // DB-sourced fields
  username?: string;                // raw username column (e.g. "alice1234")
  yearlyGoalRaw?: number | null;    // null = never set; any number = set (drives empty state)
  profileComplete?: boolean;        // drives "Complete your profile" banner
};

export type LibraryStatus = "TBR" | "Reading" | "Finished" | "DNF";

export type LibraryItem = {
  id: string;          // Google Books volume ID (= book_id in Supabase)
  title: string;
  author: string;
  thumbnail?: string;
  status: LibraryStatus;
  totalPages: number;
  pagesRead: number;
  genres?: string[];
  // Review fields (persisted to Supabase library table)
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

const initialPosts: Post[] = [
  {
    id: "1",
    type: "Social",
    author: "Alice Liddell",
    authorInitials: "AL",
    timeAgo: "2 hours ago",
    bookTitle: "The Secret History",
    bookAuthor: "Donna Tartt",
    content: "Just finished my re-read. Still absolutely incredible. The pacing really picks up in Book II, but the atmosphere of those first chapters in Hampden is unmatched. Does anyone have recommendations for similar dark academia vibes?",
    generalRating: 4,
  },
  {
    id: "2",
    type: "DeepReview",
    author: "John Doe",
    authorInitials: "JD",
    timeAgo: "4 hours ago",
    bookTitle: "Hyperion",
    bookAuthor: "Dan Simmons",
    content: "The pilgrim structure works phenomenally well. By splitting the narrative into Canterbury-style tales, Simmons manages to shift genres mid-book from horror to cyberpunk to military sci-fi, all without losing the central thread of the Time Tombs. The Shrike remains one of the most terrifying entities in literature.",
    isFiction: true,
    ratings: { pacing: 5, metricTwo: 4, metricThree: 5, prose: 4, vibe: 5 },
    generalRating: 5,
  }
];

const initialLibrary: LibraryItem[] = [
  {
    id: "mock1",
    title: "Dune",
    author: "Frank Herbert",
    status: "Reading",
    totalPages: 896,
    pagesRead: 537,
    genres: ["Science Fiction"],
    thumbnail: getHighResCover("https://books.google.com/books/publisher/content?id=B1hSG45JCX4C&printsec=frontcover&img=1&zoom=1&imgtk=AFLRE71L0D1e3mK91TzQj_QxR-42eNqG"),
  },
  {
    id: "seed-f1",
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    status: "Finished",
    totalPages: 180,
    pagesRead: 180,
    genres: ["Literary Fiction"],
    thumbnail: "https://covers.openlibrary.org/b/isbn/9780743273565-L.jpg",
  },
  {
    id: "seed-f2",
    title: "Sapiens",
    author: "Yuval Noah Harari",
    status: "Finished",
    totalPages: 498,
    pagesRead: 498,
    genres: ["Non-Fiction", "History"],
    thumbnail: "https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg",
  },
  {
    id: "seed-f3",
    title: "Project Hail Mary",
    author: "Andy Weir",
    status: "Finished",
    totalPages: 476,
    pagesRead: 476,
    genres: ["Science Fiction"],
    thumbnail: "https://covers.openlibrary.org/b/isbn/9780593135204-L.jpg",
  },
  {
    id: "seed-f4",
    title: "Atomic Habits",
    author: "James Clear",
    status: "Finished",
    totalPages: 320,
    pagesRead: 320,
    genres: ["Non-Fiction", "Self-Help"],
    thumbnail: "https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg",
  },
  {
    id: "seed-f5",
    title: "The Name of the Wind",
    author: "Patrick Rothfuss",
    status: "Finished",
    totalPages: 662,
    pagesRead: 662,
    genres: ["Fantasy"],
    thumbnail: "https://covers.openlibrary.org/b/isbn/9780756404741-L.jpg",
  },
  {
    id: "seed-f6",
    title: "Thinking, Fast and Slow",
    author: "Daniel Kahneman",
    status: "Finished",
    totalPages: 499,
    pagesRead: 499,
    genres: ["Non-Fiction", "Psychology"],
    thumbnail: "https://covers.openlibrary.org/b/isbn/9780374275631-L.jpg",
  },
];

// Seed reviews that reference the finished library items
const seedReviews: Post[] = [
  {
    id: "rev-f1", type: "DeepReview", author: "Local User", authorInitials: "LU", timeAgo: "3 days ago",
    bookTitle: "The Great Gatsby", bookAuthor: "F. Scott Fitzgerald", isFiction: true,
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780743273565-L.jpg",
    content: "A masterclass in unreliable narration. Fitzgerald's prose is economical yet devastatingly beautiful.",
    ratings: { pacing: 4, metricTwo: 5, metricThree: 4, prose: 5, vibe: 5 }, generalRating: 5,
  },
  {
    id: "rev-f2", type: "DeepReview", author: "Local User", authorInitials: "LU", timeAgo: "5 days ago",
    bookTitle: "Sapiens", bookAuthor: "Yuval Noah Harari", isFiction: false,
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg",
    content: "Broad strokes that reshape how you think about human civilisation. Occasionally oversimplifies but the sheer ambition is commendable.",
    ratings: { pacing: 3, metricTwo: 4, metricThree: 5, prose: 3, vibe: 4 }, generalRating: 4,
  },
  {
    id: "rev-f3", type: "DeepReview", author: "Local User", authorInitials: "LU", timeAgo: "1 week ago",
    bookTitle: "Project Hail Mary", bookAuthor: "Andy Weir", isFiction: true,
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780593135204-L.jpg",
    content: "Relentlessly fun. The science is fascinating and Ryland Grace is the perfect lovable nerd protagonist.",
    ratings: { pacing: 5, metricTwo: 4, metricThree: 4, prose: 3, vibe: 5 }, generalRating: 4,
  },
  {
    id: "rev-f4", type: "DeepReview", author: "Local User", authorInitials: "LU", timeAgo: "2 weeks ago",
    bookTitle: "Atomic Habits", bookAuthor: "James Clear", isFiction: false,
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg",
    content: "Incredibly actionable. The 1% improvement framework is simple but the examples make it stick.",
    ratings: { pacing: 4, metricTwo: 3, metricThree: 5, prose: 4, vibe: 3 }, generalRating: 4,
  },
  {
    id: "rev-f5", type: "DeepReview", author: "Local User", authorInitials: "LU", timeAgo: "3 weeks ago",
    bookTitle: "The Name of the Wind", bookAuthor: "Patrick Rothfuss", isFiction: true,
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780756404741-L.jpg",
    content: "Kvothe is a divisive protagonist, but the prose is genuinely some of the best in fantasy. The magic system is poetic.",
    ratings: { pacing: 3, metricTwo: 5, metricThree: 4, prose: 5, vibe: 5 }, generalRating: 5,
  },
  {
    id: "rev-f6", type: "DeepReview", author: "Local User", authorInitials: "LU", timeAgo: "1 month ago",
    bookTitle: "Thinking, Fast and Slow", bookAuthor: "Daniel Kahneman", isFiction: false,
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780374275631-L.jpg",
    content: "Dense but rewarding. System 1 / System 2 changed how I think about decision-making permanently.",
    ratings: { pacing: 2, metricTwo: 4, metricThree: 5, prose: 3, vibe: 3 }, generalRating: 4,
  },
];

// Seed Visual (Instagram-style) posts
const seedVisualPosts: Post[] = [
  {
    id: "vis-1",
    type: "Visual",
    author: "Priya Sharma",
    authorInitials: "PS",
    timeAgo: "1 hour ago",
    bookTitle: "Norwegian Wood",
    bookAuthor: "Haruki Murakami",
    location: "Gurugram, India",
    imageUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=800",
    overlayQuote: "\"If you only read the books that everyone else is reading, you can only think what everyone else is thinking.\"",
    content: "Sunday morning rituals. Murakami's prose hits different with chai and rain. This book is haunting me in the best way — every sentence feels like a memory I didn't know I had.",
    likeCount: 2847,
    likesCount: 2847,
    commentsCount: 134,
    generalRating: 5,
  },
  {
    id: "vis-2",
    type: "Visual",
    author: "Marcus Chen",
    authorInitials: "MC",
    timeAgo: "3 hours ago",
    bookTitle: "Piranesi",
    bookAuthor: "Susanna Clarke",
    location: "Brooklyn, NY",
    imageUrl: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=800",
    overlayQuote: "\"The Beauty of the House is immeasurable; its Kindness infinite.\"",
    content: "Finished this in a single sitting at the library and almost forgot where I was. Clarke builds a world that feels impossible and inevitable at the same time.",
    likeCount: 4219,
    likesCount: 4219,
    commentsCount: 287,
    generalRating: 5,
  },
  {
    id: "vis-3",
    type: "Visual",
    author: "Amara Okafor",
    authorInitials: "AO",
    timeAgo: "6 hours ago",
    bookTitle: "Educated",
    bookAuthor: "Tara Westover",
    location: "Lagos, Nigeria",
    imageUrl: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=800",
    content: "This memoir broke me and put me back together. Westover's journey from survivalism to Cambridge is proof that education is not just knowledge — it's liberation. Couldn't stop underlining passages.",
    likeCount: 1653,
    likesCount: 1653,
    commentsCount: 89,
    generalRating: 4,
  },
  {
    id: "vis-4",
    type: "Visual",
    author: "Elena Volkov",
    authorInitials: "EV",
    timeAgo: "8 hours ago",
    bookTitle: "The Midnight Library",
    bookAuthor: "Matt Haig",
    location: "St. Petersburg, Russia",
    imageUrl: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&q=80&w=800",
    overlayQuote: "\"Between life and death there is a library.\"",
    content: "A comforting hug of a book. Not every story needs to be groundbreaking — sometimes you just need one that reminds you the life you're living is enough.",
    likeCount: 33712,
    likesCount: 33712,
    commentsCount: 482,
    generalRating: 4,
  },
];

type ReviewContextType = {
  posts: Post[];
  addPost: (post: Post) => void;
  library: LibraryItem[];
  addToLibrary: (item: LibraryItem) => void;
  removeFromLibrary: (id: string) => void;
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

const ReviewContext = createContext<ReviewContextType | undefined>(undefined);

export function ReviewProvider({ children }: { children: React.ReactNode }) {
  // Interleave Visual posts between Deep Reviews
  const interleavedPosts: Post[] = [];
  const reviews = [...seedReviews, ...initialPosts];
  let visIdx = 0;
  for (let i = 0; i < reviews.length; i++) {
    interleavedPosts.push(reviews[i]);
    // Insert a visual post after every 2 reviews
    if ((i + 1) % 2 === 0 && visIdx < seedVisualPosts.length) {
      interleavedPosts.push(seedVisualPosts[visIdx]);
      visIdx++;
    }
  }
  // Append remaining visual posts
  while (visIdx < seedVisualPosts.length) {
    interleavedPosts.push(seedVisualPosts[visIdx]);
    visIdx++;
  }

  const [posts, setPosts] = useState<Post[]>(interleavedPosts);
  const [library, setLibrary] = useState<LibraryItem[]>(initialLibrary);
  const [challengeTarget, setChallengeTarget] = useState(12);
  const [stories, setStories] = useState<Story[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    displayName: "Local User",
    initials: "LU",
    bio: "Avid reader and aspiring critic. Lover of literary fiction, hard sci-fi, and the occasional philosophy deep-dive. Currently obsessing over Dune. ✨📚",
    personalLink: "goodreads.com/localuser",
    allTimeFav: {
      title: "Dune",
      author: "Frank Herbert",
      coverUrl: "https://books.google.com/books/publisher/content?id=B1hSG45JCX4C&printsec=frontcover&img=1&zoom=1",
    },
  });

  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Initialize and listen to Auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch or create profile whenever session changes
  useEffect(() => {
    if (session?.user) {
      const fetchProfile = async () => {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

          // PGRST116 = "no rows returned" — row doesn't exist yet, create it.
          if (error && error.code !== "PGRST116") {
            console.error("[Profile] DB error fetching profile:", error);
            return;
          }

          if (!data) {
            // No profile row exists — create a minimal one and set defaults.
            const emailPrefix = session.user.email?.split("@")[0] || "user";
            const displayName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);

            await supabase.from("profiles").upsert([{
              id: session.user.id,
              username: emailPrefix,
              display_name: displayName,
              bio: "Avid reader and aspiring critic. ✨📚",
              fav_genres: ["Literary Fiction", "Sci-Fi", "Philosophy"],
              personal_link: "",
              is_public: true,
              profile_complete: false,
            }], { onConflict: "id" });

            setUserProfile({
              displayName,
              initials: displayName.trim().split(/\s+/).map((p) => p[0]).join("").toUpperCase().slice(0, 2),
              bio: "Avid reader and aspiring critic. ✨📚",
              favGenres: ["Literary Fiction", "Sci-Fi", "Philosophy"],
              personalLink: "",
              isPublic: true,
              username: emailPrefix,
              yearlyGoalRaw: null,
              profileComplete: false,
            });
          } else {
            // Row found — map every DB column to the UserProfile shape.
            const displayName = data.display_name || session.user.email?.split("@")[0] || "User";
            const initials = displayName
              .trim().split(/\s+/).map((p: string) => p[0]).join("").toUpperCase().slice(0, 2);

            setUserProfile({
              displayName,
              initials,
              bio: data.bio || "",
              favGenres: data.fav_genres || undefined,
              avatarUrl: data.avatar_url || undefined,
              personalLink: data.personal_link || "",
              currentlyReadingFav: data.curr_reading_info || undefined,
              allTimeFav: data.all_time_fav_book || undefined,
              isPublic: data.is_public ?? true,
              username: data.username || undefined,
              yearlyGoalRaw: data.yearly_chall_goal ?? null,
              profileComplete: data.profile_complete ?? false,
            });
          }
        } catch (err) {
          console.error("[Profile] Unexpected error syncing profile:", err);
        }
      };
      fetchProfile();
    } else {
      // Logged-out fallback
      setUserProfile({
        displayName: "Local User",
        initials: "LU",
        bio: "Avid reader and aspiring critic. Lover of literary fiction, hard sci-fi, and the occasional philosophy deep-dive. Currently obsessing over Dune. ✨📚",
        favGenres: ["Literary Fiction", "Sci-Fi", "Philosophy"],
        personalLink: "goodreads.com/localuser",
        allTimeFav: {
          title: "Dune",
          author: "Frank Herbert",
          coverUrl: "https://books.google.com/books/publisher/content?id=B1hSG45JCX4C&printsec=frontcover&img=1&zoom=1",
        },
        isPublic: true,
      });
    }
  }, [session]);

  // Fetch user's library from Supabase whenever session changes
  useEffect(() => {
    const fetchLibrary = async () => {
      if (!session?.user?.id) {
        setLibrary(initialLibrary);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('library')
          .select('*')
          .eq('user_id', session.user.id);

        if (error) {
          console.error("Fetch Library Error:", error);
          return;
        }

        if (data) {
          const mappedLibrary: LibraryItem[] = data.map((row: any) => ({
            id: row.book_id,
            title: row.title,
            author: row.author,
            thumbnail: row.cover_url || undefined,
            status: row.status as LibraryStatus,
            totalPages: row.total_pages || 300,
            pagesRead: row.pages_read || (row.status === 'Finished' ? (row.total_pages || 300) : 0),
            genres: row.genres || undefined,
            rating: row.rating || undefined,
            reviewText: row.review_txt || undefined,
            favoriteQuote: row.favorite_quote || undefined,
            rPacing: row.r_pacing || undefined,
            rVibe: row.r_vibe || undefined,
            rProse: row.r_prose || undefined,
            rPlotInsight: row.r_plot_insight || undefined,
            rCharPersona: row.r_char_persona || undefined,
            bookType: row.book_type || undefined,
            userImageUrl: row.user_image_url || undefined,
          }));

          setLibrary(mappedLibrary);
        }
      } catch (error) {
        console.error("Fetch Library Error:", error);
      }
    };

    fetchLibrary();
  }, [session?.user?.id]);


  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setUserProfile((prev) => {
      const updated = { ...prev, ...updates };
      if (updates.displayName) {
        const parts = updates.displayName.trim().split(/\s+/);
        updated.initials = parts.map((p) => p[0]).join("").toUpperCase().slice(0, 2);
      }
      return updated;
    });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const addPost = (post: Post) => {
    setPosts((prev) => [post, ...prev]);
  };

  const addStory = (story: Story) => {
    setStories((prev) => [story, ...prev]);
  };

  const addToLibrary = (item: LibraryItem) => {
    setLibrary((prev) => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) {
        return prev.map(i => i.id === item.id ? item : i);
      }
      return [item, ...prev];
    });
  };

  const removeFromLibrary = (id: string) => {
    setLibrary((prev) => prev.filter((item) => item.id !== id));
  };

  const updateLibraryItem = (id: string, updates: Partial<LibraryItem>) => {
    setLibrary((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const updateLibraryProgress = (id: string, pagesRead: number) => {
    setLibrary((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, pagesRead: Math.max(0, Math.min(pagesRead, item.totalPages)) } : item
      )
    );
  };

  return (
    <ReviewContext.Provider value={{
      posts, addPost,
      library, addToLibrary, removeFromLibrary, updateLibraryItem, updateLibraryProgress,
      stories, addStory,
      readingChallenge: { target: challengeTarget, setTarget: setChallengeTarget },
      userProfile, updateProfile,
      showSettings, setShowSettings,
      session, authLoading, signOut,
    }}>
      {children}
    </ReviewContext.Provider>
  );
}

export function useReviews() {
  const context = useContext(ReviewContext);
  if (!context) throw new Error("useReviews must be used within ReviewProvider");
  return context;
}
