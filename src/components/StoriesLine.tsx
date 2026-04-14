"use client";

import { useState } from "react";
import { useReviews, Story } from "@/lib/ReviewContext";
import { StoryViewer } from "./StoryViewer";
import { AnimatePresence } from "framer-motion";

export function StoriesLine() {
  const { stories } = useReviews();
  const [activeStories, setActiveStories] = useState<Story[] | null>(null);

  // Group stories by author and sort oldest-to-newest
  const groupedStories = stories.reduce((acc, story) => {
    if (!acc[story.author]) {
      acc[story.author] = [];
    }
    acc[story.author].push(story);
    acc[story.author].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return acc;
  }, {} as Record<string, Story[]>);

  const authors = Object.keys(groupedStories);
  return (
    <div className="px-4 py-6 border-b border-neutral-800">
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style dangerouslySetInnerHTML={{__html: `
          .no-scrollbar::-webkit-scrollbar { display: none; }
        `}} />
        
        {/* Real Stories (Grouped) */}
        {authors.map((author) => {
          const userStories = groupedStories[author];
          const latestStory = userStories[userStories.length - 1];
          
          return (
            <div 
              key={author} 
              className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
              onClick={() => setActiveStories(userStories)}
            >
              <div className="p-[2px] rounded-full bg-gradient-to-tr from-brand-accent to-red-500 transition-transform group-hover:scale-110 active:scale-95">
                <div className="w-16 h-16 rounded-full bg-neutral-900 border-2 border-brand-bg md:border-4 overflow-hidden">
                  <img 
                    src={latestStory.imageUrl} 
                    alt={author} 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <span className="text-xs text-brand-text w-16 truncate text-center font-medium">
                {author}
              </span>
            </div>
          );
        })}

        {/* Placeholder Stories if none exist or to fill space */}
        {authors.length < 5 && Array.from({ length: 6 - authors.length }, (_, i) => ({
          id: `placeholder-${i}`,
          name: `Reader ${i + authors.length + 1}`,
        })).map((placeholder) => (
          <div key={placeholder.id} className="flex flex-col items-center gap-1 shrink-0 cursor-not-allowed group opacity-30">
            <div className="p-[2px] rounded-full bg-neutral-800">
              <div className="w-16 h-16 rounded-full bg-neutral-900 border-2 border-brand-bg flex items-center justify-center overflow-hidden">
                 <div className="w-full h-full bg-neutral-700 flex items-center justify-center text-xl text-neutral-400 font-serif">
                   {placeholder.name.charAt(7)}
                 </div>
              </div>
            </div>
            <span className="text-xs text-neutral-400 w-16 truncate text-center">
              {placeholder.name}
            </span>
          </div>
        ))}
      </div>

      {/* --- Story Viewer Modal --- */}
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
