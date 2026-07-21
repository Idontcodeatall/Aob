"use client";

import { useState, useEffect } from "react";
import { Image as ImageIcon } from "lucide-react";

interface BookCoverProps {
  url?: string;
  alt: string;
  className?: string;
  aspectRatio?: string; // e.g. "aspect-[2/3]"
}

/**
 * SmartBookCover Component
 * - Displays book cover image
 * - Upgrades http to https and removes edge=curl
 * - Displays a placeholder on error
 */
export function BookCover({ url, alt, className = "", aspectRatio = "aspect-[2/3]" }: BookCoverProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (url) {
      const cleanUrl = url
        .replace(/^http:\/\//i, 'https://')
        .replace("&edge=curl", "");
      setSrc(cleanUrl);
      setFailed(false);
    } else {
      setFailed(true);
    }
  }, [url]);

  const handleError = () => {
    setFailed(true);
  };

  if (!url || failed) {
    return (
      <div className={`w-full ${aspectRatio} bg-neutral-800 flex flex-col items-center justify-center gap-2 px-3 text-center ${className}`}>
        <ImageIcon size={28} className="text-neutral-600" />
        {alt && (
          <span className="text-[10px] text-neutral-600 font-medium line-clamp-3 leading-tight">
            {alt}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`w-full ${aspectRatio} bg-neutral-800 overflow-hidden ${className}`}>
      {src && (
        <img
          src={src}
          alt={alt || "Book Cover"}
          onError={handleError}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      )}
    </div>
  );
}
