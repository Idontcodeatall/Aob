"use client";

import { usePathname } from "next/navigation";
import { useReviews } from "@/lib/ReviewContext";
import { Logo } from "@/components/Logo";

export function MobileHeader() {
  const pathname = usePathname();
  const { library } = useReviews();

  if (pathname === "/profile" || pathname?.startsWith("/post")) {
    return null;
  }

  const readingItems = library.filter(item => item.status === "Reading");
  const currentBook = readingItems[0];
  const finishedCount = library.filter(item => item.status === "Finished").length;

  let rightSide = null;
  if (pathname === "/") {
    rightSide = currentBook ? (
      <span className="text-xs text-neutral-400 truncate text-right">
        Currently Reading: <span className="text-brand-text italic">{currentBook.title}</span>
      </span>
    ) : null;
  } else if (pathname === "/browse") {
    rightSide = <span className="text-[10px] text-brand-text/80 uppercase tracking-widest font-semibold flex-shrink-0">Browse</span>;
  } else if (pathname === "/library") {
    rightSide = <span className="text-xs text-neutral-400">Finished: <span className="text-brand-text font-bold">{finishedCount}</span></span>;
  }

  return (
    <header className="sticky top-0 z-[60] w-full bg-brand-bg/90 backdrop-blur-md border-b border-neutral-800/50 md:hidden">
      <div className="flex items-center justify-between py-2 px-4 shadow-sm h-[60px]">
        <div className="flex-shrink-0">
          <Logo collapsed={false} />
        </div>
        <div className="flex-1 flex justify-end min-w-0 pl-4 items-center">
          {rightSide}
        </div>
      </div>
    </header>
  );
}
