"use client";

import { useState } from "react";
import { useReviews, DbStory } from "@/lib/ReviewContext";
import { StoryViewer } from "./StoryViewer";
import { AnimatePresence } from "framer-motion";

export function StoriesLine() {
  const { stories } = useReviews();
  const [activeStories, setActiveStories] = useState<DbStory[] | null>(null);

  if (stories.length === 0) return null;

  // Group by user_id, newest-first within each group
  const grouped = stories.reduce((acc, story) => {
    const key = story.user_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(story);
    return acc;
  }, {} as Record<string, DbStory[]>);

  // Sort each group oldest-to-newest so viewer auto-advances in chronological order
  Object.values(grouped).forEach((group) =>
    group.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  );

  // Order the avatar bubbles by the latest story in each group (most recent first)
  const userIds = Object.keys(grouped).sort((a, b) => {
    const latestA = new Date(grouped[a][grouped[a].length - 1].created_at).getTime();
    const latestB = new Date(grouped[b][grouped[b].length - 1].created_at).getTime();
    return latestB - latestA;
  });

  return (
    <div className="px-4 py-6 border-b border-neutral-800">
      <div
        className="flex gap-4 overflow-x-auto pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <style dangerouslySetInnerHTML={{ __html: `div::-webkit-scrollbar { display: none; }` }} />

        {userIds.map((uid) => {
          const userStories = grouped[uid];
          const latest = userStories[userStories.length - 1];
          const username = latest.profiles?.username ?? "user";
          const avatarUrl = latest.profiles?.avatar_url;

          return (
            <div
              key={uid}
              className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
              onClick={() => setActiveStories(userStories)}
            >
              <div className="p-[2px] rounded-full bg-gradient-to-tr from-brand-accent to-red-500 transition-transform group-hover:scale-110 active:scale-95">
                <div className="w-16 h-16 rounded-full bg-neutral-900 border-2 border-brand-bg md:border-4 overflow-hidden">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={username}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <img
                      src={latest.image_url}
                      alt={username}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  )}
                </div>
              </div>
              <span className="text-xs text-brand-text w-16 truncate text-center font-medium">
                {username}
              </span>
            </div>
          );
        })}
      </div>

      {/* Story Viewer Modal */}
      <AnimatePresence>
        {activeStories && (
          <StoryViewer
            stories={activeStories}
            onClose={() => setActiveStories(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
