"use client";

import { BookOpen, MoreVertical, CheckCircle2 } from "lucide-react";
import { useReviews } from "@/lib/ReviewContext";

export function CurrentlyReading() {
  const { library, updateLibraryProgress } = useReviews();
  const readingItems = library.filter(item => item.status === "Reading");
  const book = readingItems[0];

  if (!book) {
    return (
      <div className="sticky top-0 z-40 bg-brand-bg/80 backdrop-blur-md border-b border-neutral-800 p-4">
        <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-2">Currently Reading</h2>
        <p className="text-sm text-neutral-500 italic">No books currently in progress.</p>
      </div>
    );
  }

  const progressPercent = Math.min(100, Math.round((book.pagesRead / book.totalPages) * 100));

  return (
    <div className="sticky top-0 z-40 bg-brand-bg/80 backdrop-blur-md border-b border-neutral-800 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-2">Currently Reading</h2>
        <button className="text-neutral-400 hover:text-brand-text">
          <MoreVertical size={16} />
        </button>
      </div>
      
      <div className="flex gap-4 items-center">
        <div className="w-12 h-16 bg-neutral-800 rounded shadow-md flex items-center justify-center shrink-0 overflow-hidden relative">
          {book.thumbnail ? (
            <img src={book.thumbnail} alt={book.title} className="w-full h-full object-cover" />
          ) : (
            <BookOpen size={20} className="text-neutral-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-serif font-semibold text-lg text-brand-text truncate">{book.title}</h3>
          <p className="text-brand-accent text-sm truncate">{book.authors.join(", ")}</p>
          
          <div className="mt-2 flex items-center gap-3">
            <div className="h-1.5 flex-1 bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-brand-accent transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
            <span className="text-xs text-neutral-400 font-medium shrink-0 w-8">{progressPercent}%</span>
          </div>

          <div className="mt-1 flex items-center gap-2 text-xs">
            <input 
              type="number" 
              value={book.pagesRead || ''} 
              onChange={(e) => updateLibraryProgress(book.id, parseInt(e.target.value) || 0)}
              className="w-14 bg-neutral-900 border border-neutral-700 hover:border-brand-accent focus:outline-none focus:border-brand-accent rounded px-1.5 py-0.5 text-brand-text transition-colors" 
              min="0" max={book.totalPages} 
            />
            <span className="text-neutral-500">/ {book.totalPages} pages</span>
            {progressPercent === 100 && <CheckCircle2 size={14} className="text-brand-accent ml-2" />}
          </div>
        </div>
      </div>
    </div>
  );
}
