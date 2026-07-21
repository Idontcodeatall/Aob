"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Search, X, Bot, Sparkles, AlertTriangle, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useReviews, LibraryStatus } from "@/lib/ReviewContext";
import { getGenreFrequency, getAggregateRadar } from "@/lib/analytics";
import { motion, AnimatePresence } from "framer-motion";
import { getHighResCover, resolveBookCover } from "@/lib/utils";
import { BookCover } from "@/components/BookCover";
import { supabase } from "@/utils/supabaseClient";
import ReactMarkdown from "react-markdown";


// ─── Types ────────────────────────────────────────────────────────────────────

type ViewState = "trending" | "search" | "ai";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BrowsePage() {
  const router = useRouter();
  const { addToLibrary, posts, library, session } = useReviews();

  const [view, setView] = useState<ViewState>("trending");
  const [selectedGenre, setSelectedGenre] = useState("All");

  // Search State
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Trending State
  const [trendingBooks, setTrendingBooks] = useState<any[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  // AI State (legacy mock — kept for "ai" view)
  const [aiResults, setAiResults] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const [selectedBook, setSelectedBook] = useState<any | null>(null);

  const isBookFinished = useMemo(() => {
    if (!selectedBook) return false;
    return library.some(
      (item) => item.status === "Finished" && (item.id === selectedBook.id || item.title === selectedBook.volumeInfo.title)
    );
  }, [selectedBook, library]);

  // Dynamic Mobile Bottom Nav Avoidance
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Analytics for AI Context
  const finishedBooks = useMemo(() => library.filter((b) => b.status === "Finished"), [library]);
  const reviewsWithRatings = useMemo(() => finishedBooks.filter(b => b.rPacing !== undefined || b.rCharPersona !== undefined || b.rPlotInsight !== undefined || b.rProse !== undefined || b.rVibe !== undefined), [finishedBooks]);
  const genreData = useMemo(() => getGenreFrequency(finishedBooks), [finishedBooks]);
  const aggregateRadar = useMemo(() => getAggregateRadar(reviewsWithRatings), [reviewsWithRatings]);

  // ── Montag Chat State ──────────────────────────────────────────────────────
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // ── Drawer resize state ────────────────────────────────────────────────────
  const DRAWER_MIN_VH = 30;
  const DRAWER_MAX_VH = 85;
  const DRAWER_DEFAULT_VH = 50;
  const [drawerHeightPx, setDrawerHeightPx] = useState<number | null>(null);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  // Resolve vh → px on first open or window resize
  const resolveDefaultHeight = () =>
    Math.round((window.innerHeight * DRAWER_DEFAULT_VH) / 100);

  const clampHeight = (px: number) => {
    const minPx = (window.innerHeight * DRAWER_MIN_VH) / 100;
    const maxPx = (window.innerHeight * DRAWER_MAX_VH) / 100;
    return Math.round(Math.max(minPx, Math.min(maxPx, px)));
  };

  const handleDragHandlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDragging.current = true;
    dragStartY.current = e.clientY;
    dragStartHeight.current = drawerHeightPx ?? resolveDefaultHeight();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleDragHandlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    // Dragging UP (negative dy) increases height
    const dy = e.clientY - dragStartY.current;
    setDrawerHeightPx(clampHeight(dragStartHeight.current - dy));
  };

  const handleDragHandlePointerUp = () => {
    isDragging.current = false;
  };

  // ── Montag response sanitiser ──────────────────────────────────────────────
  // Strips CJK and related unicode blocks that appear mid-sentence outside of
  // a quoted context (book titles / author names are typically quoted).
  const sanitizeMontagResponse = (text: string): string => {
    // CJK ranges: main block, Ext-A, Ext-B surrogate pairs, compatibility
    // ideographs, radicals supplement, Kangxi radicals, CJK symbols &
    // punctuation, Hiragana, Katakana, halfwidth/fullwidth forms.
    const CJK_RE =
      /[\u2E80-\u2FDF\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/g;

    // Split on quoted spans so we never touch text inside quotes.
    // Handles: straight "...", curly \u201C...\u201D, and single '...'.
    const QUOTE_RE = /("|\u201C[^\u201D]*\u201D|'[^']*')/g;

    const parts = text.split(QUOTE_RE);
    return parts
      .map((part, i) => {
        // Odd-indexed parts are the captured quote delimiters — leave intact.
        if (i % 2 === 1) return part;
        return part.replace(CJK_RE, "");
      })
      .join("");
  };

  // Scroll to bottom whenever chat history grows or streaming updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // ── Montag Send ────────────────────────────────────────────────────────────
  const handleChatSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed || isStreaming) return;

    // Open drawer on first message
    if (!isDrawerOpen) setIsDrawerOpen(true);

    // Append user message
    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    setChatInput("");
    setIsStreaming(true);

    // Placeholder assistant message (will be streamed into)
    const assistantPlaceholder: ChatMessage = { role: "assistant", content: "" };
    setChatHistory([...newHistory, assistantPlaceholder]);

    try {
      // Get access token for auth header
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const accessToken = currentSession?.access_token ?? "";

      const res = await fetch("/api/librarian", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          message: trimmed,
          history: chatHistory, // send history before this turn
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`API error ${res.status}`);
      }

      // Stream chunks into the last assistant message
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assembled = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assembled += decoder.decode(value, { stream: true });
        // Update last message in place, sanitising on the fly
        const sanitised = sanitizeMontagResponse(assembled);
        setChatHistory((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: sanitised };
          return updated;
        });
      }

      // Push both turns into history for next request, with final sanitisation
      const sanitisedFinal = sanitizeMontagResponse(assembled);
      setChatHistory((prev) => {
        const withoutLast = prev.slice(0, -1);
        return [
          ...withoutLast,
          { role: "assistant", content: sanitisedFinal },
        ];
      });
    } catch (err) {
      console.error("[Montag] fetch error:", err);
      setChatHistory((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Something went wrong reaching the library. Try again.",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setChatHistory([]);
    setChatInput("");
  };

  // ── Trending ───────────────────────────────────────────────────────────────
  const NYT_API_KEY = process.env.NEXT_PUBLIC_NYT_API_KEY || "";

  const getNYTListName = (genre: string) => {
    switch (genre) {
      case "Fiction": return "hardcover-fiction";
      case "Non-Fiction": return "hardcover-nonfiction";
      case "All": return "hardcover-fiction";
      default: return "hardcover-fiction";
    }
  };

  const fetchTrending = async () => {
    setTrendingLoading(true);
    try {
      const fetchList = async (listName: string) => {
        const res = await fetch(`https://api.nytimes.com/svc/books/v3/lists/current/${listName}.json?api-key=${NYT_API_KEY}`);
        if (!res.ok) throw new Error(`NYT API fetch failed for ${listName}`);
        const data = await res.json();
        return data.results?.books || [];
      };

      let nytBooks = [];
      if (selectedGenre === "All") {
        const [fiction, nonFiction] = await Promise.all([
          fetchList("hardcover-fiction"),
          fetchList("hardcover-nonfiction")
        ]);
        nytBooks = [...fiction, ...nonFiction].sort(() => Math.random() - 0.5);
      } else {
        const listName = getNYTListName(selectedGenre);
        nytBooks = await fetchList(listName);
      }

      const transformedBooks = nytBooks.map((b: any) => ({
        id: b.primary_isbn13 || `${b.title.replace(/\s+/g, '-').toLowerCase()}-${b.author.replace(/\s+/g, '-').toLowerCase()}`,
        volumeInfo: {
          title: b.title,
          authors: [b.author],
          imageLinks: {
            thumbnail: b.book_image || (b.primary_isbn13 ? `https://covers.openlibrary.org/b/isbn/${b.primary_isbn13}-L.jpg` : "")
          },
          description: b.description,
          categories: [selectedGenre],
          pageCount: 300
        }
      }));

      setTrendingBooks(transformedBooks);
    } catch (error) {
      console.error("Error fetching NYT trending books", error);
    } finally {
      setTrendingLoading(false);
    }
  };

  useEffect(() => {
    if (view === "trending") {
      fetchTrending();
    }
  }, [selectedGenre, view]);

  // ── Search ─────────────────────────────────────────────────────────────────
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) {
      setView("trending");
      return;
    }

    setView("search");
    setSearchLoading(true);
    try {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(query).replace(/%20/g, "+")}&printType=books&orderBy=relevance&maxResults=20&key=${process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY || ""}`);
      const data = await res.json();
      
      const items = await Promise.all((data.items || []).map(async (item: any) => {
        let thumbnail = item.volumeInfo?.imageLinks?.thumbnail;
        if (!thumbnail) {
          const isbns = item.volumeInfo?.industryIdentifiers || [];
          const isbn13Obj = isbns.find((i: any) => i.type === "ISBN_13");
          const resolved = await resolveBookCover(
            isbn13Obj?.identifier,
            item.volumeInfo?.title,
            item.volumeInfo?.authors?.join(", ")
          );
          if (resolved.coverUrl) {
            item.volumeInfo = item.volumeInfo || {};
            item.volumeInfo.imageLinks = item.volumeInfo.imageLinks || {};
            item.volumeInfo.imageLinks.thumbnail = resolved.coverUrl;
            if (resolved.categories.length > 0) {
              item.volumeInfo.categories = resolved.categories;
            }
          }
        }
        return item;
      }));
      setSearchResults(items);
    } catch (error) {
      console.error("Error searching books", error);
    } finally {
      setSearchLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setView("trending");
  };

  // ── Library Actions ────────────────────────────────────────────────────────
  const handleStartReview = () => {
    if (!selectedBook) return;
    const title = selectedBook.volumeInfo.title || "";
    const author = selectedBook.volumeInfo.authors?.[0] || "";
    const coverUrl = getHighResCover(selectedBook.volumeInfo.imageLinks?.thumbnail);
    const categories = (selectedBook.volumeInfo.categories || []).join(",");

    const params = new URLSearchParams({ title, author, cover: coverUrl, categories });
    router.push(`/post/review?${params.toString()}`);
  };

  const handleAddToLibrary = async (status: LibraryStatus) => {
    if (!selectedBook) return;
    const title = selectedBook.volumeInfo.title || "Unknown Title";
    const authors = selectedBook.volumeInfo.authors || ["Unknown Author"];
    const author = authors[0] || "Unknown Author";
    const thumbnail = getHighResCover(selectedBook.volumeInfo.imageLinks?.thumbnail) || "";
    const totalPages = selectedBook.volumeInfo.pageCount || 300;

    if (session?.user?.id) {
      const { data, error } = await supabase.from('library').insert([{
        user_id: session.user.id,
        book_id: selectedBook.id,
        title,
        author,
        cover_url: thumbnail,
        status,
        genres: selectedBook.volumeInfo.categories || null,
      }]);
      if (error) {
        console.error('CRITICAL SUPABASE INSERT ERROR:', error.message, error.details, error.hint);
      }
    }

    addToLibrary({
      id: selectedBook.id,
      title,
      author,
      thumbnail,
      status,
      totalPages,
      pagesRead: status === "Finished" ? totalPages : 0,
    });
    router.push("/library");
  };

  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());

  const handleCardAddToTBR = async (e: React.MouseEvent, book: any) => {
    e.stopPropagation();
    if (!session?.user?.id) {
      console.error("[Add to TBR] No authenticated session found.");
      return;
    }

    const title = book.volumeInfo.title || "Unknown Title";
    const author = book.volumeInfo.authors?.[0] || "Unknown Author";
    const coverUrl = getHighResCover(book.volumeInfo.imageLinks?.thumbnail) || "";

    setAddingIds((prev) => new Set(prev).add(book.id));

    const { data, error } = await supabase.from('library').insert([{
      user_id: session.user.id,
      book_id: book.id,
      title,
      author,
      cover_url: coverUrl,
      status: 'TBR',
    }]);

    if (error) {
      console.error('CRITICAL SUPABASE INSERT ERROR:', error.message, error.details, error.hint);
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(book.id);
        return next;
      });
      return;
    }

    addToLibrary({
      id: book.id,
      title,
      author,
      thumbnail: coverUrl,
      status: "TBR",
      totalPages: book.volumeInfo.pageCount || 300,
      pagesRead: 0,
    });
  };

  // ── Book Card ──────────────────────────────────────────────────────────────
  const renderBookCard = (book: any, isAiMode = false) => {
    const cover = getHighResCover(book.volumeInfo.imageLinks?.thumbnail);
    const inLibrary = library.some((item) => item.id === book.id || item.title === book.volumeInfo.title);
    const isAdding = addingIds.has(book.id);
    return (
      <div
        key={book.id}
        onClick={() => setSelectedBook(book)}
        className="group cursor-pointer flex flex-col gap-3 relative"
      >
        <BookCover
          url={book.volumeInfo.imageLinks?.thumbnail}
          alt={book.volumeInfo.title}
          className="group-hover:scale-105 transition-transform duration-700"
        />
        <div className="flex flex-col flex-1">
          <h3 className="text-sm font-semibold text-brand-text line-clamp-2 leading-tight group-hover:text-brand-accent transition-colors mb-1">{book.volumeInfo.title}</h3>
          <p className="text-xs text-neutral-400 truncate mb-2">{book.volumeInfo.authors?.[0]}</p>

          <button
            onClick={(e) => handleCardAddToTBR(e, book)}
            disabled={inLibrary || isAdding}
            className={`mt-auto mb-1 py-1.5 px-3 rounded-md text-[11px] font-semibold tracking-wide border transition-all flex items-center justify-center gap-1 z-10 w-fit ${
              inLibrary
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 cursor-default"
                : "border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-brand-accent hover:border-brand-accent hover:text-white"
            }`}
          >
            {isAdding ? "..." : inLibrary ? "✓ Added" : "+ Add to TBR"}
          </button>

          {isAiMode && book.aiBlurb && (
            <div className="mt-3 bg-brand-accent/10 border border-brand-accent/20 rounded-md p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles size={12} className="text-brand-accent" />
                <span className="text-xs font-semibold text-brand-text">Why we picked this</span>
              </div>
              <p className="text-xs text-brand-text/80 leading-relaxed italic">"{book.aiBlurb}"</p>
            </div>
          )}

          {isAiMode && book.contentWarnings && book.contentWarnings.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {book.contentWarnings.map((warning: string) => (
                <span key={warning} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-950/40 border border-red-900/50 text-[10px] text-red-200 uppercase tracking-wider font-semibold">
                  <AlertTriangle size={10} />
                  {warning}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Drawer height helpers ──────────────────────────────────────────────────
  const MOBILE_NAV_OFFSET = "calc(4rem + env(safe-area-inset-bottom))";
  // Live pixel height when open; falls back to 50 vh on first render
  const effectiveDrawerHeightPx = drawerHeightPx ?? (typeof window !== "undefined" ? resolveDefaultHeight() : 0);
  // String for grid padding — use px when open so it stays in sync with drag
  const gridPaddingBottom = isDrawerOpen
    ? `calc(${effectiveDrawerHeightPx}px + ${isMobile ? MOBILE_NAV_OFFSET : "2rem"})`
    : isMobile
      ? MOBILE_NAV_OFFSET
      : "8rem";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col w-full h-screen mx-auto relative overflow-hidden bg-neutral-950">

      {/* ── FIXED HEADER ────────────────────────────────────────────────────── */}
      <header className="shrink-0 relative md:fixed top-0 right-0 left-0 md:left-64 pt-1.5 md:pt-4 px-4 md:px-8 z-30 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800/50 pb-2 transition-all">
        <div className="max-w-5xl mx-auto">
          <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-brand-text mb-0 md:mb-1">Browse with Librarian</h1>
          <p className="text-neutral-400 text-xs md:text-base mb-1 md:mb-3 leading-tight">Search the archives or ask your AI Librarian for a personalized recommendation.</p>

          <form onSubmit={handleSearch} className="relative w-full max-w-2xl mt-1 mb-1 md:mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value === "") setView("trending");
              }}
              placeholder="Search for a title, author, or ISBN..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-full px-5 py-2.5 md:py-4 pl-11 md:pl-14 pr-10 md:pr-12 text-brand-text focus:outline-none focus:border-brand-accent transition-colors shadow-sm text-sm md:text-lg"
            />
            <button type="submit" className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-brand-text transition-colors">
              <Search size={18} className="md:w-[22px] md:h-[22px]" />
            </button>
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-5 top-1/2 -translate-y-1/2 p-1 text-neutral-500 hover:text-white bg-neutral-800 rounded-full transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </form>
        </div>
      </header>

      {/* ── SCROLLABLE BOOK GRID ─────────────────────────────────────────────── */}
      {/* When drawer opens, add bottom padding equal to drawer height */}
      <div
        className="flex-1 overflow-y-auto w-full pt-2 md:pt-48 px-4 md:px-8 custom-scrollbar"
        style={{
          paddingBottom: gridPaddingBottom,
          transition: isDragging.current ? "none" : "padding-bottom 0.35s cubic-bezier(0.32,0,0.67,0)",
        }}
      >
        <div className="max-w-5xl mx-auto w-full">
          <AnimatePresence mode="wait">

            {/* TRENDING VIEW */}
            {view === "trending" && (
              <motion.div
                key="trending"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center justify-between mb-3 md:mb-6">
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <TrendingIcon className="w-4 h-4 md:w-6 md:h-6" />
                    <h2 className="text-sm md:text-lg font-bold uppercase tracking-wider text-brand-text">Trending Now</h2>
                  </div>
                </div>

                {/* Genre Pills */}
                <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-4 md:pb-6 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                  {["All", "Fiction", "Non-Fiction"].map((genre) => (
                    <button
                      key={genre}
                      onClick={() => setSelectedGenre(genre)}
                      className={`shrink-0 px-4 md:px-6 py-1.5 md:py-2 rounded-full border text-[10px] md:text-sm font-semibold transition-all ${
                        selectedGenre === genre
                          ? "bg-[#800000] border-[#800000] text-white shadow-lg shadow-[#800000]/20"
                          : "border-[#800000] text-[#800000] hover:bg-[#800000]/5"
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
                {trendingLoading ? (
                  <div className="text-brand-accent animate-pulse font-medium">Loading recommendations...</div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                    {trendingBooks.map(b => renderBookCard(b))}
                  </div>
                )}
              </motion.div>
            )}

            {/* SEARCH VIEW */}
            {view === "search" && (
              <motion.div
                key="search"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-lg font-bold uppercase tracking-wider text-brand-text mb-6">Search Results</h2>
                {searchLoading ? (
                  <div className="text-brand-accent animate-pulse font-medium">Searching the archives...</div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                    {searchResults.length > 0 ? (
                      searchResults.map(b => renderBookCard(b))
                    ) : (
                      <div className="col-span-full text-neutral-500">No results found for "{query}".</div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* AI VIEW (legacy) */}
            {view === "ai" && (
              <motion.div
                key="ai"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-2 mb-6 text-brand-accent">
                  <Bot size={24} />
                  <h2 className="text-lg font-bold uppercase tracking-wider text-brand-text border-b border-brand-accent/50 pb-1">Personalized Curation</h2>
                </div>
                {aiLoading ? (
                  <div className="flex items-center gap-3 text-brand-accent font-medium">
                    <Sparkles size={20} className="animate-pulse" />
                    <span>Analyzing your reading DNA and scanning the archives...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {aiResults.map(b => renderBookCard(b, true))}
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* ── MONTAG CHAT DRAWER ───────────────────────────────────────────────── */}
      <div
        className="fixed left-0 md:left-64 right-0 z-[70] flex flex-col bg-neutral-900 border-t border-brand-accent/30 shadow-[0_-10px_60px_rgba(0,0,0,0.7)]"
        style={{
          bottom: isMobile ? MOBILE_NAV_OFFSET : "0px",
          height: isDrawerOpen
            ? `${effectiveDrawerHeightPx}px`
            : "auto",
          overflow: "hidden",
          transition: isDragging.current ? "none" : "height 0.35s cubic-bezier(0.32,0,0.67,0)",
        }}
      >
        {/* ── Drag handle — sits at the very top, only when drawer is open ── */}
        {isDrawerOpen && (
          <div
            onPointerDown={handleDragHandlePointerDown}
            onPointerMove={handleDragHandlePointerMove}
            onPointerUp={handleDragHandlePointerUp}
            onPointerCancel={handleDragHandlePointerUp}
            className="shrink-0 flex items-center justify-center w-full cursor-ns-resize group"
            style={{ height: "12px", touchAction: "none" }}
          >
            <div className="w-8 h-1 rounded-full bg-neutral-700 group-hover:bg-brand-accent/60 transition-colors" />
          </div>
        )}

        {/* Drawer top bar: always visible */}
        <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-neutral-800/60">
          <div className="flex items-center gap-2">
            <Bot size={16} className="text-brand-accent" />
            <span className="text-xs font-semibold text-brand-text tracking-wide uppercase">Montag — AI Librarian</span>
          </div>
          {isDrawerOpen && (
            <button
              onClick={handleCloseDrawer}
              className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-neutral-800"
            >
              <X size={12} />
              <span>Back to Browse</span>
            </button>
          )}
        </div>

        {/* Message thread — only rendered when drawer is open */}
        {isDrawerOpen && (
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 custom-scrollbar">
            <AnimatePresence initial={false}>
              {chatHistory.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  {msg.role === "assistant" && (
                    <span className="text-[10px] font-semibold text-brand-accent/70 uppercase tracking-wider mb-1 ml-1">Montag</span>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-brand-accent text-white rounded-br-sm"
                        : "bg-neutral-800 text-brand-text rounded-bl-sm border border-neutral-700/50"
                    }`}
                  >
                    {msg.role === "user" ? (
                      msg.content
                    ) : msg.content ? (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                          em: ({ children }) => <em className="italic text-neutral-300">{children}</em>,
                          ul: ({ children }) => <ul className="list-disc list-outside ml-4 mb-2 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-outside ml-4 mb-2 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                          code: ({ children }) => <code className="bg-neutral-700/60 rounded px-1 py-0.5 text-xs font-mono text-neutral-200">{children}</code>,
                          h1: ({ children }) => <h1 className="font-semibold text-white text-base mb-1 mt-2">{children}</h1>,
                          h2: ({ children }) => <h2 className="font-semibold text-white text-sm mb-1 mt-2">{children}</h2>,
                          h3: ({ children }) => <h3 className="font-medium text-neutral-200 text-sm mb-1 mt-1">{children}</h3>,
                          blockquote: ({ children }) => <blockquote className="border-l-2 border-brand-accent/50 pl-3 italic text-neutral-400 my-2">{children}</blockquote>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      // Typing indicator for empty streaming placeholder
                      <span className="flex items-center gap-1 h-4">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Chat input — always visible at bottom of drawer */}
        <div className="shrink-0 px-3 py-2.5 border-t border-neutral-800/60">
          <form
            onSubmit={handleChatSubmit}
            className="relative flex flex-row items-center overflow-hidden bg-neutral-950 border border-neutral-800 rounded-xl p-1.5 transition-all focus-within:border-brand-accent focus-within:shadow-[0_0_20px_rgba(128,0,0,0.15)]"
          >
            <div className="pl-2 pr-1 text-brand-accent flex items-center justify-center shrink-0">
              <Sparkles size={16} />
            </div>
            <input
              ref={chatInputRef}
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="In the mood for something specific?"
              disabled={isStreaming}
              className="flex-grow min-w-0 bg-transparent py-2 px-2 text-brand-text border-none focus:outline-none focus:ring-0 placeholder-neutral-500 font-medium text-sm disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isStreaming}
              className="shrink-0 h-[36px] w-[36px] flex items-center justify-center bg-brand-accent hover:bg-brand-accent/90 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-semibold rounded-lg transition-colors ml-1"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>

      {/* ── BOOK DETAIL MODAL ─────────────────────────────────────────────────── */}
      {selectedBook && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedBook(null)}>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl overflow-y-auto max-h-[90vh] shadow-2xl relative custom-scrollbar" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedBook(null)}
              className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/50 rounded-full text-white z-10 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col sm:flex-row h-full">
              <div className="w-full sm:w-2/5 aspect-[2/3] bg-neutral-850 relative flex items-center justify-center">
                <BookCover
                  url={selectedBook.volumeInfo.imageLinks?.thumbnail}
                  alt={selectedBook.volumeInfo.title}
                />
              </div>
              <div className="p-6 sm:p-8 flex-1 flex flex-col min-w-0">
                <h2 className="font-serif text-2xl font-bold text-white mb-1 leading-snug">
                  {selectedBook.volumeInfo.title}
                </h2>
                <p className="text-brand-accent font-medium mb-3.5">
                  {selectedBook.volumeInfo.authors?.join(", ") || "Unknown Author"}
                </p>

                <button
                  onClick={async () => {
                    if (!isBookFinished) {
                      await handleAddToLibrary("Finished");
                    }
                  }}
                  disabled={isBookFinished}
                  className={`w-full mb-4 py-2.5 px-4 rounded-xl text-xs font-semibold tracking-wide border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isBookFinished
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 cursor-default"
                      : "border-brand-accent bg-transparent text-brand-text hover:bg-brand-accent hover:text-white"
                  }`}
                >
                  {isBookFinished ? (
                    <><span>✓ In Finished Books</span></>
                  ) : (
                    <><span>+ Move to Finished</span></>
                  )}
                </button>

                <div className="text-sm text-neutral-300 mb-6 leading-relaxed overflow-y-auto max-h-48 pr-2 custom-scrollbar prose prose-invert prose-sm max-w-none">
                  {selectedBook.aiBlurb && (
                    <div className="mb-4 bg-brand-accent/10 border border-brand-accent/20 rounded-md p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Sparkles size={12} className="text-brand-accent" />
                        <span className="text-xs font-semibold text-brand-text">AI Curation Notes</span>
                      </div>
                      <p className="text-xs text-brand-text/80 leading-relaxed italic">"{selectedBook.aiBlurb}"</p>
                    </div>
                  )}
                  <div dangerouslySetInnerHTML={{ __html: selectedBook.volumeInfo.description || "No description available for this book." }} />
                </div>

                <div className="mt-auto pt-4 border-t border-neutral-800 flex flex-col gap-3">
                  <button
                    onClick={handleStartReview}
                    className="w-full bg-brand-accent hover:bg-brand-accent/90 text-white font-medium py-3 rounded-xl transition-colors shadow-lg cursor-pointer"
                  >
                    Start Deep Review
                  </button>
                  <div className="grid grid-cols-4 gap-2">
                    <button onClick={() => handleAddToLibrary("TBR")} className="py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs font-medium text-brand-text transition-colors cursor-pointer">TBR</button>
                    <button onClick={() => handleAddToLibrary("Reading")} className="py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs font-medium text-brand-text transition-colors cursor-pointer">Reading</button>
                    <button onClick={() => handleAddToLibrary("Finished")} className="py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs font-medium text-brand-text transition-colors cursor-pointer">Finished</button>
                    <button onClick={() => handleAddToLibrary("DNF")} className="py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs font-medium text-red-400 transition-colors cursor-pointer">DNF</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function TrendingIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-brand-accent ${className}`}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
      <polyline points="16 7 22 7 22 13"></polyline>
    </svg>
  );
}
