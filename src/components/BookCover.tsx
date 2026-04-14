"use client";

import { useState, useEffect } from "react";
import { getHighResCover } from "@/lib/utils";
import { Image as ImageIcon } from "lucide-react";

interface BookCoverProps {
  url?: string;
  alt: string;
  className?: string;
  aspectRatio?: string; // e.g. "aspect-[2/3]"
}

/**
 * SmartBookCover Component
 * - Attempts to load the highest resolution (zoom=3)
 * - Cascades down to zoom=2, then zoom=1 on error
 * - Displays a placeholder if all attempts fail
 */
export function BookCover({ url, alt, className = "", aspectRatio = "aspect-[2/3]" }: BookCoverProps) {
  const [currentZoom, setCurrentZoom] = useState(3);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (url) {
      setSrc(getHighResCover(url, 3));
      setCurrentZoom(3);
      setFailed(false);
    } else {
      setFailed(true);
    }
  }, [url]);

  const handleError = () => {
    if (currentZoom === 3) {
      setCurrentZoom(2);
      setSrc(getHighResCover(url, 2));
    } else if (currentZoom === 2) {
      setCurrentZoom(1);
      setSrc(getHighResCover(url, 1));
    } else {
      setFailed(true);
    }
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
          alt={alt}
          onError={handleError}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
      )}
    </div>
  );
}
