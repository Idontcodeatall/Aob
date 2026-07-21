"use client";

import { useReviews } from "@/lib/ReviewContext";
import { LandingPage } from "@/components/LandingPage";
import { CurrentlyReading } from "@/components/CurrentlyReading";
import { StoriesLine } from "@/components/StoriesLine";
import { Feed } from "@/components/Feed";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { session, authLoading } = useReviews();

  // While Supabase resolves the session, show a minimal spinner to prevent layout flash
  if (authLoading) {
    return (
      <div className="flex-1 w-full min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="text-brand-accent animate-spin" />
      </div>
    );
  }

  // Logged-out users see the landing page
  if (!session) {
    return <LandingPage />;
  }

  // Logged-in users get the feed
  return (
    <div className="flex-1 w-full max-w-2xl mx-auto border-x border-neutral-800 min-h-screen relative flex flex-col">
      <CurrentlyReading />
      <StoriesLine />
      <Feed />
    </div>
  );
}
