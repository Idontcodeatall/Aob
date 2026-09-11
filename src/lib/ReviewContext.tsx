"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/utils/supabaseClient";

// ─── DB-backed post type (maps to posts table + profiles join) ───
export type FeedPost = {
  id: string;
  user_id: string;
  caption: string | null;
  image_url: string | null;
  created_at: string;
  post_type: "photo" | "text" | "review";
  book_id: string | null;
  book_title: string | null;
  book_author: string | null;
  likes_count: number;
  comments_count: number;
  profiles: { username: string; avatar_url: string | null } | null;
};

// ─── DB-backed story type (maps to stories table + profiles join) ───
export type DbStory = {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  expires_at: string;
  profiles: { username: string; avatar_url: string | null } | null;
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
  addedAt?: string;
};

type ReviewContextType = {
  posts: FeedPost[];
  stories: DbStory[];
  refreshFeed: () => void;
  library: LibraryItem[];
  addToLibrary: (item: LibraryItem) => void;
  removeFromLibrary: (id: string) => void;
  updateLibraryItem: (id: string, updates: Partial<LibraryItem>) => void;
  updateLibraryProgress: (id: string, pagesRead: number) => void;
  readingChallenge: { target: number; setTarget: (n: number) => void };
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
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [stories, setStories] = useState<DbStory[]>([]);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [challengeTarget, setChallengeTarget] = useState(12);
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

  // ─── Auth state ───
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  // ─── Fetch posts from DB ───
  const fetchPosts = useCallback(async (userId: string | undefined) => {
    if (!userId) { setPosts([]); return; }
    
    // 1. Fetch posts
    const { data: postsData, error: postsError } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });
      
    if (postsError) {
      console.error("[Feed] Error fetching posts. Message:", postsError.message, "Code:", postsError.code, "Details:", postsError.details);
      return;
    }
    
    if (postsData && postsData.length > 0) {
      // 2. Fetch profiles for these posts
      const userIds = Array.from(new Set(postsData.map(p => p.user_id).filter(Boolean)));
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);
        
      if (profilesError) {
        console.error("[Feed] Error fetching profiles. Message:", profilesError.message, "Code:", profilesError.code, "Details:", profilesError.details);
      }
      
      const profilesMap = new Map();
      if (profilesData) {
        profilesData.forEach(p => profilesMap.set(p.id, { username: p.username, avatar_url: p.avatar_url }));
      }
      
      // 3. Merge
      const mergedPosts = postsData.map(post => ({
        ...post,
        profiles: profilesMap.get(post.user_id) || null
      }));
      
      setPosts(mergedPosts as FeedPost[]);
    } else {
      setPosts([]);
    }
  }, []);

  // ─── Fetch stories from DB (non-expired only) ───
  const fetchStories = useCallback(async (userId: string | undefined) => {
    if (!userId) { setStories([]); return; }
    
    // 1. Fetch stories
    const { data: storiesData, error: storiesError } = await supabase
      .from("stories")
      .select("*")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
      
    if (storiesError) {
      console.error("[Stories] Error fetching stories. Message:", storiesError.message, "Code:", storiesError.code, "Details:", storiesError.details);
      return;
    }
    
    if (storiesData && storiesData.length > 0) {
      // 2. Fetch profiles for these stories
      const userIds = Array.from(new Set(storiesData.map(s => s.user_id).filter(Boolean)));
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);
        
      if (profilesError) {
        console.error("[Stories] Error fetching profiles. Message:", profilesError.message, "Code:", profilesError.code, "Details:", profilesError.details);
      }
      
      const profilesMap = new Map();
      if (profilesData) {
        profilesData.forEach(p => profilesMap.set(p.id, { username: p.username, avatar_url: p.avatar_url }));
      }
      
      // 3. Merge
      const mergedStories = storiesData.map(story => ({
        ...story,
        profiles: profilesMap.get(story.user_id) || null
      }));
      
      setStories(mergedStories as DbStory[]);
    } else {
      setStories([]);
    }
  }, []);

  useEffect(() => {
    fetchPosts(session?.user?.id);
    fetchStories(session?.user?.id);
  }, [session?.user?.id, fetchPosts, fetchStories]);

  // ─── Public refresh (call after inserting a new post or story) ───
  const refreshFeed = useCallback(() => {
    fetchPosts(session?.user?.id);
    fetchStories(session?.user?.id);
  }, [session?.user?.id, fetchPosts, fetchStories]);

  // ─── Profile sync ───
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

  // ─── Library fetch ───
  useEffect(() => {
    const fetchLibrary = async () => {
      if (!session?.user?.id) {
        setLibrary([]);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("library")
          .select("*")
          .eq("user_id", session.user.id);

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
            pagesRead: row.pages_read || (row.status === "Finished" ? (row.total_pages || 300) : 0),
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
            addedAt: row.added_at || undefined,
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
      posts, stories, refreshFeed,
      library, addToLibrary, removeFromLibrary, updateLibraryItem, updateLibraryProgress,
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

