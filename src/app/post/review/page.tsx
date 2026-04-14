"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { BookType, Bold, Italic, Link2, List, Star, Search, Loader2, Upload, X } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useReviews } from "@/lib/ReviewContext";
import { FICTION_TOOLTIP, NONFICTION_TOOLTIP } from "@/lib/analytics";
import { useDebounce } from "@/hooks/useDebounce";
import { getHighResCover } from "@/lib/utils";
import { RichTextEditor } from "@/components/RichTextEditor";
import { BookCover } from "@/components/BookCover";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);


/* ─── Helper: Detect Fiction vs Non-Fiction ─── */
function detectFiction(cats: string): boolean {
  const lower = cats.toLowerCase();
  const nonfictionKeywords = [
    "nonfiction", "non-fiction", "biography", "autobiography", "self-help",
    "business", "economics", "history", "science", "mathematics", "philosophy",
    "psychology", "true crime", "politics", "religion", "cooking", "travel",
    "health", "fitness", "education", "reference", "technology", "computers",
    "medical", "law", "nature", "social science", "body, mind & spirit",
  ];
  return !nonfictionKeywords.some((kw) => lower.includes(kw));
}

/* ─── Google Books search result type ─── */
type BookSuggestion = {
  id: string;
  title: string;
  authors: string[];
  thumbnail: string;
  categories: string[];
};

function ReviewForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addPost } = useReviews();
  const categoriesParam = searchParams.get("categories") || "";
  const fromBrowse = !!(searchParams.get("title"));

  // ─── Core form state ───
  const [isFiction, setIsFiction] = useState(() => {
    if (categoriesParam) return detectFiction(categoriesParam);
    return true;
  });
  const [title, setTitle] = useState(searchParams.get("title") || "");
  const [author, setAuthor] = useState(searchParams.get("author") || "");
  const [coverUrl, setCoverUrl] = useState(searchParams.get("cover") || "");
  const [content, setContent] = useState("");
  const [generalRating, setGeneralRating] = useState(0);
  const [autoFilled, setAutoFilled] = useState(fromBrowse);
  const [customPhoto, setCustomPhoto] = useState<File | null>(null);
  const [customPhotoPreview, setCustomPhotoPreview] = useState<string>("");
  
  const [overlayQuote, setOverlayQuote] = useState("");
  
  const [ratings, setRatings] = useState({
    pacing: 3,
    metricTwo: 3,
    metricThree: 3,
    prose: 3,
    vibe: 3,
  });

  // ─── Smart Search state ───
  const [suggestions, setSuggestions] = useState<BookSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debouncedTitle = useDebounce(title, 700); // 700ms to avoid API rate limits
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── Fetch suggestions when debounced title changes ───
  useEffect(() => {
    if (autoFilled || fromBrowse) return;
    if (debouncedTitle.length < 4) {
      setSuggestions([]);
      setShowDropdown(false);
      setSearchError(null);
      return;
    }

    let cancelled = false;
    const fetchSuggestions = async () => {
      setSearchLoading(true);
      setSearchError(null);
      try {
        const res = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(debouncedTitle).replace(/%20/g, "+")}&printType=books&orderBy=relevance&maxResults=5&key=${process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY || ""}`
        );

        if (res.status === 429) {
          setSearchError("Rate limited — please wait a few seconds and try again");
          setSuggestions([]);
          setShowDropdown(false);
          return;
        }

        if (!res.ok) {
          setSearchError("Search unavailable — try again shortly");
          return;
        }

        const data = await res.json();
        if (cancelled) return;

        const items: BookSuggestion[] = (data.items || []).map((item: any) => ({
          id: item.id,
          title: item.volumeInfo?.title || "Unknown Title",
          authors: item.volumeInfo?.authors || ["Unknown Author"],
          thumbnail: item.volumeInfo?.imageLinks?.thumbnail || "",
          categories: item.volumeInfo?.categories || [],
        }));

        setSuggestions(items);
        setShowDropdown(items.length > 0);
      } catch (err) {
        console.error("Book search failed:", err);
        if (!cancelled) setSearchError("Network error — check your connection");
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    };

    fetchSuggestions();
    return () => { cancelled = true; };
  }, [debouncedTitle, autoFilled, fromBrowse]);

  // ─── Close dropdown on outside click ───
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── Select a suggestion ───
  const handleSelectSuggestion = (suggestion: BookSuggestion) => {
    setTitle(suggestion.title);
    setAuthor(suggestion.authors.join(", "));
    setCoverUrl(suggestion.thumbnail);
    setIsFiction(detectFiction(suggestion.categories.join(", ")));
    setAutoFilled(true);
    setShowDropdown(false);
    setSuggestions([]);
  };

  // ─── Clear auto-fill when title is manually edited ───
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    if (autoFilled && !fromBrowse) {
      setAutoFilled(false);
    }
  };

  const handleRatingChange = (key: keyof typeof ratings, value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
  };

  const handlePublish = () => {
    // Validation
    if (!title || !author || generalRating === 0) {
      alert("Please ensure you've selected a book (Title & Author) and provided a star rating.");
      return;
    }

    addPost({
      id: Date.now().toString(),
      type: "DeepReview",
      author: "Local User",
      authorInitials: "LU",
      timeAgo: "Just now",
      bookTitle: title,
      bookAuthor: author,
      content,
      overlayQuote: overlayQuote || undefined,
      coverUrl: coverUrl,
      customCoverUrl: customPhotoPreview || undefined,
      isFiction,
      generalRating,
      ratings: { ...ratings }
    });
    router.push("/");
  };

  const labels = isFiction
    ? ["Pacing", "Characters", "Plot", "Prose", "Vibe"]
    : ["Pacing", "Persona", "Insight", "Prose", "Vibe"];

  const chartData = {
    labels,
    datasets: [
      {
        label: "Book Rating",
        data: [ratings.pacing, ratings.metricTwo, ratings.metricThree, ratings.prose, ratings.vibe],
        backgroundColor: "rgba(128, 0, 0, 0.6)",
        borderColor: "#FFFFFF",
        borderWidth: 2,
        pointBackgroundColor: "#FFFFFF",
        pointBorderColor: "#800000",
        pointHoverBackgroundColor: "#FFFFFF",
        pointHoverBorderColor: "#800000",
      },
    ],
  };

  const chartOptions = {
    scales: {
      r: {
        min: 0,
        max: 5,
        ticks: { stepSize: 1, display: false },
        grid: { color: "rgba(255, 255, 255, 0.15)" },
        angleLines: { color: "rgba(255, 255, 255, 0.15)" },
        pointLabels: {
          color: "#E5E5E5",
          font: { family: "var(--font-inter)", size: 12, weight: 600 as const },
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(18, 18, 18, 0.9)",
        titleColor: "#FFFFFF",
        bodyColor: "#E5E5E5",
        titleFont: { family: "var(--font-serif)", size: 13 },
        bodyFont: { family: "var(--font-inter)", size: 12 },
        padding: 10,
        callbacks: {
          title: function(tooltipItems: any) {
            return tooltipItems[0]?.label || '';
          },
          label: function(context: any) {
             return `Rating: ${context.raw} / 5`;
          }
        }
      },
    },
    maintainAspectRatio: false,
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
      {/* Left Column: Form Controls */}
      <div className="lg:col-span-7 space-y-8">
        <section className="space-y-4">
          <h2 className="font-semibold text-brand-text/80 uppercase tracking-wider text-sm border-b border-neutral-800 pb-2">
            Book Details
          </h2>

          {/* ─── Smart Book Title Search ─── */}
          <div className="relative">
            <label className="block text-sm font-medium text-neutral-400 mb-1">Title</label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={title}
                onChange={handleTitleChange}
                onFocus={() => suggestions.length > 0 && !autoFilled && setShowDropdown(true)}
                placeholder="Start typing to search Google Books..."
                className={`w-full bg-neutral-900 border rounded-lg px-4 py-2.5 pr-10 text-brand-text focus:outline-none transition-colors ${
                  autoFilled
                    ? "border-brand-accent/50 bg-brand-accent/5"
                    : "border-neutral-800 focus:border-brand-accent"
                }`}
              />
              {/* Search / Loading indicator */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {searchLoading ? (
                  <Loader2 size={16} className="text-brand-accent animate-spin" />
                ) : (
                  <Search size={16} className="text-neutral-600" />
                )}
              </div>
            </div>

            {/* Auto-filled indicator */}
            {autoFilled && !fromBrowse && (
              <p className="text-xs text-brand-accent mt-1.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent inline-block" />
                Auto-filled from Google Books.{" "}
                <button
                  onClick={() => {
                    setAutoFilled(false);
                    setTitle("");
                    setAuthor("");
                    setCoverUrl("");
                    inputRef.current?.focus();
                  }}
                  className="underline hover:text-brand-text transition-colors"
                >
                  Clear
                </button>
              </p>
            )}

            {/* Error message (rate limit, network, etc.) */}
            {searchError && (
              <p className="text-xs text-amber-400 mt-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block shrink-0" />
                {searchError}
              </p>
            )}

            {/* ─── Dropdown Suggestions ─── */}
            {showDropdown && (
              <div
                ref={dropdownRef}
                className="absolute z-50 w-full mt-1.5 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl shadow-black/40 overflow-hidden"
              >
                {suggestions.map((book, idx) => (
                  <button
                    key={book.id}
                    onClick={() => handleSelectSuggestion(book)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-neutral-800 transition-colors ${
                      idx !== suggestions.length - 1 ? "border-b border-neutral-800/50" : ""
                    }`}
                  >
                    {/* Cover thumbnail */}
                    <div className="w-10 h-14 bg-neutral-800 rounded overflow-hidden shrink-0">
                      <BookCover 
                        url={book.thumbnail} 
                        alt={book.title} 
                      />
                    </div>
                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-brand-text truncate">
                        {book.title}
                      </p>
                      <p className="text-xs text-neutral-400 truncate">
                        {book.authors.join(", ")}
                      </p>
                      {book.categories.length > 0 && (
                        <p className="text-[10px] text-neutral-600 mt-0.5 truncate">
                          {book.categories.join(" · ")}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Author */}
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Author</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="e.g. Donna Tartt"
              className={`w-full bg-neutral-900 border rounded-lg px-4 py-2.5 text-brand-text focus:outline-none transition-colors ${
                autoFilled
                  ? "border-brand-accent/50 bg-brand-accent/5"
                  : "border-neutral-800 focus:border-brand-accent"
              }`}
            />
          </div>

        {/* ─── Quote Section ─── */}
        <section className="space-y-4">
          <h2 className="font-semibold text-brand-text/80 uppercase tracking-wider text-sm border-b border-neutral-800 pb-2">
            Quote Highlight
          </h2>
          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Optional Book Quote
            </label>
            <textarea
              value={overlayQuote}
              onChange={(e) => setOverlayQuote(e.target.value)}
              placeholder="A specific line to feature over the book cover (appears in maroon brackets)..."
              rows={2}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-brand-text focus:outline-none focus:border-brand-accent transition-colors resize-none text-sm italic"
            />
            <p className="text-[10px] text-neutral-500 mt-2">This quote will be displayed in the maroon-bracket overlay on the Home Feed.</p>
          </div>
        </section>

          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-2">Book Type</label>
            <div className={`flex bg-neutral-900 rounded-lg p-1 border border-neutral-800 w-fit ${autoFilled ? "opacity-60 cursor-not-allowed" : ""}`}>
              <button
                onClick={() => !autoFilled && setIsFiction(true)}
                disabled={autoFilled}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  isFiction ? "bg-neutral-800 text-brand-text shadow-sm" : "text-neutral-500 hover:text-neutral-300"
                } ${autoFilled ? "cursor-not-allowed" : ""}`}
              >
                Fiction
              </button>
              <button
                onClick={() => !autoFilled && setIsFiction(false)}
                disabled={autoFilled}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  !isFiction ? "bg-neutral-800 text-brand-text shadow-sm" : "text-neutral-500 hover:text-neutral-300"
                } ${autoFilled ? "cursor-not-allowed" : ""}`}
              >
                Non-Fiction
              </button>
            </div>
            {autoFilled && (
              <p className="text-xs text-neutral-500 mt-2">Auto-detected from Google Books categories.</p>
            )}
          </div>
        </section>

        {/* ─── Photo Upload Section ─── */}
        <section className="space-y-4">
          <h2 className="font-semibold text-brand-text/80 uppercase tracking-wider text-sm border-b border-neutral-800 pb-2">
            Post Image
          </h2>
          <p className="text-xs text-neutral-500">Upload your own photo for this review. If left empty, the book cover from the API will be used.</p>
          
          {customPhotoPreview ? (
            <div className="relative w-full max-w-xs aspect-[4/5] rounded-xl overflow-hidden border border-neutral-700">
              <img src={customPhotoPreview} alt="Custom cover" className="w-full h-full object-cover" />
              <button
                onClick={() => {
                  setCustomPhoto(null);
                  setCustomPhotoPreview("");
                }}
                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full max-w-xs aspect-[4/5] rounded-xl border-2 border-dashed border-neutral-700 hover:border-brand-accent/50 bg-neutral-900/50 cursor-pointer transition-colors group">
              <Upload size={28} className="text-neutral-600 group-hover:text-brand-accent transition-colors mb-2" />
              <span className="text-sm text-neutral-500 group-hover:text-neutral-300 transition-colors">Click to upload a photo</span>
              <span className="text-[10px] text-neutral-600 mt-1">JPG, PNG, WebP</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setCustomPhoto(file);
                    setCustomPhotoPreview(URL.createObjectURL(file));
                  }
                }}
              />
            </label>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="font-semibold text-brand-text/80 uppercase tracking-wider text-sm border-b border-neutral-800 pb-2">
            General Rating
          </h2>
          <div className="flex gap-2 items-center bg-neutral-900/50 p-4 rounded-xl border border-neutral-800 w-fit">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setGeneralRating(star)}
                className={`p-1 transition-transform hover:scale-110 ${
                  star <= generalRating ? "text-brand-accent" : "text-neutral-700"
                }`}
              >
                <Star size={28} fill={star <= generalRating ? "currentColor" : "none"} strokeWidth={1.5} />
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="font-semibold text-brand-text/80 uppercase tracking-wider text-sm border-b border-neutral-800 pb-2">
            Deep Analysis
          </h2>
          <div className="space-y-5 bg-neutral-900/50 p-6 rounded-xl border border-neutral-800">
            {labels.map((label, index) => {
              const stateKeys = ["pacing", "metricTwo", "metricThree", "prose", "vibe"] as const;
              const stateKey = stateKeys[index];
              const tooltipMap = isFiction ? FICTION_TOOLTIP : NONFICTION_TOOLTIP;
              const definition = tooltipMap[label] || "";
              return (
                <div key={label}>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-medium text-brand-text">{label}</label>
                    <span className="text-sm text-brand-accent font-semibold">{ratings[stateKey]} / 5</span>
                  </div>
                  {definition && (
                    <p className="text-xs text-neutral-500 mb-2">{definition}</p>
                  )}
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={ratings[stateKey]}
                    onChange={(e) => handleRatingChange(stateKey, parseInt(e.target.value))}
                    className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-brand-accent"
                  />
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-semibold text-brand-text/80 uppercase tracking-wider text-sm border-b border-neutral-800 pb-2">
            The Essay
          </h2>
          <RichTextEditor
            content={content}
            onChange={(html) => setContent(html)}
            placeholder="Compose your thoughts..."
          />
        </section>

        <button 
          onClick={handlePublish}
          disabled={!title || !author || generalRating === 0}
          className={`w-full py-3.5 rounded-xl font-medium shadow-lg transition-all flex items-center justify-center gap-2 ${
            (!title || !author || generalRating === 0)
              ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
              : "bg-brand-accent hover:bg-brand-accent/90 text-white active:scale-95"
          }`}
          title={(!title || !author || generalRating === 0) ? "Please add a book and a rating" : "Publish to Feed"}
        >
          <BookType size={18} />
          Publish Deep Review
        </button>
      </div>

      {/* Right Column: Dynamic Preview with Aesthetic Overlay */}
      <div className="lg:col-span-5 relative lg:sticky lg:top-8 h-fit">
        <h2 className="font-semibold text-brand-text/80 uppercase tracking-wider text-sm border-b border-neutral-800 pb-2 mb-6">
          Live Preview
        </h2>
        
        <div className="relative w-full aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl ring-1 ring-neutral-800 group">
          <div 
            className="absolute inset-0 bg-cover bg-center blur-xl scale-125 transition-transform duration-700 group-hover:scale-110" 
            style={{ backgroundImage: `url('${customPhotoPreview || coverUrl || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80"}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
          
          <div className="relative z-10 w-full h-full p-8 flex flex-col">
            <div className="flex-1 flex items-center justify-center mt-4">
               <div className="w-full aspect-square max-w-[320px]">
                 <Radar data={chartData} options={chartOptions} />
               </div>
            </div>

            <div className="mt-auto pt-6 text-center">
              <span className="inline-block px-3 py-1 bg-brand-accent/20 text-brand-text border border-brand-accent/30 rounded-full text-xs font-semibold tracking-wider uppercase mb-4 backdrop-blur-sm shadow-xl">
                {isFiction ? "Fiction" : "Non-Fiction"}
              </span>
              <h3 className="font-serif text-3xl font-bold text-white shadow-sm mb-2 drop-shadow-md">
                {title || "Untitled Masterpiece"}
              </h3>
              <p className="text-white/80 font-medium tracking-wide mb-3">
                {author || "Anonymous"}
              </p>
              <div className="flex justify-center gap-1 text-brand-accent mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={16}
                    fill={star <= generalRating ? "currentColor" : "none"}
                    className={star <= generalRating ? "text-brand-accent drop-shadow-md" : "text-white/30"}
                    strokeWidth={1.5}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay" style={{ backgroundImage: `url('data:image/svg+xml,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)"/%3E%3C/svg%3E')` }} />
        </div>
      </div>
    </div>
  );
}

export default function CreateDeepReview() {
  return (
    <div className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 min-h-full">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-brand-text mb-2">Create Deep Review</h1>
        <p className="text-neutral-400">Deconstruct your latest read and share your insights.</p>
      </div>
      <Suspense fallback={<div className="text-brand-accent">Loading...</div>}>
         <ReviewForm />
      </Suspense>
    </div>
  );
}
