"use client";

import { useState, useRef } from "react";
import { useReviews, LibraryStatus, Post } from "@/lib/ReviewContext";
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
  review,
}: {
  item: {
    id: string;
    title: string;
    authors: string[];
    thumbnail?: string;
    status: LibraryStatus;
    totalPages: number;
    pagesRead: number;
  };
  onUpdateProgress: (id: string) => void;
  review?: Post | null;
}) {
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

  const coverUrl = review?.coverUrl || item.thumbnail;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="group flex flex-col"
    >
      {/* Cover container — 2:3 aspect ratio */}
      <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-neutral-800/80 shadow-lg group-hover:shadow-2xl group-hover:shadow-brand-accent/10 transition-all duration-500">
        {/* Cover image via SmartBookCover */}
        <BookCover 
          url={coverUrl} 
          alt={item.title} 
          className="group-hover:scale-105 transition-transform duration-700" 
        />

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
                  onClick={() => onUpdateProgress(item.id)}
                  className="p-2.5 rounded-full bg-brand-accent/90 backdrop-blur-sm text-white hover:bg-brand-accent transition-all duration-200 hover:scale-110 shadow-lg"
                  title="Update progress"
                >
                  <Plus size={18} />
                </button>
              )}
              <button
                className="p-2.5 rounded-full bg-white/15 backdrop-blur-sm text-white hover:bg-white/25 transition-all duration-200 hover:scale-110 shadow-lg"
                title="Write review"
              >
                <PenLine size={18} />
              </button>
              <button
                className="p-2.5 rounded-full bg-white/15 backdrop-blur-sm text-white hover:bg-white/25 transition-all duration-200 hover:scale-110 shadow-lg"
                title="Favorite"
              >
                <Heart size={18} />
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
          {item.authors.join(", ")}
        </p>
      </div>
    </motion.div>
  );
}

export default function LibraryPage() {
  const { library, updateLibraryProgress, posts } = useReviews();
  const [activeTab, setActiveTab] = useState<LibraryStatus>("Reading");
  const [progressModal, setProgressModal] = useState<string | null>(null);

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
                  review={reviewsByTitle.get(item.title) || null}
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
    </div>
  );
}
