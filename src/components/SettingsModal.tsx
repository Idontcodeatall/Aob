"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookCover } from "@/components/BookCover";
import {
  X,
  Camera,
  Search,
  Loader2,
  BookOpen,
  Star as StarIcon,
  Target,
} from "lucide-react";
import { useReviews } from "@/lib/ReviewContext";
import { useDebounce } from "@/hooks/useDebounce";
import { getHighResCover } from "@/lib/utils";

type BookResult = {
  id: string;
  title: string;
  authors: string[];
  thumbnail: string;
};

function BookSearchField({
  label,
  icon: Icon,
  value,
  onSelect,
  onClear,
}: {
  label: string;
  icon: React.ElementType;
  value?: { title: string; author: string; coverUrl: string };
  onSelect: (book: { title: string; author: string; coverUrl: string }) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debouncedQuery = useDebounce(query, 600);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debouncedQuery.length < 3) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    let cancelled = false;
    const search = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(debouncedQuery).replace(/%20/g, "+")}&printType=books&orderBy=relevance&maxResults=5&key=${process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY || ""}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const items: BookResult[] = (data.items || []).map((item: any) => ({
          id: item.id,
          title: item.volumeInfo?.title || "Unknown",
          authors: item.volumeInfo?.authors || ["Unknown"],
          thumbnail: item.volumeInfo?.imageLinks?.thumbnail || "",
        }));
        setResults(items);
        setShowDropdown(items.length > 0);
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    search();
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  if (value) {
    return (
      <div>
        <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
          <Icon size={12} className="inline mr-1.5 opacity-60" />
          {label}
        </label>
        <div className="flex items-center gap-3 bg-neutral-800/50 rounded-xl px-3 py-2.5 border border-neutral-700/50">
          {value.coverUrl && (
            <div className="w-8 h-11 rounded overflow-hidden shrink-0">
              <BookCover url={value.coverUrl} alt={value.title} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-brand-text truncate">{value.title}</p>
            <p className="text-xs text-neutral-500 truncate">{value.author}</p>
          </div>
          <button
            onClick={onClear}
            className="text-neutral-500 hover:text-red-400 transition-colors text-xs shrink-0"
          >
            Clear
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
        <Icon size={12} className="inline mr-1.5 opacity-60" />
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder="Search Google Books..."
          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 pr-10 text-sm text-brand-text focus:outline-none focus:border-brand-accent transition-colors placeholder:text-neutral-600"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {loading ? (
            <Loader2 size={14} className="text-brand-accent animate-spin" />
          ) : (
            <Search size={14} className="text-neutral-600" />
          )}
        </div>
      </div>

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1.5 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden"
        >
          {results.map((book, idx) => (
            <button
              key={book.id}
              onClick={() => {
                onSelect({
                  title: book.title,
                  author: book.authors.join(", "),
                  coverUrl: book.thumbnail,
                });
                setQuery("");
                setShowDropdown(false);
                setResults([]);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-neutral-800 transition-colors ${
                idx !== results.length - 1 ? "border-b border-neutral-800/50" : ""
              }`}
            >
              <div className="w-8 h-11 rounded bg-neutral-800 overflow-hidden shrink-0">
                <BookCover url={book.thumbnail} alt={book.title} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-brand-text truncate">{book.title}</p>
                <p className="text-xs text-neutral-500 truncate">{book.authors.join(", ")}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SettingsModal() {
  const {
    userProfile,
    updateProfile,
    readingChallenge,
    showSettings,
    setShowSettings,
  } = useReviews();

  const [name, setName] = useState(userProfile.displayName);
  const [bio, setBio] = useState(userProfile.bio);
  const [link, setLink] = useState(userProfile.personalLink);
  const [goalTarget, setGoalTarget] = useState(readingChallenge.target);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(userProfile.avatarUrl);
  const [currentlyReading, setCurrentlyReading] = useState(userProfile.currentlyReadingFav);
  const [allTimeFav, setAllTimeFav] = useState(userProfile.allTimeFav);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync on open
  useEffect(() => {
    if (showSettings) {
      setName(userProfile.displayName);
      setBio(userProfile.bio);
      setLink(userProfile.personalLink);
      setGoalTarget(readingChallenge.target);
      setAvatarPreview(userProfile.avatarUrl);
      setCurrentlyReading(userProfile.currentlyReadingFav);
      setAllTimeFav(userProfile.allTimeFav);
    }
  }, [showSettings, userProfile, readingChallenge.target]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setAvatarPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    updateProfile({
      displayName: name,
      bio,
      personalLink: link,
      avatarUrl: avatarPreview,
      currentlyReadingFav: currentlyReading,
      allTimeFav,
    });
    readingChallenge.setTarget(goalTarget);
    setShowSettings(false);
  };

  if (!showSettings) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-8 px-4"
        onClick={() => setShowSettings(false)}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="bg-neutral-900 border border-neutral-700/50 rounded-2xl w-full max-w-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
            <h2 className="font-serif text-xl font-bold text-brand-text">Edit Profile</h2>
            <button
              onClick={() => setShowSettings(false)}
              className="p-2 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-brand-text transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-5">
              <div
                className="relative w-20 h-20 rounded-full bg-neutral-800 shrink-0 overflow-hidden cursor-pointer group border-2 border-neutral-700 hover:border-brand-accent transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-serif text-brand-accent">
                    {userProfile.initials}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={20} className="text-white" />
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <div>
                <p className="text-sm font-medium text-brand-text">Profile Photo</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-brand-accent hover:underline mt-0.5"
                >
                  Upload new photo
                </button>
              </div>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-brand-text focus:outline-none focus:border-brand-accent transition-colors"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                Bio
              </label>
              <div className="relative">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 150))}
                  rows={3}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-brand-text focus:outline-none focus:border-brand-accent transition-colors resize-none text-sm leading-relaxed"
                  placeholder="Tell readers about yourself..."
                />
                <span className="absolute bottom-2 right-3 text-[10px] text-neutral-600">
                  {bio.length}/150
                </span>
              </div>
            </div>

            {/* Personal Link */}
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                Personal Link
              </label>
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="goodreads.com/you"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-accent transition-colors placeholder:text-neutral-600"
              />
            </div>

            {/* Divider */}
            <div className="border-t border-neutral-800 pt-2" />

            {/* Currently Reading */}
            <BookSearchField
              label="Currently Reading"
              icon={BookOpen}
              value={currentlyReading}
              onSelect={setCurrentlyReading}
              onClear={() => setCurrentlyReading(undefined)}
            />

            {/* All-Time Favourite */}
            <BookSearchField
              label="All-Time Favourite"
              icon={StarIcon}
              value={allTimeFav}
              onSelect={setAllTimeFav}
              onClear={() => setAllTimeFav(undefined)}
            />

            {/* Divider */}
            <div className="border-t border-neutral-800 pt-2" />

            {/* Yearly Reading Goal */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                <Target size={12} className="text-brand-accent" />
                2026 Yearly Reading Goal
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(parseInt(e.target.value) || 0)}
                  min="1"
                  className="w-20 bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-brand-text text-lg font-medium focus:outline-none focus:border-brand-accent transition-colors text-center"
                />
                <span className="text-sm text-neutral-500">books this year</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-neutral-800">
            <button
              onClick={() => setShowSettings(false)}
              className="flex-1 py-2.5 rounded-xl text-sm text-neutral-400 bg-neutral-800 hover:bg-neutral-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl text-sm text-white bg-brand-accent hover:bg-brand-accent/80 transition-colors font-semibold"
            >
              Save Changes
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
