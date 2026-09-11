"use client";

import { useState, useEffect } from "react";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  BookOpen,
} from "lucide-react";
import { BookCover } from "@/components/BookCover";
import { motion, AnimatePresence } from "framer-motion";
import { useReviews, FeedPost } from "@/lib/ReviewContext";
import { supabase } from "@/utils/supabaseClient";

/* ─── Helper: relative time from ISO string ─── */
function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ─── Helper: format like count ─── */
function formatLikes(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

/* ─── Helper: strip HTML tags to check if content exists ─── */
function hasContent(html: string | null): boolean {
  if (!html) return false;
  const stripped = html.replace(/<[^>]*>/g, "").trim();
  return stripped.length > 0;
}

/* ─── Helper: strip tags for plain-text truncation ─── */
function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

/* ═══════════════════════════════════════════════
   Unified Post Card — maps to the posts table
   post_type "photo" → user photo + optional caption
   post_type "text"  → caption only, no image
   post_type "review" → hero image (user photo or cover URL) + book badge + caption
   ═══════════════════════════════════════════════ */
function UnifiedPostCard({ post, onLikeSuccess }: { post: FeedPost; onLikeSuccess?: () => void }) {
  const { library } = useReviews();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes_count ?? 0);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showDoubleTap, setShowDoubleTap] = useState(false);

  // Derive favoriteQuote from library — inside the card so it reacts when library loads
  const favoriteQuote = post.post_type === "review"
    ? library.find(item => item.id === post.book_id)?.favoriteQuote
    : undefined;

  // Sync likeCount if post.likes_count changes (e.g. after feed refresh)
  useEffect(() => {
    setLikeCount(post.likes_count ?? 0);
  }, [post.likes_count]);

  const handleLike = async () => {
    const newLiked = !liked;
    const newCount = newLiked ? likeCount + 1 : Math.max(0, likeCount - 1);
    setLiked(newLiked);
    setLikeCount(newCount);
    const { error } = await supabase
      .from("posts")
      .update({ likes_count: newCount })
      .eq("id", post.id);
    if (error) {
      console.error("[Like] Failed to update like count:", error.message);
      setLiked(!newLiked);
      setLikeCount(likeCount);
    } else {
      onLikeSuccess?.();
    }
  };

  const handleDoubleTap = () => {
    if (!liked) handleLike();
    setShowDoubleTap(true);
    setTimeout(() => setShowDoubleTap(false), 800);
  };

  // Caption handling — caption is HTML from RichTextEditor or plain text
  const captionPlain = post.caption ? stripTags(post.caption) : "";
  const shouldTruncate = captionPlain.length > 250 && !expanded;
  const captionDisplay = shouldTruncate
    ? captionPlain.slice(0, 250).trim() + "..."
    : post.caption || "";

  const showImage = !!post.image_url;
  const showCaption = hasContent(post.caption);
  const showBookBadge = post.post_type === "review" && (post.book_title || post.book_author);

  const username = post.profiles?.username ?? "user";
  const avatarInitial = username.charAt(0).toUpperCase();
  const avatarUrl = post.profiles?.avatar_url;

  return (
    <article className="bg-brand-bg border-b border-neutral-800/50">
      {/* ─── Post Header ─── */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-xs font-serif text-white font-bold ring-[1.5px] ring-neutral-700 bg-gradient-to-br from-brand-accent/80 to-red-900 shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              avatarInitial
            )}
          </div>
          {/* Name + timestamp */}
          <div className="leading-tight">
            <p className="font-serif font-semibold text-sm text-brand-text">{username}</p>
            <p className="text-[11px] text-neutral-500">{timeAgo(post.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {post.post_type === "review" && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-purple-400 bg-purple-400/10 tracking-wide uppercase">
              Review
            </span>
          )}
          <button className="text-neutral-400 hover:text-brand-text transition-colors p-1">
            <MoreHorizontal size={20} />
          </button>
        </div>
      </div>

      {/* ─── Hero Image (only if present) ─── */}
      {showImage && (
        <div
          className="relative w-full aspect-[4/5] bg-neutral-900 overflow-hidden cursor-pointer select-none"
          onDoubleClick={handleDoubleTap}
        >
          <img
            src={post.image_url!}
            alt={post.book_title ?? "Post image"}
            className="w-full h-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />

          {/* Review: book badge overlay at bottom */}
          {showBookBadge && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-12 pb-5 px-5">
              <div className="flex items-center gap-2">
                <BookOpen size={13} className="text-brand-accent shrink-0" />
                <div className="min-w-0">
                  <p className="font-serif text-white text-sm font-bold leading-tight truncate">{post.book_title}</p>
                  {post.book_author && (
                    <p className="text-white/60 text-xs truncate">{post.book_author}</p>
                  )}
                </div>
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
                <Heart size={80} fill="#800000" className="text-brand-accent drop-shadow-2xl" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ─── Review text-only: book badge (no image) ─── */}
      {!showImage && showBookBadge && (
        <div className="px-4 pt-2 pb-1">
          <div className="flex items-center gap-2 py-2 px-3 bg-neutral-900/70 rounded-xl border border-neutral-800 w-fit max-w-full">
            <BookOpen size={13} className="text-brand-accent shrink-0" />
            <div className="min-w-0">
              <p className="font-serif text-brand-text text-sm font-bold leading-tight truncate">{post.book_title}</p>
              {post.book_author && (
                <p className="text-neutral-500 text-xs truncate">{post.book_author}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Interaction Bar ─── */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-4">
          <button onClick={handleLike} className="transition-transform active:scale-125">
            <Heart
              size={24}
              fill={liked ? "#800000" : "none"}
              className={`transition-colors duration-200 ${liked ? "text-brand-accent" : "text-brand-text hover:text-neutral-400"}`}
            />
          </button>
          <button className="text-brand-text hover:text-neutral-400 transition-colors">
            <MessageCircle size={24} />
          </button>
          <button className="text-brand-text hover:text-neutral-400 transition-colors">
            <Send size={22} />
          </button>
        </div>
        <button onClick={() => setSaved(!saved)} className="transition-transform active:scale-110">
          <Bookmark
            size={24}
            fill={saved ? "#E5E5E5" : "none"}
            className={`transition-colors duration-200 ${saved ? "text-brand-text" : "text-brand-text hover:text-neutral-400"}`}
          />
        </button>
      </div>

      {/* ─── Like Count ─── */}
      <div className="px-4 pt-1">
        <p className="text-sm font-semibold text-brand-text">{formatLikes(likeCount)} likes</p>
      </div>

      {/* ─── Favorite Quote (review posts only) ─── */}
      {post.post_type === "review" && favoriteQuote && (
        <div className="mx-4 mt-2 mb-1 px-4 py-3 border-l-2 border-brand-accent/60 bg-neutral-900/60 rounded-r-xl">
          <p className="text-xs text-neutral-400 italic leading-relaxed">"{favoriteQuote}"</p>
        </div>
      )}

      {/* ─── Caption (only if non-empty) ─── */}
      {showCaption && (
        <div className="px-4 pt-1.5 pb-2">
          <div className="text-sm text-brand-text leading-relaxed flex flex-wrap items-baseline gap-1.5">
            <span className="font-serif font-bold">{username}</span>
            {shouldTruncate ? (
              <span className="inline">{captionDisplay}</span>
            ) : (
              <div
                className="inline prose prose-invert prose-sm max-w-none [&>p]:inline [&>p]:m-0"
                dangerouslySetInnerHTML={{ __html: captionDisplay }}
              />
            )}
            {captionPlain.length > 250 && !expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="text-brand-accent hover:text-brand-accent/80 font-medium transition-colors cursor-pointer inline"
              >
                more
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── Timestamp ─── */}
      <div className="px-4 pb-4">
        <p className="text-[11px] text-neutral-500 uppercase tracking-wide">{timeAgo(post.created_at)}</p>
      </div>
    </article>
  );
}

/* ═══════════════════════════════════════════════
   Feed — renders all posts from DB via ReviewContext
   ═══════════════════════════════════════════════ */
export function Feed() {
  const { posts, refreshFeed } = useReviews();

  if (posts.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 text-center max-w-2xl mx-auto w-full px-4">
        <BookOpen size={40} className="text-neutral-700 mb-4" strokeWidth={1.5} />
        <p className="font-serif text-lg text-neutral-400 mb-1">Nothing here yet</p>
        <p className="text-sm text-neutral-600">Post a review, share a photo, or create a story to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full pb-20">
      {posts.map((post) => (
        <UnifiedPostCard key={post.id} post={post} onLikeSuccess={refreshFeed} />
      ))}
    </div>
  );
}
