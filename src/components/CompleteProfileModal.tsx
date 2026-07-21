"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  BookOpen,
  Upload,
  SkipForward,
  User,
} from "lucide-react";
import { useReviews } from "@/lib/ReviewContext";
import { supabase } from "@/utils/supabaseClient";
import { resolveBookCover } from "@/lib/utils";

// ─── Genre options (mirrors GENRE_COLORS in analytics.ts) ───────────────────
const ALL_GENRES = [
  "Literary Fiction",
  "Sci-Fi",
  "Fantasy",
  "Non-Fiction",
  "History",
  "Self-Help",
  "Psychology",
  "Thriller",
  "Romance",
  "Horror",
  "Graphic Novel",
  "Mystery",
  "Biography",
  "Philosophy",
  "Poetry",
];

// ─── Google Books API key ────────────────────────────────────────────────────
const GBOOKS_KEY = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY || "";

// ─── Minimal quoted-field-aware CSV parser ───────────────────────────────────
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] || "").trim();
    });
    rows.push(row);
  }
  return rows;
}

// ─── Map Goodreads shelf → library status ────────────────────────────────────
const SHELF_MAP: Record<string, string> = {
  read: "Finished",
  "currently-reading": "Reading",
  "to-read": "TBR",
};



// ─── Debounce hook ────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Book search result type ──────────────────────────────────────────────────
interface BookResult {
  id: string;
  title: string;
  author: string;
  thumbnail?: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  onClose: () => void;
  startAtStep?: 1 | 2;
}

// ─────────────────────────────────────────────────────────────────────────────
export function CompleteProfileModal({ onClose, startAtStep = 1 }: Props) {
  const { session, userProfile, updateProfile } = useReviews();

  // Step state
  const [step, setStep] = useState<1 | 2>(startAtStep);

  // ── Step 1 state ──────────────────────────────────────────────────────────
  const [username, setUsername] = useState(userProfile.username || userProfile.displayName || "");
  const [selectedGenres, setSelectedGenres] = useState<string[]>(userProfile.favGenres || []);

  // All-time fav book search
  const [favQuery, setFavQuery] = useState(userProfile.allTimeFav?.title || "");
  const debouncedFavQuery = useDebounce(favQuery, 500);
  const [favResults, setFavResults] = useState<BookResult[]>([]);
  const [favLoading, setFavLoading] = useState(false);
  const [selectedFav, setSelectedFav] = useState<{ title: string; author: string; coverUrl: string } | undefined>(
    userProfile.allTimeFav
  );

  // Step 1 save state
  const [step1Saving, setStep1Saving] = useState(false);
  const [step1Error, setStep1Error] = useState("");

  // ── Step 2 state ──────────────────────────────────────────────────────────
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importDone, setImportDone] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const [importError, setImportError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const favDropdownRef = useRef<HTMLDivElement>(null);

  // ── Fav dropdown autoscroll ───────────────────────────────────────────────
  useEffect(() => {
    if (favResults.length > 0 && favDropdownRef.current) {
      favDropdownRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [favResults]);

  // ── Fav book search ───────────────────────────────────────────────────────
  useEffect(() => {
    if (debouncedFavQuery.length < 3) {
      setFavResults([]);
      return;
    }
    if (selectedFav && debouncedFavQuery === selectedFav.title) return;
    setFavLoading(true);
    const ctrl = new AbortController();
    fetch(
      `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(debouncedFavQuery)}&maxResults=5${GBOOKS_KEY ? `&key=${GBOOKS_KEY}` : ""}`,
      { signal: ctrl.signal }
    )
      .then((r) => r.json())
      .then(async (json) => {
        const items: BookResult[] = await Promise.all((json.items || []).map(async (item: any) => {
          const title = item.volumeInfo?.title || "Unknown Title";
          const author = (item.volumeInfo?.authors || []).join(", ") || "Unknown Author";
          let thumbnail = item.volumeInfo?.imageLinks?.thumbnail?.replace("http://", "https://");
          if (!thumbnail) {
            const isbns = item.volumeInfo?.industryIdentifiers || [];
            const isbn13Obj = isbns.find((i: any) => i.type === "ISBN_13");
            const resolved = await resolveBookCover(isbn13Obj?.identifier, title, author);
            thumbnail = resolved.coverUrl || undefined;
          }
          return { id: item.id, title, author, thumbnail };
        }));
        if (!ctrl.signal.aborted) setFavResults(items);
      })
      .catch(() => {})
      .finally(() => setFavLoading(false));
    return () => ctrl.abort();
  }, [debouncedFavQuery, selectedFav]);

  // ── Genre toggle ──────────────────────────────────────────────────────────
  const toggleGenre = (g: string) => {
    setSelectedGenres((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  };

  // ── Step 1 → Next ─────────────────────────────────────────────────────────
  const handleStep1Next = async () => {
    if (!username.trim()) {
      setStep1Error("Please enter a username.");
      return;
    }
    setStep1Error("");
    setStep1Saving(true);
    try {
      // Save Step 1 fields to DB immediately (profile_complete stays false until end)
      const { error } = await supabase
        .from("profiles")
        .update({
          username: username.trim(),
          fav_genres: selectedGenres,
          all_time_fav_book: selectedFav || null,
        })
        .eq("id", session!.user.id);

      if (error) {
        setStep1Error(error.message);
        return;
      }
      setStep(2);
    } catch (err: any) {
      setStep1Error(err?.message || "An error occurred.");
    } finally {
      setStep1Saving(false);
    }
  };

  // ── Step 2: parse and import CSV ──────────────────────────────────────────
  const handleImport = async () => {
    if (!csvFile || !session) return;
    setImporting(true);
    setImportError("");
    setImportProgress(0);

    try {
      const text = await csvFile.text();
      const rows = parseCsv(text).filter((r) => r["Title"]?.trim());
      setImportTotal(rows.length);

      if (rows.length === 0) {
        setImportError("No valid rows found in the CSV.");
        setImporting(false);
        return;
      }

      // Build library rows (fetch covers in batches of 8)
      const BATCH = 8;
      const libraryRows: any[] = [];

      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const withCovers = await Promise.allSettled(
          batch.map(async (r) => {
            const isbn13 = (r["ISBN13"] || "").replace(/[^0-9]/g, "");
            const bookId = r["Book Id"] || `gr-${i}-${Math.random()}`;
            const status = SHELF_MAP[r["Exclusive Shelf"]] || "TBR";
            const rawRating = parseInt(r["My Rating"] || "0", 10) || 0;
            const title = r["Title"] ? r["Title"].trim() : "Unknown Title";
            const author = r["Author"] ? r["Author"].trim() : (r["Author l-f"] ? r["Author l-f"].trim() : "Unknown Author");
            const { coverUrl, categories } = await resolveBookCover(isbn13 || undefined, title, author);
            
            let finalGenres = categories;
            try {
              const classRes = await fetch("/api/classify-genre", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, author })
              });
              const classData = await classRes.json();
              if (classData.genres && classData.genres.length > 0) {
                finalGenres = classData.genres;
              }
            } catch (err) {
              console.error("Genre classification failed:", err);
            }

            return {
              user_id: session.user.id,
              book_id: bookId,
              isbn: isbn13 || null,
              title,
              author,
              rating: rawRating > 0 ? rawRating : null,
              review_txt: r["My Review"] || null,
              status,
              cover_url: coverUrl,
              genres: finalGenres.length > 0 ? finalGenres : null,
            };
          })
        );
        withCovers.forEach((res) => {
          if (res.status === "fulfilled") libraryRows.push(res.value);
        });
        setImportProgress(Math.min(i + BATCH, rows.length));
      }

      // To safely upsert without a custom unique constraint, we fetch existing DB IDs first
      const batchBookIds = libraryRows.map(r => r.book_id);
      const { data: existingData } = await supabase
        .from("library")
        .select("id, book_id")
        .eq("user_id", session.user.id)
        .in("book_id", batchBookIds);

      const existingMap = new Map();
      if (existingData) {
        existingData.forEach(row => existingMap.set(row.book_id, row.id));
      }

      const rowsToUpsert = libraryRows.map(row => {
        if (existingMap.has(row.book_id)) {
          return { ...row, id: existingMap.get(row.book_id) };
        }
        return row;
      });

      const { error: upsertError } = await supabase
        .from("library")
        .upsert(rowsToUpsert, { onConflict: "id" });

      if (upsertError) {
        setImportError(upsertError.message);
        setImporting(false);
        return;
      }

      setImportCount(libraryRows.length);
      setImportDone(true);
    } catch (err: any) {
      setImportError(err?.message || "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  // ── Finish (both paths converge here) ────────────────────────────────────
  const handleFinish = async () => {
    if (!session) return;
    await supabase
      .from("profiles")
      .update({ profile_complete: true })
      .eq("id", session.user.id);

    // Sync local context
    updateProfile({
      username: username.trim(),
      favGenres: selectedGenres,
      allTimeFav: selectedFav,
      profileComplete: true,
    });
    onClose();
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-neutral-800">
          <div>
            <h2 className="font-serif text-xl font-bold text-brand-text">
              {step === 1 ? "Complete your profile" : "Import your Goodreads library"}
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">Step {step} of 2</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 rounded-full transition-colors cursor-pointer text-neutral-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        {startAtStep === 1 && (
          <div className="flex gap-1.5 px-6 pt-4">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                  s <= step ? "bg-brand-accent" : "bg-neutral-800"
                }`}
              />
            ))}
          </div>
        )}

        <div className="px-6 py-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
                className="space-y-6"
              >
                {/* Username */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                    <User size={11} className="inline mr-1.5 opacity-70" />
                    Username
                  </label>
                  <input
                    id="cpm-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="yourhandle"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all"
                  />
                </div>

                {/* Favourite Genres */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
                    Favourite Genres
                    <span className="text-neutral-600 normal-case font-normal ml-2">— pick any</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_GENRES.map((g) => {
                      const active = selectedGenres.includes(g);
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => toggleGenre(g)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                            active
                              ? "bg-brand-accent border-brand-accent text-white"
                              : "bg-neutral-800/60 border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-200"
                          }`}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* All-Time Fav Book */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                    All-Time Favourite Book
                    <span className="text-neutral-600 normal-case font-normal ml-2">— optional</span>
                  </label>
                  {selectedFav ? (
                    <div className="flex items-center gap-3 bg-neutral-800/50 border border-neutral-700 rounded-xl p-3">
                      {selectedFav.coverUrl && (
                        <img
                          src={selectedFav.coverUrl}
                          alt={selectedFav.title}
                          className="w-10 h-14 object-cover rounded shadow"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-serif text-sm font-semibold text-brand-text truncate">{selectedFav.title}</p>
                        <p className="text-xs text-neutral-500 truncate mt-0.5">{selectedFav.author}</p>
                      </div>
                      <button
                        onClick={() => { setSelectedFav(undefined); setFavQuery(""); }}
                        className="p-1 hover:bg-neutral-700 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        id="cpm-fav-search"
                        type="text"
                        value={favQuery}
                        onChange={(e) => { setFavQuery(e.target.value); setSelectedFav(undefined); }}
                        placeholder="Search by title..."
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all"
                      />
                      {favLoading && (
                        <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 animate-spin" />
                      )}
                      {favResults.length > 0 && (
                        <div 
                          ref={favDropdownRef}
                          className="absolute top-full left-0 right-0 mt-1.5 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden z-50"
                        >
                          {favResults.map((book) => (
                            <button
                              key={book.id}
                              type="button"
                              onClick={() => {
                                setSelectedFav({ title: book.title, author: book.author, coverUrl: book.thumbnail || "" });
                                setFavQuery(book.title);
                                setFavResults([]);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-900 transition-colors text-left cursor-pointer border-b border-neutral-800/60 last:border-0"
                            >
                              {book.thumbnail ? (
                                <img src={book.thumbnail} alt={book.title} className="w-8 h-11 object-cover rounded shrink-0" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-8 h-11 bg-neutral-800 rounded flex items-center justify-center shrink-0">
                                  <BookOpen size={12} className="text-neutral-600" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-brand-text truncate">{book.title}</p>
                                <p className="text-xs text-neutral-500 truncate">{book.author}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {step1Error && (
                  <p className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 rounded-lg px-3 py-2">{step1Error}</p>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.18 }}
                className="space-y-6"
              >
                {!importDone ? (
                  <>
                    {/* Instructions */}
                    <div className="bg-neutral-800/40 border border-neutral-700/60 rounded-xl p-4 text-xs text-neutral-400 leading-relaxed space-y-1.5">
                      <p className="text-neutral-300 font-semibold text-sm mb-2">How to export from Goodreads:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Go to <span className="text-neutral-200">My Books</span></li>
                        <li>Click <span className="text-neutral-200">Tools</span> (bottom left)</li>
                        <li>Click <span className="text-neutral-200">Import and Export</span></li>
                        <li>Click <span className="text-neutral-200">Export Library</span></li>
                        <li>Download the CSV and upload it below</li>
                      </ol>
                    </div>

                    {/* File upload */}
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                      />
                      {csvFile ? (
                        <div className="flex items-center gap-3 bg-neutral-800/50 border border-neutral-700 rounded-xl p-4">
                          <div className="w-10 h-10 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center shrink-0">
                            <Upload size={18} className="text-brand-accent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-brand-text truncate">{csvFile.name}</p>
                            <p className="text-xs text-neutral-500 mt-0.5">{(csvFile.size / 1024).toFixed(1)} KB</p>
                          </div>
                          <button
                            onClick={() => { setCsvFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                            className="p-1.5 hover:bg-neutral-700 rounded-lg text-neutral-400 cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full border-2 border-dashed border-neutral-700 hover:border-brand-accent/50 rounded-xl p-8 flex flex-col items-center gap-3 text-neutral-500 hover:text-neutral-300 transition-all cursor-pointer group"
                        >
                          <Upload size={24} className="group-hover:text-brand-accent transition-colors" />
                          <span className="text-sm font-medium">Click to select your Goodreads CSV</span>
                          <span className="text-xs text-neutral-600">Only .csv files are accepted</span>
                        </button>
                      )}
                    </div>

                    {/* Progress */}
                    {importing && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-neutral-400">
                          <span>Importing books...</span>
                          <span>{importProgress} / {importTotal}</span>
                        </div>
                        <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-accent rounded-full transition-all duration-300"
                            style={{ width: importTotal > 0 ? `${(importProgress / importTotal) * 100}%` : "0%" }}
                          />
                        </div>
                      </div>
                    )}

                    {importError && (
                      <p className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 rounded-lg px-3 py-2">{importError}</p>
                    )}
                  </>
                ) : (
                  /* Success state */
                  <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-900/30 border border-emerald-700/40 flex items-center justify-center">
                      <Check size={28} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-serif text-xl font-bold text-brand-text mb-1">
                        {importCount} book{importCount !== 1 ? "s" : ""} imported
                      </p>
                      <p className="text-sm text-neutral-500">Your library is ready. Happy reading!</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer actions */}
        <div className="px-6 pb-6 pt-2 flex items-center justify-between gap-3">
          {step === 1 ? (
            <>
              <div />
              <button
                id="cpm-next"
                onClick={handleStep1Next}
                disabled={step1Saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-accent text-white font-semibold text-sm hover:bg-brand-accent/90 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {step1Saving ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {!importDone ? (
                <>
                  {startAtStep === 1 && (
                    <button
                      onClick={() => setStep(1)}
                      className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <ArrowLeft size={14} />
                      Back
                    </button>
                  )}
                  <div className={`flex items-center gap-3 ${startAtStep === 2 ? "ml-auto" : ""}`}>
                    <button
                      id="cpm-skip-import"
                      onClick={handleFinish}
                      className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                    >
                      <SkipForward size={14} />
                      Skip
                    </button>
                    <button
                      id="cpm-import"
                      onClick={handleImport}
                      disabled={!csvFile || importing}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-accent text-white font-semibold text-sm hover:bg-brand-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {importing ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload size={15} />
                          Import
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div />
                  <button
                    id="cpm-finish"
                    onClick={handleFinish}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-accent text-white font-semibold text-sm hover:bg-brand-accent/90 transition-colors cursor-pointer"
                  >
                    <Check size={15} />
                    Finish
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
