"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Story } from "@/lib/ReviewContext";

interface StoryViewerProps {
  stories: Story[];
  onClose: () => void;
}

export function StoryViewer({ stories, onClose }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const currentStory = stories[currentIndex];
  const DURATION = 5000; // 5 seconds per story

  const nextStory = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  const prevStory = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    }
  }, [currentIndex]);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const nextProgress = (elapsed / DURATION) * 100;
      
      if (nextProgress >= 100) {
        nextStory();
      } else {
        setProgress(nextProgress);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [currentIndex, nextStory]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] bg-black/95 flex flex-col items-center justify-center font-sans"
    >
      {/* --- Progress Bars --- */}
      <div className="absolute top-4 left-4 right-4 z-[120] flex gap-1.5 h-1">
        {stories.map((_, idx) => (
          <div key={idx} className="flex-1 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-75 ease-linear"
              style={{ 
                width: idx < currentIndex ? "100%" : idx === currentIndex ? `${progress}%` : "0%" 
              }}
            />
          </div>
        ))}
      </div>

      {/* --- Header --- */}
      <div className="absolute top-8 left-4 right-4 z-[120] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-neutral-800 border border-white/20 overflow-hidden flex items-center justify-center">
             <div className="text-white font-bold text-lg">{currentStory.author.charAt(0)}</div>
          </div>
          <div>
            <div className="text-white font-bold text-sm shadow-sm">{currentStory.author}</div>
            <div className="text-white/60 text-xs shadow-sm">
              {new Date(currentStory.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* --- Main Image --- */}
      <div className="relative w-full max-w-lg aspect-[9/16] bg-neutral-900 shadow-2xl overflow-hidden rounded-xl">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentStory.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            src={currentStory.imageUrl}
            alt="Story"
            className="w-full h-full object-cover"
          />
        </AnimatePresence>

        {/* --- Navigation Regions --- */}
        <div className="absolute inset-0 flex">
          <div 
            className="flex-1 cursor-pointer" 
            onClick={prevStory}
            title="Previous"
          />
          <div 
            className="flex-1 cursor-pointer" 
            onClick={nextStory}
            title="Next"
          />
        </div>
      </div>

      {/* --- Navigation Icons (Desktop/Large screens) --- */}
      <div className="hidden md:flex absolute inset-x-0 top-1/2 -translate-y-1/2 justify-between px-8">
        <button 
          onClick={prevStory}
          className={`p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors ${currentIndex === 0 ? 'opacity-0 pointer-events-none' : ''}`}
        >
          <ChevronLeft size={32} />
        </button>
        <button 
          onClick={nextStory}
          className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
        >
          <ChevronRight size={32} />
        </button>
      </div>
    </motion.div>
  );
}
