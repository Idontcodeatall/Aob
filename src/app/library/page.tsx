"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useReviews, LibraryStatus, Post, LibraryItem } from "@/lib/ReviewContext";
import { supabase } from "@/utils/supabaseClient";
import { getHighResCover } from "@/lib/utils";
import { BookCover } from "@/components/BookCover";
import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
} from "chart.js";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Image as ImageIcon,
  Plus,
  PenLine,
  Ghost,
  BookMarked,
  Sparkles,
  Heart,
  Coffee,
  Star,
  X,
  Trash2,
} from "lucide-react";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, ChartTooltip, ChartLegend);

const TAB_META: Record<
  LibraryStatus,
  { emptyIcon: React.ElementType; emptyTitle: string; emptySubtext: string }
> = {
  TBR: {
    emptyIcon: BookMarked,
    emptyTitle: "Your to-be-read pile is empty",
    emptySubtext:
      "Dangerously clean shelf. Browse some books and start stacking.",
  },
  Reading: {
    emptyIcon: Coffee,
    emptyTitle: "Nothing in progress",
    emptySubtext: "Pick up something from your TBR. The pages won't turn themselves.",
  },
  Finished: {
    emptyIcon: Sparkles,
    emptyTitle: "No finished books yet",
    emptySubtext: "Every great reader starts somewhere. You'll fill this soon.",
  },
  DNF: {
    emptyIcon: Ghost,
    emptyTitle: "No books here yet",
    emptySubtext: "Give up on something? We won't judge.",
  },
};

function ProgressUpdateModal({
  book,
  onClose,
  onUpdate,
}: {
  book: { id: string; title: string; pagesRead: number; totalPages: number };
  onClose: () => void;
  onUpdate: (id: string, pages: number) => void;
}) {
  const [pages, setPages] = useState(book.pagesRead);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className="bg-neutral-900 border border-neutral-700/50 rounded-2xl p-6 w-80 shadow-2xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-serif text-lg text-brand-text mb-1">
          Update Progress
        </h3>
        <p className="text-sm text-neutral-400 mb-5 truncate">{book.title}</p>

        <div className="flex items-end gap-3 mb-4">
          <div className="flex-1">
            <label className="text-xs text-neutral-500 mb-1 block">
              Pages read
            </label>
            <input
              ref={inputRef}
              type="number"
              value={pages}
              onChange={(e) =>
                setPages(
                  Math.max(
                    0,
                    Math.min(parseInt(e.target.value) || 0, book.totalPages)
                  )
                )
              }
              min={0}
              max={book.totalPages}
              autoFocus
              className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2.5 text-brand-text text-lg font-medium focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/30 transition-all"
            />
          </div>
          <span className="text-neutral-500 text-sm pb-3">
            / {book.totalPages}
          </span>
        </div>

        {/* Mini progress preview */}
        <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden mb-5">
          <motion.div
            className="h-full rounded-full"
            style={{
              background:
                "linear-gradient(90deg, #800000, #a52a2a, #800000)",
            }}
            initial={{ width: `${(book.pagesRead / book.totalPages) * 100}%` }}
            animate={{
              width: `${Math.min(100, (pages / book.totalPages) * 100)}%`,
            }}
            transition={{ type: "spring", damping: 20, stiffness: 200 }}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm text-neutral-400 bg-neutral-800 hover:bg-neutral-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onUpdate(book.id, pages);
              onClose();
            }}
            className="flex-1 py-2.5 rounded-lg text-sm text-white bg-brand-accent hover:bg-brand-accent/80 transition-colors font-medium"
          >
            Save
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function BookCard({
  item,
  onUpdateProgress,
  onRemove,
  review,
  onClick,
}: {
  item: LibraryItem;
  onUpdateProgress: (id: string) => void;
  onRemove: (id: string) => void;
  review?: Post | null;
  onClick?: () => void;
}) {
  const router = useRouter();
  const progress = Math.min(
    100,
    Math.round((item.pagesRead / item.totalPages) * 100)
  );
  const isReading = item.status === "Reading";
  const isFinished = item.status === "Finished";
  const hasReview = review && review.ratings;

  // Mini radar for reviews
  const miniRadarData = hasReview ? {
    labels: review.isFiction
      ? ["Pacing", "Characters", "Plot", "Prose", "Vibe"]
      : ["Pacing", "Persona", "Insight", "Prose", "Vibe"],
    datasets: [{
      data: [
        review.ratings!.pacing, review.ratings!.metricTwo, review.ratings!.metricThree,
        review.ratings!.prose, review.ratings!.vibe,
      ],
      backgroundColor: "rgba(128, 0, 0, 0.7)",
      borderColor: "#FFFFFF",
      borderWidth: 1.5,
      pointBackgroundColor: "#FFFFFF",
      pointRadius: 0,
    }],
  } : null;

  const miniOptions = {
    scales: {
      r: {
        min: 0, max: 5,
        ticks: { display: false },
        grid: { color: "rgba(255,255,255,0.15)" },
        angleLines: { color: "rgba(255,255,255,0.15)" },
        pointLabels: { display: false },
      },
    },
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    maintainAspectRatio: false,
  };

  const hasCustomCover = review?.customCoverUrl || item.userImageUrl;
  const coverUrl = review?.customCoverUrl || item.userImageUrl || review?.coverUrl || item.thumbnail;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className={`group flex flex-col ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      {/* Cover container — 2:3 aspect ratio */}
      <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-neutral-800/80 shadow-lg group-hover:shadow-2xl group-hover:shadow-brand-accent/10 transition-all duration-500">
        {/* Cover image via SmartBookCover */}
        {hasCustomCover ? (
          <img 
            src={coverUrl}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <BookCover 
            url={coverUrl} 
            alt={item.title} 
            className="group-hover:scale-105 transition-transform duration-700" 
          />
        )}

        {/* Floating stats on cover (Reading items only) */}
        {isReading && (
          <div className="absolute bottom-0 right-0 left-0">
            {/* Dark gradient bed for readability */}
            <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-8 pb-2 px-2.5 flex justify-end">
              <span className="font-serif text-[11px] text-white/90 tracking-wide drop-shadow-lg">
                {progress}% · {item.pagesRead}/{item.totalPages}p
              </span>
            </div>
          </div>
        )}

        {/* Glowing progress bar — sits at the absolute bottom edge of the cover */}
        {isReading && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-neutral-900/60">
            <motion.div
              className="h-full rounded-r-full"
              style={{
                width: `${progress}%`,
                background:
                  "linear-gradient(90deg, #800000, #b33a3a)",
                boxShadow:
                  "0 0 8px rgba(128, 0, 0, 0.6), 0 0 20px rgba(128, 0, 0, 0.3)",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{
                duration: 1.2,
                ease: "easeOut",
                delay: 0.2,
              }}
            />
          </div>
        )}

        {/* Hover overlay — type-aware for Finished */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-300 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100">
          {/* Finished with review → Radar + Stars */}
          {isFinished && hasReview && miniRadarData ? (
            <>
              <div className="flex items-center gap-0.5 mb-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={12}
                    fill={s <= (review.generalRating || 0) ? "currentColor" : "none"}
                    className={s <= (review.generalRating || 0) ? "text-brand-accent" : "text-neutral-600"}
                  />
                ))}
              </div>
              <div className="w-16 h-16">
                <Radar data={miniRadarData} options={miniOptions} />
              </div>
            </>
          ) : (
            /* Default: action buttons */
            <div className="flex gap-2">
              {isReading && (
                <button
                  onClick={(e) => { e.stopPropagation(); onUpdateProgress(item.id); }}
                  className="p-2.5 rounded-full bg-brand-accent/90 backdrop-blur-sm text-white hover:bg-brand-accent transition-all duration-200 hover:scale-110 shadow-lg"
                  title="Update progress"
                >
                  <Plus size={18} />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/post/review?book_id=${item.id}`);
                }}
                className="p-2.5 rounded-full bg-white/15 backdrop-blur-sm text-white hover:bg-white/25 transition-all duration-200 hover:scale-110 shadow-lg"
                title="Write review"
              >
                <PenLine size={18} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
                className="p-2.5 rounded-full bg-red-900/70 backdrop-blur-sm text-red-200 hover:bg-red-700 transition-all duration-200 hover:scale-110 shadow-lg"
                title="Remove from library"
              >
                <Trash2 size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Title & Author below the cover */}
      <div className="mt-2.5 px-0.5">
        <h3 className="text-sm font-semibold text-brand-text truncate group-hover:text-brand-accent transition-colors duration-300">
          {item.title}
        </h3>
        <p className="text-xs text-neutral-500 truncate mt-0.5">
          {item.author}
        </p>
      </div>
    </motion.div>
  );
}

const modalRadarOptions = {
  scales: {
    r: {
      min: 0,
      max: 5,
      ticks: { display: false },
      grid: { color: "rgba(255, 255, 255, 0.2)" },
      angleLines: { color: "rgba(255, 255, 255, 0.2)" },
      pointLabels: {
        color: "rgba(255, 255, 255, 0.9)",
        font: { size: 9, weight: "bold" as const },
      },
    },
  },
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
  maintainAspectRatio: true,
};

export default function LibraryPage() {
  const { library, updateLibraryProgress, removeFromLibrary, updateLibraryItem, posts, session } = useReviews();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<LibraryStatus>("Reading");
  const [progressModal, setProgressModal] = useState<string | null>(null);
  const [selectedReviewBook, setSelectedReviewBook] = useState<{ item: LibraryItem; review: Post | null } | null>(null);

  const handleRemoveBook = async (bookId: string) => {
    // Optimistically remove from UI immediately
    removeFromLibrary(bookId);

    if (!session?.user?.id) {
      console.warn('[handleRemoveBook] No session — removed from local context only.');
      return;
    }

    const { error } = await supabase
      .from('library')
      .delete()
      .eq('book_id', bookId)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('CRITICAL SUPABASE DELETE ERROR:', error.message, error.details, error.hint);
    } else {
      console.log('[Supabase] Book removed successfully. book_id:', bookId);
    }
  };

  const handleChangeStatus = async (bookId: string, newStatus: LibraryStatus) => {
    // Optimistic local update
    updateLibraryItem(bookId, { status: newStatus });

    // Update local modal state to prevent orphan visual state
    if (selectedReviewBook && selectedReviewBook.item.id === bookId) {
      setSelectedReviewBook({
        ...selectedReviewBook,
        item: { ...selectedReviewBook.item, status: newStatus }
      });
    }

    if (!session?.user?.id) {
      console.warn('[handleChangeStatus] No session — updated local context only.');
      return;
    }

    const { error } = await supabase
      .from('library')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('book_id', bookId)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('CRITICAL SUPABASE UPDATE ERROR:', error.message, error.details, error.hint);
    } else {
      console.log('[Supabase] Status updated to', newStatus, 'for book_id:', bookId);
    }
  };

  const tabs: LibraryStatus[] = ["TBR", "Reading", "Finished", "DNF"];
  const displayItems = library.filter((item) => item.status === activeTab);
  const modalBook = progressModal
    ? library.find((i) => i.id === progressModal)
    : null;

  // Build a map of book title → review for quick lookup
  const reviewsByTitle = new Map<string, Post>();
  posts.filter((p) => p.type === "DeepReview" && p.ratings).forEach((p) => {
    reviewsByTitle.set(p.bookTitle, p);
  });

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-8 pt-6 pb-12 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <BookOpen size={24} className="text-brand-accent" />
          <h1 className="font-serif text-3xl font-bold text-brand-text tracking-tight">
            My Library
          </h1>
        </div>
        <p className="text-sm text-neutral-500 ml-[36px]">
          {library.length} book{library.length !== 1 ? "s" : ""} in your
          collection
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-neutral-800/60 mb-8">
        <div className="flex gap-8">
          {tabs.map((tab) => {
            const count = library.filter((i) => i.status === tab).length;
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="relative pb-3 group"
              >
                <span
                  className={`text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? "text-brand-text"
                      : "text-neutral-500 group-hover:text-neutral-300"
                  }`}
                >
                  {tab}
                </span>
                <span
                  className={`ml-1.5 text-[11px] tabular-nums transition-colors duration-200 ${
                    isActive
                      ? "text-neutral-400"
                      : "text-neutral-600 group-hover:text-neutral-500"
                  }`}
                >
                  {count}
                </span>
                {/* Active underline */}
                {isActive && (
                  <motion.div
                    layoutId="library-tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                    style={{
                      background:
                        "linear-gradient(90deg, #800000, #a52a2a)",
                      boxShadow: "0 1px 8px rgba(128, 0, 0, 0.4)",
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 30,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {displayItems.length === 0 ? (
          <motion.div
            key={`empty-${activeTab}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            {/* Ghost book icon */}
            <div className="mb-6 relative">
              <div className="w-20 h-20 rounded-2xl bg-neutral-800/50 border border-neutral-700/30 flex items-center justify-center">
                {(() => {
                  const IconComp = TAB_META[activeTab].emptyIcon;
                  return (
                    <IconComp
                      size={32}
                      className="text-neutral-600"
                      strokeWidth={1.5}
                    />
                  );
                })()}
              </div>
              {/* Subtle floating particles */}
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-brand-accent/20 animate-pulse" />
              <div className="absolute -bottom-2 -left-2 w-2 h-2 rounded-full bg-brand-accent/15 animate-pulse delay-300" />
            </div>
            <h3 className="font-serif text-lg text-neutral-300 mb-2">
              {TAB_META[activeTab].emptyTitle}
            </h3>
            <p className="text-sm text-neutral-500 max-w-xs leading-relaxed">
              {TAB_META[activeTab].emptySubtext}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={`grid-${activeTab}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8"
          >
            <AnimatePresence>
              {displayItems.map((item) => (
                <BookCard
                  key={item.id}
                  item={item}
                  onUpdateProgress={(id) => setProgressModal(id)}
                  onRemove={handleRemoveBook}
                  review={reviewsByTitle.get(item.title) || null}
                  onClick={activeTab === "Finished" ? () => setSelectedReviewBook({ item, review: reviewsByTitle.get(item.title) || null }) : undefined}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Update Modal */}
      <AnimatePresence>
        {modalBook && (
          <ProgressUpdateModal
            key="progress-modal"
            book={modalBook}
            onClose={() => setProgressModal(null)}
            onUpdate={updateLibraryProgress}
          />
        )}
      </AnimatePresence>

      {/* Review Detail Modal */}
      {selectedReviewBook && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedReviewBook(null)}>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            {selectedReviewBook.review && (
              <button 
                onClick={() => {
                  const bookId = selectedReviewBook.item.id;
                  setSelectedReviewBook(null);
                  router.push(`/post/review?book_id=${bookId}`);
                }}
                className="absolute top-4 right-14 p-2 bg-black/20 hover:bg-black/50 rounded-full text-white z-10 transition-colors cursor-pointer"
                title="Edit review"
              >
                <PenLine size={20} />
              </button>
            )}
            <button 
              onClick={() => setSelectedReviewBook(null)}
              className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/50 rounded-full text-white z-10 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
            
            <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
              {/* Cover Column */}
              <div className="w-full md:w-1/2 bg-neutral-950 relative flex items-center justify-center aspect-[4/5] md:aspect-auto md:min-h-[400px]">
                {selectedReviewBook.review?.customCoverUrl || selectedReviewBook.item.userImageUrl ? (
                  <img
                    src={selectedReviewBook.review?.customCoverUrl || selectedReviewBook.item.userImageUrl}
                    alt={selectedReviewBook.item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BookCover 
                    url={selectedReviewBook.review?.coverUrl || selectedReviewBook.item.thumbnail} 
                    alt={selectedReviewBook.item.title} 
                    className="h-full"
                  />
                )}
                {selectedReviewBook.review && selectedReviewBook.review.ratings && (
                  <div className="absolute inset-0 bg-black/45 flex items-center justify-center p-4">
                    <div className="w-3/4 aspect-square opacity-95">
                      <Radar 
                        data={{
                          labels: selectedReviewBook.review.isFiction
                            ? ["Pacing", "Characters", "Plot", "Prose", "Vibe"]
                            : ["Pacing", "Persona", "Insight", "Prose", "Vibe"],
                          datasets: [{
                            data: [
                              selectedReviewBook.review.ratings.pacing,
                              selectedReviewBook.review.ratings.metricTwo,
                              selectedReviewBook.review.ratings.metricThree,
                              selectedReviewBook.review.ratings.prose,
                              selectedReviewBook.review.ratings.vibe,
                            ],
                            backgroundColor: "rgba(128, 0, 0, 0.45)",
                            borderColor: "rgba(255, 255, 255, 0.85)",
                            borderWidth: 2,
                            pointBackgroundColor: "#FFFFFF",
                            pointBorderColor: "#800000",
                            pointRadius: 3,
                          }],
                        }} 
                        options={modalRadarOptions} 
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Text/Content Column */}
              <div className="p-6 md:p-8 flex-1 flex flex-col min-w-0 overflow-y-auto max-h-[50vh] md:max-h-[90vh] custom-scrollbar">
                {/* Book Details */}
                <div className="mb-4">
                  <h2 className="font-serif text-2xl font-bold text-white mb-0.5 leading-snug">
                    {selectedReviewBook.item.title}
                  </h2>
                  <p className="text-brand-accent text-sm font-medium mb-3">
                    by {selectedReviewBook.item.author}
                  </p>
                  {/* Status Selector */}
                  <div className="flex gap-1.5 flex-wrap">
                    {(["TBR", "Reading", "Finished", "DNF"] as LibraryStatus[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => handleChangeStatus(selectedReviewBook.item.id, s)}
                        className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                          selectedReviewBook.item.status === s
                            ? "bg-brand-accent border-brand-accent text-white"
                            : "bg-transparent border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-200"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedReviewBook.review ? (
                  <>
                    {/* Rating */}
                    {selectedReviewBook.review.generalRating && (
                      <div className="flex items-center gap-0.5 mb-4">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={14}
                            fill={s <= selectedReviewBook.review!.generalRating! ? "currentColor" : "none"}
                            className={s <= selectedReviewBook.review!.generalRating! ? "text-brand-accent" : "text-neutral-700"}
                          />
                        ))}
                      </div>
                    )}

                    {/* Divider */}
                    <div className="border-t border-neutral-800 my-2" />

                    {/* Quote (if exists) */}
                    {(selectedReviewBook.review.overlayQuote || (selectedReviewBook.review as any).favoriteQuote || (selectedReviewBook.review as any).favorite_quote) && (
                      <div className="border-l-[3px] border-brand-accent pl-3 my-4 italic text-sm text-neutral-300">
                        "{selectedReviewBook.review.overlayQuote || (selectedReviewBook.review as any).favoriteQuote || (selectedReviewBook.review as any).favorite_quote}"
                      </div>
                    )}

                    {/* Essay Content */}
                    <div className="text-sm text-neutral-300 leading-relaxed prose prose-invert prose-sm max-w-none flex-grow">
                      <div dangerouslySetInnerHTML={{ __html: selectedReviewBook.review.content }} />
                    </div>
                  </>
                ) : (
                  <div className="flex-grow flex flex-col justify-center items-center text-center p-4">
                    <PenLine size={32} className="text-neutral-600 mb-3" />
                    <h3 className="font-serif text-base text-neutral-300 mb-2">No review written yet</h3>
                    <p className="text-xs text-neutral-500 max-w-[200px] mb-6 leading-relaxed">
                      Capture your rating profile and write a deep review for this book.
                    </p>
                    <button
                      onClick={() => {
                        const title = selectedReviewBook.item.title;
                        const author = selectedReviewBook.item.author;
                        const coverUrl = selectedReviewBook.item.thumbnail || "";
                        const params = new URLSearchParams({ title, author, cover: coverUrl });
                        router.push(`/post/review?${params.toString()}`);
                        setSelectedReviewBook(null);
                      }}
                      className="bg-brand-accent hover:bg-brand-accent/90 text-white text-xs font-semibold py-2.5 px-5 rounded-xl transition-colors cursor-pointer"
                    >
                      Write Deep Review
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
