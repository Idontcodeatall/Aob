"use client";

import { useState, useEffect } from "react";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Star,
  MapPin,
} from "lucide-react";
import { Radar } from "react-chartjs-2";
import { BookCover } from "@/components/BookCover";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { motion, AnimatePresence } from "framer-motion";
import { useReviews, Post } from "@/lib/ReviewContext";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

/* ─── Helper: Format like count ─── */
function formatLikes(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

/* ═══════════════════════════════════════════════
   Unified Post Card — Single layout for ALL post types
   Visual → user photo as hero
   DeepReview → book cover + radar overlay + green-bracket quote
   Social → book cover + gradient title overlay
   ═══════════════════════════════════════════════ */
function UnifiedPostCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showDoubleTap, setShowDoubleTap] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const baseLikes = post.likeCount || ((post.bookTitle.length * 7) % 100 + 12);
  const likeCount = baseLikes + (liked ? 1 : 0);

  const handleDoubleTap = () => {
    if (!liked) setLiked(true);
    setShowDoubleTap(true);
    setTimeout(() => setShowDoubleTap(false), 800);
  };

  // Caption
  const captionText = post.content;
  const shouldTruncate = captionText.length > 120 && !expanded;
  const displayCaption = shouldTruncate
    ? captionText.slice(0, 120).trim()
    : captionText;

  // Determine hero image source
  const heroImage = post.imageUrl || post.coverUrl || null;

  // Radar data for DeepReview overlay
  const isDeepReview = post.type === "DeepReview" && post.ratings;
  const radarData = isDeepReview ? {
    labels: post.isFiction
      ? ["Pacing", "Characters", "Plot", "Prose", "Vibe"]
      : ["Pacing", "Persona", "Insight", "Prose", "Vibe"],
    datasets: [{
      data: [
        post.ratings!.pacing, post.ratings!.metricTwo, post.ratings!.metricThree,
        post.ratings!.prose, post.ratings!.vibe,
      ],
      backgroundColor: "rgba(128, 0, 0, 0.45)",
      borderColor: "rgba(255, 255, 255, 0.85)",
      borderWidth: 2,
      pointBackgroundColor: "#FFFFFF",
      pointBorderColor: "#800000",
      pointRadius: 3,
    }],
  } : null;

  const radarOptions = {
    scales: {
      r: {
        min: 0, max: 5,
        ticks: { display: false },
        grid: { color: "rgba(255, 255, 255, 0.2)" },
        angleLines: { color: "rgba(255, 255, 255, 0.2)" },
        pointLabels: {
          color: "rgba(255, 255, 255, 0.9)",
          font: { size: 9, weight: 600 as const },
        },
      },
    },
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    maintainAspectRatio: true,
  };

  // Quote text for DeepReview overlay — ONLY show if explicitly provided
  const overlayQuoteText = post.overlayQuote;

  return (
    <article className="bg-brand-bg border-b border-neutral-800/50">
      {/* ─── Post Header ─── */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-accent/80 to-red-900 flex items-center justify-center text-xs font-serif text-white font-bold ring-[1.5px] ring-neutral-700">
            {post.authorInitials}
          </div>
          {/* Name + Location/Type */}
          <div className="leading-tight">
            <p className="font-serif font-semibold text-sm text-brand-text">
              {post.author}
            </p>
            {post.location ? (
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin size={10} className="text-neutral-500" />
                <span className="text-[11px] text-neutral-500">
                  {post.location}
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-neutral-500">{post.timeAgo}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {post.type === "DeepReview" && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-purple-400 bg-purple-400/10 tracking-wide uppercase">
              Deep Review
            </span>
          )}
          <button className="text-neutral-400 hover:text-brand-text transition-colors p-1">
            <MoreHorizontal size={20} />
          </button>
        </div>
      </div>

      {/* ─── 4:5 Content Area ─── */}
      <div
        className="relative w-full aspect-[4/5] bg-neutral-900 overflow-hidden cursor-pointer select-none"
        onDoubleClick={handleDoubleTap}
      >
        {/* Hero Image / Book Cover */}
        {post.imageUrl ? (
          <img
            src={post.imageUrl}
            alt={post.bookTitle}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <BookCover 
            url={post.coverUrl} 
            alt={`${post.bookTitle} by ${post.bookAuthor}`} 
            aspectRatio="aspect-square"
            className="h-full"
          />
        )}

        {/* ── DeepReview Overlay: Radar + Green-Bracket Quote ── */}
        {isDeepReview && isMounted && (
          <>
            {/* Semi-dark scrim for readability */}
            <div className="absolute inset-0 bg-black/35 pointer-events-none" />

            {/* Radar chart centered */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: "-5%" }}>
              <div className="w-[55%] aspect-square opacity-90">
                <Radar data={radarData!} options={radarOptions} />
              </div>
            </div>

            {/* Star rating pills */}
            {post.generalRating && (
              <div className="absolute top-4 right-4 flex items-center gap-0.5 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={12}
                    fill={s <= post.generalRating! ? "currentColor" : "none"}
                    className={s <= post.generalRating! ? "text-brand-accent" : "text-neutral-500"}
                  />
                ))}
              </div>
            )}

            {/* Green-bracket quote at bottom */}
            {overlayQuoteText && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-20 pb-5 px-5">
                <div className="border-l-[3px] border-brand-accent pl-3.5">
                  <div 
                    className="font-serif text-white/90 text-sm leading-relaxed italic drop-shadow-lg max-w-[90%] prose prose-invert prose-sm line-clamp-3"
                    dangerouslySetInnerHTML={{ __html: overlayQuoteText }}
                  />
                  <p className="text-[11px] text-white/50 mt-1.5 tracking-wide">
                    — {post.bookAuthor},{" "}
                    <span className="italic">{post.bookTitle}</span>
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Social / Finished Reading Overlay ── */}
        {post.type === "Social" && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-20 pb-5 px-5">
            <p className="font-serif text-white text-lg font-bold drop-shadow-lg mb-1">
              {post.bookTitle}
            </p>
            <p className="text-white/60 text-sm">{post.bookAuthor}</p>
            {post.generalRating && (
              <div className="flex items-center gap-0.5 mt-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={14}
                    fill={s <= post.generalRating! ? "currentColor" : "none"}
                    className={s <= post.generalRating! ? "text-brand-accent" : "text-neutral-600"}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Visual Post Overlay (quote or book title) ── */}
        {post.type === "Visual" && (post.overlayQuote || post.bookTitle) && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-20 pb-5 px-5">
            <div className="border-l-[3px] border-brand-accent pl-3.5">
              <p className="font-serif text-white/90 text-sm leading-relaxed italic drop-shadow-lg max-w-[90%]">
                {post.overlayQuote || post.bookTitle}
              </p>
              {(post.overlayQuote && (post.bookAuthor || post.bookTitle)) && (
                <p className="text-[11px] text-white/50 mt-1.5 tracking-wide">
                  — {post.bookAuthor}{post.bookTitle ? `, ${post.bookTitle}` : ""}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Double-tap heart animation */}
        <AnimatePresence>
          {showDoubleTap && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.3, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <Heart
                size={80}
                fill="#800000"
                className="text-brand-accent drop-shadow-2xl"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Interaction Bar ─── */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLiked(!liked)}
            className="transition-transform active:scale-125"
          >
            <Heart
              size={24}
              fill={liked ? "#800000" : "none"}
              className={`transition-colors duration-200 ${
                liked
                  ? "text-brand-accent"
                  : "text-brand-text hover:text-neutral-400"
              }`}
            />
          </button>
          <button className="text-brand-text hover:text-neutral-400 transition-colors">
            <MessageCircle size={24} />
          </button>
          <button className="text-brand-text hover:text-neutral-400 transition-colors">
            <Send size={22} />
          </button>
        </div>
        <button
          onClick={() => setSaved(!saved)}
          className="transition-transform active:scale-110"
        >
          <Bookmark
            size={24}
            fill={saved ? "#E5E5E5" : "none"}
            className={`transition-colors duration-200 ${
              saved
                ? "text-brand-text"
                : "text-brand-text hover:text-neutral-400"
            }`}
          />
        </button>
      </div>

      {/* ─── Like Count ─── */}
      <div className="px-4 pt-1">
        <p className="text-sm font-semibold text-brand-text">
          {formatLikes(likeCount)} likes
        </p>
      </div>

      {/* ─── Caption Area ─── */}
      <div className="px-4 pt-1.5 pb-2">
        <div className="text-sm text-brand-text leading-relaxed">
          <span className="font-serif font-bold mr-1.5">{post.author}</span>
          <div 
            className={`inline prose prose-invert prose-sm max-w-none ${!expanded ? "line-clamp-3" : ""}`}
            dangerouslySetInnerHTML={{ __html: displayCaption }}
          />
          {shouldTruncate && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="text-neutral-500 ml-1 hover:text-neutral-300 transition-colors"
            >
              ...more
            </button>
          )}
        </div>
      </div>

      {/* ─── Timestamp ─── */}
      <div className="px-4 pb-4">
        <p className="text-[11px] text-neutral-500 uppercase tracking-wide">
          {post.timeAgo}
        </p>
      </div>
    </article>
  );
}

/* ═══════════════════════════════════════════════
   Feed — Renders all posts through UnifiedPostCard
   ═══════════════════════════════════════════════ */
export function Feed() {
  const { posts } = useReviews();

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full pb-20">
      {posts.map((post) => (
        <UnifiedPostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
