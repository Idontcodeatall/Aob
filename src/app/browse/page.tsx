"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Image as ImageIcon, X, Bot, Sparkles, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useReviews, LibraryStatus } from "@/lib/ReviewContext";
import { getGenreFrequency, getAggregateRadar } from "@/lib/analytics";
import { motion, AnimatePresence } from "framer-motion";
import { getHighResCover } from "@/lib/utils";
import { BookCover } from "@/components/BookCover";
import { supabase } from "@/utils/supabaseClient";


type ViewState = "trending" | "search" | "ai";

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


  // AI State
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<any[]>([]);

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
  const reviewsWithRatings = useMemo(() => posts.filter((p) => p.type === "DeepReview" && p.ratings), [posts]);
  const genreData = useMemo(() => getGenreFrequency(finishedBooks), [finishedBooks]);
  const aggregateRadar = useMemo(() => getAggregateRadar(reviewsWithRatings), [reviewsWithRatings]);

  const NYT_API_KEY = process.env.NEXT_PUBLIC_NYT_API_KEY || "";

  // Mapping selectedGenre UI strings to NYT internal list names
  const getNYTListName = (genre: string) => {
    switch (genre) {
      case "Fiction": return "hardcover-fiction";
      case "Non-Fiction": return "hardcover-nonfiction";

      case "All": return "hardcover-fiction"; // Defaulting curation to fiction
      default: return "hardcover-fiction";
    }
  };

  // Fetch Trending Logic using NYT + Open Library Hybrid
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
        // Fetch both Fiction and Non-Fiction concurrently
        const [fiction, nonFiction] = await Promise.all([
          fetchList("hardcover-fiction"),
          fetchList("hardcover-nonfiction")
        ]);
        // Combine and shuffle or just interleave for a good "All" mix
        nytBooks = [...fiction, ...nonFiction].sort(() => Math.random() - 0.5);
      } else {
        const listName = getNYTListName(selectedGenre);
        nytBooks = await fetchList(listName);
      }
      
      // Transform NYT format to match our internal Volume structure for UI consistency
      const transformedBooks = nytBooks.map((b: any) => ({
        id: b.primary_isbn13 || `${b.title.replace(/\s+/g, '-').toLowerCase()}-${b.author.replace(/\s+/g, '-').toLowerCase()}`,
        volumeInfo: {
          title: b.title,
          authors: [b.author],
          // Hybrid Cover Fix: Prefer NYT image but allow fallback to Open Library if ISBN exists
          imageLinks: { 
            thumbnail: b.book_image || (b.primary_isbn13 ? `https://covers.openlibrary.org/b/isbn/${b.primary_isbn13}-L.jpg` : "") 
          },
          description: b.description,
          categories: [selectedGenre],
          pageCount: 300 // Standard placeholder
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
      setSearchResults(data.items || []);
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

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    
    setView("ai");
    setAiLoading(true);
    setQuery(""); // clear search bar visually
    
    // Simulate AI delay and fetch specific books based on genre analysis + random curation
    setTimeout(() => {
      // Mock hardcoded response for UI demonstration
      const mockBooks = [
        {
          id: "m1",
          volumeInfo: {
            title: "The Will of the Many",
            authors: ["James Islington"],
            imageLinks: { thumbnail: "https://books.google.com/books/content?id=01iOEAAAQBAJ&printsec=frontcover&img=1&zoom=1" }
          },
          aiBlurb: `Because your aggregate rating for "Plot/Insight" is exceptionally high (${aggregateRadar.metricThree || 4.5}/5), this complex, layered narrative will reward your attention.`,
          contentWarnings: ["Existential Dread", "Political Violence"]
        },
        {
          id: "m2",
          volumeInfo: {
            title: "Red Rising",
            authors: ["Pierce Brown"],
            imageLinks: { thumbnail: "https://books.google.com/books/content?id=nIf_AwAAQBAJ&printsec=frontcover&img=1&zoom=1" }
          },
          aiBlurb: `A core pick for sci-fi fans. It balances pacing beautifully with immersive prose.`,
          contentWarnings: ["Graphic Violence"]
        },
        {
          id: "m3",
          volumeInfo: {
            title: "The Poppy War",
            authors: ["R.F. Kuang"],
            imageLinks: { thumbnail: "https://books.google.com/books/content?id=xT1QDwAAQBAJ&printsec=frontcover&img=1&zoom=1" }
          },
          aiBlurb: `A wildcard selection! It matches your vibe score but brings an entirely new cultural perspective to the genre.`,
          contentWarnings: ["Grief", "War Themes"]
        }
      ];
      
      setAiResults(mockBooks);
      setAiLoading(false);
      setAiPrompt("");
    }, 1500);
  };

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

    // Write to Supabase if user is authenticated
    if (session?.user?.id) {
      const { data, error } = await supabase.from('library').insert([{
        user_id: session.user.id,
        book_id: selectedBook.id,
        title,
        author,
        cover_url: thumbnail,
        status,
      }]);
      if (error) {
        console.error('CRITICAL SUPABASE INSERT ERROR:', error.message, error.details, error.hint);
      } else {
        console.log('[Supabase] Book inserted successfully:', data);
      }
    } else {
      console.warn('[handleAddToLibrary] No session — writing to local context only.');
    }

    // Always update local context for immediate UI
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
      console.error("[Add to TBR] No authenticated session found. User must be logged in.");
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
      // Roll back the loading spinner
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(book.id);
        return next;
      });
      return;
    }

    console.log('[Supabase] Book added to TBR successfully:', data);

    // Update local context for immediate UI
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

  return (
    <div className="flex-1 flex flex-col w-full h-screen mx-auto relative overflow-hidden bg-neutral-950">
      
      {/* FIXED HEADER (Responsive) */}
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

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto w-full pt-2 md:pt-48 pb-48 px-4 md:px-8 custom-scrollbar">
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

                {/* NYT curated lists don't need infinite scroll footer */}
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

            {/* AI LIBRARIAN VIEW */}
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

      {/* FIXED AI LIBRARIAN BOTTOM BAR */}
      <div 
        className="fixed left-0 md:left-64 right-0 w-auto z-[70] transition-all pointer-events-none px-4 md:px-8 flex justify-center md:bg-gradient-to-t md:from-neutral-950 md:via-neutral-950/95 md:to-transparent md:pt-16"
        style={{ 
          bottom: isMobile ? "calc(4rem + env(safe-area-inset-bottom))" : "0px",
          paddingBottom: isMobile ? "0px" : "2rem"
        }}
      >
        {/* Mobile: Solid Drawer | Desktop: Transparent Wrapper for the Island Form */}
        <div className="max-w-2xl mx-auto w-full pointer-events-auto bg-neutral-900 border-x border-t border-brand-accent/30 rounded-t-2xl md:rounded-b-2xl p-3 md:p-0 pb-2 md:pb-0 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] md:bg-transparent md:border-none md:shadow-none">
           <form 
              onSubmit={handleAiSubmit} 
              className="relative flex flex-row items-center overflow-hidden bg-neutral-950 md:bg-neutral-900 border border-neutral-800 md:border-brand-accent/30 rounded-xl md:rounded-2xl p-1.5 md:p-2 transition-all focus-within:border-brand-accent focus-within:shadow-[0_0_30px_rgba(128,0,0,0.2)] md:shadow-2xl"
           >
             <div className="pl-2 md:pl-3 pr-1 md:pr-2 text-brand-accent flex items-center justify-center shrink-0">
               <Bot size={20} className="md:w-6 md:h-6" />
             </div>
             <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ask your Personal Librarian..."
                className="flex-grow min-w-0 bg-transparent py-2 md:py-3 px-2 text-brand-text border-none focus:outline-none focus:ring-0 placeholder-neutral-500 font-medium text-xs md:text-base selection:bg-brand-accent/30"
             />
             <button 
                type="submit"
                disabled={!aiPrompt.trim() || aiLoading}
                className="shrink-0 w-[70px] md:w-[90px] h-[36px] md:h-[44px] flex items-center justify-center gap-2 bg-brand-accent hover:bg-brand-accent/90 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-semibold rounded-lg md:rounded-xl transition-colors ml-1"
             >
               <Sparkles size={14} className="md:w-4 md:h-4" />
               <span className="text-xs md:text-sm">Ask</span>
             </button>
           </form>
        </div>
      </div>

      {/* Book Detail Modal */}
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

                {/* Prominent Minimalist Add to Library Button */}
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
                    <>
                      <span>✓ In Finished Books</span>
                    </>
                  ) : (
                    <>
                      <span>+ Move to Finished</span>
                    </>
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

function TrendingIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-brand-accent ${className}`}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
      <polyline points="16 7 22 7 22 13"></polyline>
    </svg>
  );
}
