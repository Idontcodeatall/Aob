"use client";

import { useMemo, useState, useEffect } from "react";
import { Radar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { useReviews, Post } from "@/lib/ReviewContext";
import { BookCover } from "@/components/BookCover";
import {
  getGenreFrequency,
  getAggregateRadar,
  getChallengeStatus,
  GENRE_COLORS,
} from "@/lib/analytics";
import { BookOpen, Star, Target, TrendingUp, Edit3, ExternalLink, Heart, MessageCircle, X } from "lucide-react";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, ArcElement);

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

export default function ProfilePage() {
  const [isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const isBookFinished = useMemo(() => {
    if (!selectedPost) return false;
    return library.some(
      (item) => item.status === "Finished" && item.title === selectedPost.bookTitle
    );
  }, [selectedPost, library]);

  useEffect(() => {
    setIsMounted(true);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { posts, library, readingChallenge, userProfile, setShowSettings, addToLibrary } = useReviews();
  const finishedBooks = library.filter((b) => b.status === "Finished");
  const reviewsWithRatings = posts.filter((p) => p.type === "DeepReview" && p.ratings);

  // All user posts for the grid (Visual + DeepReview)
  const userPosts = posts.filter(
    (p) => p.author === userProfile.displayName && (p.type === "Visual" || p.type === "DeepReview")
  );

  const genreData = useMemo(() => getGenreFrequency(finishedBooks), [finishedBooks]);
  const aggregateRadar = useMemo(() => getAggregateRadar(reviewsWithRatings), [reviewsWithRatings]);
  const challengeStatus = getChallengeStatus(finishedBooks.length, readingChallenge.target);
  const challengePercent = readingChallenge.target > 0 ? Math.min(100, (finishedBooks.length / readingChallenge.target) * 100) : 0;

  const doughnutData = {
    labels: genreData.map((g) => g.genre),
    datasets: [{
      data: genreData.map((g) => g.count),
      backgroundColor: genreData.map((g) => GENRE_COLORS[g.genre] || "#6b7280"),
      borderColor: "#121212",
      borderWidth: 3,
      hoverBorderColor: "#E5E5E5",
    }],
  };

  const doughnutOptions = {
    cutout: "65%",
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(18, 18, 18, 0.95)",
        titleColor: "#E5E5E5",
        bodyColor: "#E5E5E5",
        borderColor: "rgba(128,0,0,0.3)",
        borderWidth: 1,
      },
    },
    maintainAspectRatio: false,
  };

  const radarLabels = ["Pacing", "Characters/Persona", "Plot/Insight", "Prose", "Vibe"];
  const radarData = {
    labels: radarLabels,
    datasets: [{
      label: "Aggregate Aesthetic",
      data: [aggregateRadar.pacing, aggregateRadar.metricTwo, aggregateRadar.metricThree, aggregateRadar.prose, aggregateRadar.vibe],
      backgroundColor: "rgba(128, 0, 0, 0.5)",
      borderColor: "#FFFFFF",
      borderWidth: 2,
      pointBackgroundColor: "#FFFFFF",
      pointBorderColor: "#800000",
    }],
  };

  const radarOptions = {
    layout: {
      padding: {
        left: 20,
        right: 40,
        top: 20,
        bottom: 20
      }
    },
    scales: {
      r: {
        min: 0, max: 5,
        ticks: { stepSize: 1, display: false },
        grid: { color: "rgba(255, 255, 255, 0.12)" },
        angleLines: { color: "rgba(255, 255, 255, 0.12)" },
        pointLabels: {
          display: false,
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(18, 18, 18, 0.95)",
        titleColor: "#E5E5E5",
        bodyColor: "#a3a3a3",
        titleFont: { size: 14, weight: "bold" as const },
        bodyFont: { size: 12 },
        borderColor: "rgba(128,0,0,0.3)",
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          title: function (items: any[]) {
            return items[0]?.label || "";
          },
          label: function (context: any) {
            return `Average: ${context.raw} / 5`;
          },
        },
      },
    },
    maintainAspectRatio: false,
  };

  if (!isMounted) {
    return (
      <div className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-32 h-32 rounded-full bg-neutral-800" />
          <div className="w-48 h-8 bg-neutral-800 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 min-h-screen">
      {/* ─── Social Profile Header ─── */}
      <div className="mb-10">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Avatar */}
          <div className="shrink-0 self-start">
            {userProfile.avatarUrl ? (
              <img
                src={userProfile.avatarUrl}
                alt={userProfile.displayName}
                className="w-28 h-28 md:w-32 md:h-32 rounded-full object-cover border-[3px] border-brand-accent/40 shadow-lg shadow-brand-accent/10"
              />
            ) : (
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-neutral-800 flex items-center justify-center text-4xl md:text-5xl font-serif text-brand-accent border-[3px] border-brand-accent/40 shadow-lg shadow-brand-accent/10">
                {userProfile.initials}
              </div>
            )}
          </div>

          {/* Info Column */}
          <div className="flex-1 min-w-0">
            {/* Name + Edit */}
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand-text leading-tight">{userProfile.displayName}</h1>
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-1.5 text-sm font-medium text-brand-accent border border-brand-accent/50 rounded-lg px-3.5 py-1.5 hover:bg-brand-accent/10 transition-colors cursor-pointer"
              >
                <Edit3 size={14} />
                Edit Profile
              </button>
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-2 text-sm mb-4 flex-wrap">
              <button className="hover:bg-neutral-800/60 rounded-lg px-2.5 py-1 transition-colors cursor-pointer">
                <span className="font-bold text-brand-text">{finishedBooks.length}</span>
                <span className="text-neutral-400 ml-1">Finished</span>
              </button>
              <span className="text-neutral-700">|</span>
              <button className="hover:bg-neutral-800/60 rounded-lg px-2.5 py-1 transition-colors cursor-pointer">
                <span className="font-bold text-brand-text">{reviewsWithRatings.length}</span>
                <span className="text-neutral-400 ml-1">Reviews</span>
              </button>
              <span className="text-neutral-700">|</span>
              <button className="hover:bg-neutral-800/60 rounded-lg px-2.5 py-1 transition-colors cursor-pointer">
                <span className="font-bold text-brand-text">12</span>
                <span className="text-neutral-400 ml-1">Followers</span>
              </button>
              <span className="text-neutral-700">|</span>
              <button className="hover:bg-neutral-800/60 rounded-lg px-2.5 py-1 transition-colors cursor-pointer">
                <span className="font-bold text-brand-text">45</span>
                <span className="text-neutral-400 ml-1">Following</span>
              </button>
            </div>

            {/* Bio */}
            <p className="text-neutral-300 text-sm leading-relaxed mb-3 max-w-xl">
              {userProfile.bio}
            </p>

            {/* Personal Link */}
            {userProfile.personalLink && (
              <div className="mb-4">
                <a
                  href={userProfile.personalLink.startsWith("http") ? userProfile.personalLink : `https://${userProfile.personalLink}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-brand-accent hover:underline transition-colors"
                >
                  <ExternalLink size={13} className="opacity-70" />
                  {userProfile.personalLink}
                </a>
              </div>
            )}

            {/* All-Time Favorite Book */}
            {userProfile.allTimeFav && (
              <div className="mb-5">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-2">
                  <Star size={11} className="text-brand-accent fill-brand-accent" />
                  All-Time Favorite
                </span>
                <div className="inline-flex items-center gap-3 bg-neutral-900/40 border border-neutral-800 rounded-xl p-2.5 pr-5 max-w-md shadow-md border-l-[3px] border-l-brand-accent hover:bg-neutral-900/60 transition-colors">
                  {userProfile.allTimeFav.coverUrl ? (
                    <div className="w-10 h-14 rounded overflow-hidden shadow-sm border border-neutral-800 shrink-0">
                      <img
                        src={userProfile.allTimeFav.coverUrl}
                        alt={userProfile.allTimeFav.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-14 rounded bg-neutral-800 flex items-center justify-center border border-neutral-700 shrink-0">
                      <BookOpen size={16} className="text-neutral-600" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="font-serif text-sm font-semibold text-brand-text truncate leading-snug">
                      {userProfile.allTimeFav.title}
                    </h4>
                    <p className="text-xs text-neutral-500 truncate mt-0.5">
                      {userProfile.allTimeFav.author}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Compact Reading Challenge — Read-Only */}
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 max-w-md">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <Target size={16} className="text-brand-accent" />
                  <span className="text-xs font-semibold text-brand-text uppercase tracking-wider">2026 Reading Challenge</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-neutral-400">
                  <TrendingUp size={12} className="text-brand-accent" />
                  {challengeStatus}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-serif font-bold text-brand-accent">{finishedBooks.length}</span>
                <span className="text-neutral-500 text-sm">/</span>
                <span className="text-brand-text text-sm font-medium">{readingChallenge.target} books</span>
                <div className="flex-1 h-2 bg-neutral-800 rounded-full overflow-hidden ml-2">
                  <div
                    className="h-full bg-brand-accent rounded-full transition-all duration-700"
                    style={{ width: `${challengePercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-5 space-y-8">

          {/* Genre Profile Doughnut */}
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
            <h2 className="font-semibold text-brand-text uppercase tracking-wider text-sm mb-6">Genre Profile</h2>
            <div className="relative w-full aspect-square max-w-[280px] mx-auto mb-6">
              <Doughnut data={doughnutData} options={doughnutOptions} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <BookOpen size={24} className="text-brand-accent mb-1" />
                <span className="text-2xl font-serif font-bold text-brand-text">{finishedBooks.length}</span>
                <span className="text-xs text-neutral-400">books</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              {genreData.map((g) => (
                <div key={g.genre} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GENRE_COLORS[g.genre] || "#6b7280" }} />
                  <span className="text-neutral-300">{g.genre}</span>
                  <span className="text-neutral-500">({g.count})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-7 space-y-8">
          {/* Reading Moods Aggregate Radar */}
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-brand-text uppercase tracking-wider text-sm">Reading Moods — Aggregate Aesthetic</h2>
              <span className="text-xs text-neutral-500">Based on {reviewsWithRatings.length} reviews. Hover labels for context.</span>
            </div>
            <div className="w-full aspect-square max-w-[400px] mx-auto relative">
              <Radar data={radarData} options={radarOptions} />
              {/* Interactive label overlays */}
              {radarLabels.map((label, i) => {
                const angle = (Math.PI * 2 * i) / radarLabels.length - Math.PI / 2;
                const radius = isMobile ? 36 : 46; // Shrunk on mobile to prevent label clipping
                const cx = 50 + radius * Math.cos(angle);
                const cy = 50 + radius * Math.sin(angle);

                // Text Alignment: Anchor labels OUTWARD away from the chart web
                let transform = "translate(-50%, -50%)"; // default center
                if (cx > 55) {
                  transform = "translate(0%, -50%)"; // Right-side: Anchor left edge, grow rightward
                } else if (cx < 45) {
                  transform = "translate(-100%, -50%)"; // Left-side: Anchor right edge, grow leftward
                } else if (cy < 50) {
                  transform = "translate(-50%, -100%)"; // Top: Anchor bottom edge, grow upward
                } else {
                  transform = "translate(-50%, 0%)"; // Bottom: Anchor top edge, grow downward
                }

                return (
                  <div
                    key={label}
                    className="absolute group z-20 inline-block"
                    style={{
                      left: `${cx}%`,
                      top: `${cy}%`,
                      transform,
                    }}
                  >
                    <span className={`text-[10px] md:text-xs font-semibold text-brand-text cursor-default hover:text-brand-accent transition-colors px-1 py-0.5 rounded flex flex-col items-center text-center ${isMobile ? "" : "whitespace-nowrap"}`}>
                      {isMobile && label.includes("/") ? (
                        <>
                          <span>{label.split("/")[0]}/</span>
                          <span>{label.split("/")[1]}</span>
                        </>
                      ) : label}
                    </span>
                    <div className="hidden group-hover:block absolute z-50 w-48 bg-neutral-950/95 border border-neutral-700 rounded-xl shadow-2xl p-4 pointer-events-none"
                      style={{
                        left: cx > 50 ? "100%" : cx < 50 ? "auto" : "50%",
                        right: cx < 50 ? "100%" : "auto",
                        top: cy > 50 ? "auto" : "100%",
                        bottom: cy > 50 ? "100%" : "auto",
                        marginLeft: cx > 50 ? "8px" : cx === 50 ? "-96px" : "0",
                        marginRight: cx < 50 ? "8px" : "0",
                        marginTop: cy <= 50 ? "8px" : "0",
                        marginBottom: cy > 50 ? "8px" : "0",
                      }}
                    >
                      <p className="font-semibold text-white text-sm mb-2">{label}</p>
                      <p className="text-xs text-neutral-400">
                        Average: {[aggregateRadar.pacing, aggregateRadar.metricTwo, aggregateRadar.metricThree, aggregateRadar.prose, aggregateRadar.vibe][i]} / 5
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* ─── Visual Post Grid (Full Width Below Charts) ─── */}
      <div className="mt-8">
        <h2 className="font-semibold text-brand-text uppercase tracking-wider text-sm border-b border-neutral-800 pb-2 mb-6">Posts</h2>
        
        {/* 3-Column Square Grid */}
        <div className="grid grid-cols-3 gap-1 md:gap-2">
          {userPosts.map((post) => {
            const isDeepReview = post.type === "DeepReview" && post.ratings;
            const tileImage = post.imageUrl || post.coverUrl;

            // Mini radar for DeepReview hover
            const labels = isDeepReview
              ? (post.isFiction ? ["Pacing", "Characters", "Plot", "Prose", "Vibe"] : ["Pacing", "Persona", "Insight", "Prose", "Vibe"])
              : [];
            
            const miniRadarData = isDeepReview ? {
              labels,
              datasets: [{
                data: [
                  post.ratings!.pacing, post.ratings!.metricTwo, post.ratings!.metricThree,
                  post.ratings!.prose, post.ratings!.vibe,
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

            return (
              <div 
                key={post.id} 
                onClick={() => setSelectedPost(post)}
                className="post-grid-item relative aspect-square bg-neutral-800 overflow-hidden cursor-pointer"
              >
                {/* Background Image */}
                {tileImage ? (
                  <img 
                    src={tileImage} 
                    alt={`${post.bookTitle}`}
                    className="post-grid-cover w-full h-full object-cover"
                    style={{ transition: "transform 0.5s ease" }}
                  />
                ) : (
                  <div className="post-grid-cover w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center p-4 text-center"
                    style={{ transition: "transform 0.5s ease" }}
                  >
                    <span className="font-serif font-bold text-neutral-600 text-sm md:text-base" style={{ opacity: 0.5 }}>
                      {post.bookTitle}
                    </span>
                  </div>
                )}

              {/* Hover Overlay — type-aware */}
                <div 
                  className="post-grid-overlay absolute inset-0 flex flex-col items-center justify-center p-2 md:p-4"
                  style={{ 
                    backgroundColor: "rgba(10, 10, 10, 0.82)", 
                    opacity: 0, 
                    transition: "opacity 0.3s ease",
                    zIndex: 10,
                  }}
                >
                  {isDeepReview && miniRadarData ? (
                    /* Deep Review → Radar Chart + Stars */
                    <>
                      <div className="flex items-center gap-0.5 mb-2 md:mb-4">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star 
                            key={s} 
                            size={14} 
                            fill={s <= (post.generalRating || 0) ? "currentColor" : "none"} 
                            className={s <= (post.generalRating || 0) ? "text-brand-accent" : "text-neutral-600"} 
                          />
                        ))}
                      </div>
                      <div className="w-16 h-16 md:w-24 md:h-24">
                        <Radar data={miniRadarData} options={miniOptions} />
                      </div>
                    </>
                  ) : (
                    /* Visual Post → Like/Comment counts */
                    <>
                      <div className="flex items-center gap-4 text-white/90">
                        <div className="flex items-center gap-1.5">
                          <Heart size={16} fill="currentColor" className="text-white" />
                          <span className="text-sm font-semibold">{post.likesCount ?? 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MessageCircle size={16} className="text-white" />
                          <span className="text-sm font-semibold">{post.commentsCount ?? 0}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedPost(null)}>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl overflow-y-auto max-h-[90vh] shadow-2xl relative custom-scrollbar" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedPost(null)}
              className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/50 rounded-full text-white z-10 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
            
            <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
              {/* Media Column */}
              <div className="w-full md:w-1/2 bg-neutral-950 relative flex items-center justify-center aspect-[4/5] md:aspect-auto md:min-h-[400px]">
                {selectedPost.imageUrl ? (
                  <img
                    src={selectedPost.imageUrl}
                    alt={selectedPost.bookTitle}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full relative">
                    <BookCover 
                      url={selectedPost.coverUrl} 
                      alt={`${selectedPost.bookTitle} by ${selectedPost.bookAuthor}`} 
                      className="h-full"
                    />
                    {selectedPost.type === "DeepReview" && selectedPost.ratings && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-4">
                        <div className="w-3/4 aspect-square opacity-90">
                          <Radar 
                            data={{
                              labels: selectedPost.isFiction
                                ? ["Pacing", "Characters", "Plot", "Prose", "Vibe"]
                                : ["Pacing", "Persona", "Insight", "Prose", "Vibe"],
                              datasets: [{
                                data: [
                                  selectedPost.ratings.pacing, selectedPost.ratings.metricTwo, selectedPost.ratings.metricThree,
                                  selectedPost.ratings.prose, selectedPost.ratings.vibe,
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
                )}
              </div>

              {/* Text/Content Column */}
              <div className="p-6 md:p-8 flex-1 flex flex-col min-w-0 overflow-y-auto max-h-[50vh] md:max-h-[90vh] custom-scrollbar">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-accent/80 to-red-900 flex items-center justify-center text-xs font-serif text-white font-bold">
                    {selectedPost.authorInitials}
                  </div>
                  <div>
                    <h3 className="font-serif font-semibold text-sm text-brand-text leading-tight">{selectedPost.author}</h3>
                    <p className="text-[10px] text-neutral-500">{selectedPost.timeAgo}</p>
                  </div>
                </div>

                {/* Book Details */}
                <div className="mb-4">
                  <h2 className="font-serif text-xl font-bold text-white mb-0.5 leading-snug">
                    {selectedPost.bookTitle}
                  </h2>
                  <p className="text-brand-accent text-sm font-medium">
                    by {selectedPost.bookAuthor}
                  </p>
                </div>

                {/* Rating */}
                {selectedPost.generalRating && (
                  <div className="flex items-center gap-0.5 mb-4">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={14}
                        fill={s <= selectedPost.generalRating! ? "currentColor" : "none"}
                        className={s <= selectedPost.generalRating! ? "text-brand-accent" : "text-neutral-700"}
                      />
                    ))}
                  </div>
                )}

                {/* Prominent Minimalist Add to Library Button */}
                {selectedPost.bookTitle && (
                  <button
                    onClick={() => {
                      if (!isBookFinished) {
                        addToLibrary({
                          id: `profile-add-${Date.now()}`,
                          title: selectedPost.bookTitle,
                          authors: [selectedPost.bookAuthor],
                          thumbnail: selectedPost.coverUrl || "",
                          status: "Finished",
                          totalPages: 300,
                          pagesRead: 300,
                        });
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
                )}

                {/* Divider */}
                <div className="border-t border-neutral-800 my-2" />

                {/* Quote (if visual or overlay quote exists) */}
                {selectedPost.overlayQuote && (
                  <div className="border-l-[3px] border-brand-accent pl-3 my-4 italic text-sm text-neutral-300">
                    "{selectedPost.overlayQuote}"
                  </div>
                )}

                {/* Essay / Caption Content */}
                <div className="text-sm text-neutral-300 leading-relaxed prose prose-invert prose-sm max-w-none flex-grow">
                  <div dangerouslySetInnerHTML={{ __html: selectedPost.content }} />
                </div>

                {/* Add to Library Action */}
                {selectedPost.bookTitle && (
                  <div className="mt-6 pt-4 border-t border-neutral-800 shrink-0">
                    <span className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-2.5">
                      Add to Library
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        onClick={() => {
                          addToLibrary({
                            id: `profile-add-${Date.now()}`,
                            title: selectedPost.bookTitle,
                            authors: [selectedPost.bookAuthor],
                            thumbnail: selectedPost.coverUrl || "",
                            status: "TBR",
                            totalPages: 300,
                            pagesRead: 0,
                          });
                          alert(`"${selectedPost.bookTitle}" has been added to your TBR shelf!`);
                        }}
                        className="py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs font-semibold text-brand-text transition-colors cursor-pointer text-center"
                      >
                        TBR
                      </button>
                      <button
                        onClick={() => {
                          addToLibrary({
                            id: `profile-add-${Date.now()}`,
                            title: selectedPost.bookTitle,
                            authors: [selectedPost.bookAuthor],
                            thumbnail: selectedPost.coverUrl || "",
                            status: "Reading",
                            totalPages: 300,
                            pagesRead: 0,
                          });
                          alert(`"${selectedPost.bookTitle}" has been added to Currently Reading!`);
                        }}
                        className="py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs font-semibold text-brand-text transition-colors cursor-pointer text-center"
                      >
                        Reading
                      </button>
                      <button
                        onClick={() => {
                          addToLibrary({
                            id: `profile-add-${Date.now()}`,
                            title: selectedPost.bookTitle,
                            authors: [selectedPost.bookAuthor],
                            thumbnail: selectedPost.coverUrl || "",
                            status: "Finished",
                            totalPages: 300,
                            pagesRead: 300,
                          });
                          alert(`"${selectedPost.bookTitle}" has been added to Finished!`);
                        }}
                        className="py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs font-semibold text-brand-text transition-colors cursor-pointer text-center"
                      >
                        Finished
                      </button>
                      <button
                        onClick={() => {
                          addToLibrary({
                            id: `profile-add-${Date.now()}`,
                            title: selectedPost.bookTitle,
                            authors: [selectedPost.bookAuthor],
                            thumbnail: selectedPost.coverUrl || "",
                            status: "DNF",
                            totalPages: 300,
                            pagesRead: 0,
                          });
                          alert(`"${selectedPost.bookTitle}" has been marked as DNF!`);
                        }}
                        className="py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs font-semibold text-red-400 transition-colors cursor-pointer text-center"
                      >
                        DNF
                      </button>
                    </div>
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
