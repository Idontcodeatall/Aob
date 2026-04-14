"use client";

import React, { createContext, useContext, useState } from "react";
import { getHighResCover } from "./utils";

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
  avatarUrl?: string;
  personalLink: string;
  currentlyReadingFav?: { title: string; author: string; coverUrl: string };
  allTimeFav?: { title: string; author: string; coverUrl: string };
};

export type LibraryStatus = "TBR" | "Reading" | "Finished" | "DNF";

export type LibraryItem = {
  id: string;
  title: string;
  authors: string[];
  thumbnail?: string;
  status: LibraryStatus;
  totalPages: number;
  pagesRead: number;
  genres?: string[];
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
    authors: ["Frank Herbert"],
    status: "Reading",
    totalPages: 896,
    pagesRead: 537,
    genres: ["Science Fiction"],
    thumbnail: getHighResCover("https://books.google.com/books/publisher/content?id=B1hSG45JCX4C&printsec=frontcover&img=1&zoom=1&imgtk=AFLRE71L0D1e3mK91TzQj_QxR-42eNqG"),
  },
  {
    id: "seed-f1",
    title: "The Great Gatsby",
    authors: ["F. Scott Fitzgerald"],
    status: "Finished",
    totalPages: 180,
    pagesRead: 180,
    genres: ["Literary Fiction"],
    thumbnail: "https://covers.openlibrary.org/b/isbn/9780743273565-L.jpg",
  },
  {
    id: "seed-f2",
    title: "Sapiens",
    authors: ["Yuval Noah Harari"],
    status: "Finished",
    totalPages: 498,
    pagesRead: 498,
    genres: ["Non-Fiction", "History"],
    thumbnail: "https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg",
  },
  {
    id: "seed-f3",
    title: "Project Hail Mary",
    authors: ["Andy Weir"],
    status: "Finished",
    totalPages: 476,
    pagesRead: 476,
    genres: ["Science Fiction"],
    thumbnail: "https://covers.openlibrary.org/b/isbn/9780593135204-L.jpg",
  },
  {
    id: "seed-f4",
    title: "Atomic Habits",
    authors: ["James Clear"],
    status: "Finished",
    totalPages: 320,
    pagesRead: 320,
    genres: ["Non-Fiction", "Self-Help"],
    thumbnail: "https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg",
  },
  {
    id: "seed-f5",
    title: "The Name of the Wind",
    authors: ["Patrick Rothfuss"],
    status: "Finished",
    totalPages: 662,
    pagesRead: 662,
    genres: ["Fantasy"],
    thumbnail: "https://covers.openlibrary.org/b/isbn/9780756404741-L.jpg",
  },
  {
    id: "seed-f6",
    title: "Thinking, Fast and Slow",
    authors: ["Daniel Kahneman"],
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
  updateLibraryProgress: (id: string, pagesRead: number) => void;
  readingChallenge: { target: number; setTarget: (n: number) => void };
  stories: Story[];
  addStory: (story: Story) => void;
  userProfile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
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
  });

  const updateProfile = (updates: Partial<UserProfile>) => {
    setUserProfile((prev) => {
      const updated = { ...prev, ...updates };
      // Auto-compute initials from display name
      if (updates.displayName) {
        const parts = updates.displayName.trim().split(/\s+/);
        updated.initials = parts.map((p) => p[0]).join("").toUpperCase().slice(0, 2);
      }
      return updated;
    });
  };

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
      library, addToLibrary, updateLibraryProgress,
      stories, addStory,
      readingChallenge: { target: challengeTarget, setTarget: setChallengeTarget },
      userProfile, updateProfile,
      showSettings, setShowSettings,
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
