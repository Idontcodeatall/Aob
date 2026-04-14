"use client";

import { useState } from "react";
import { Home, Compass, PlusCircle, Library, User, PenTool, ImageIcon, PlayCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const mobileNavItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Compass, label: "Browse", href: "/browse" },
  { icon: PlusCircle, label: "Create", href: "#create" }, // Special handler
  { icon: Library, label: "Library", href: "/library" },
  { icon: User, label: "Profile", href: "/profile" },
];

export function MobileNavBar() {
  const pathname = usePathname();
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  return (
    <>
      {/* Create popup menu */}
      {showCreateMenu && (
        <div className="fixed inset-0 z-[90] md:hidden" onClick={() => setShowCreateMenu(false)}>
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-56 bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <Link
              href="/post/photo"
              className="flex items-center px-5 py-3.5 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
              onClick={() => setShowCreateMenu(false)}
            >
              <ImageIcon size={16} className="mr-3 text-neutral-500" />
              New Photo Post
            </Link>
            <Link
              href="/create/story"
              className="flex items-center px-5 py-3.5 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors border-t border-neutral-800/50"
              onClick={() => setShowCreateMenu(false)}
            >
              <PlayCircle size={16} className="mr-3 text-neutral-500" />
              Add to Story
            </Link>
            <Link
              href="/post/review"
              className="flex items-center px-5 py-3.5 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors border-t border-neutral-800/50"
              onClick={() => setShowCreateMenu(false)}
            >
              <PenTool size={16} className="mr-3 text-brand-accent" />
              Write Deep Review
            </Link>
          </div>
        </div>
      )}

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-[80] md:hidden bg-brand-bg/95 backdrop-blur-xl border-t border-neutral-800/60">
        <div className="flex items-center justify-around h-16 px-2 max-w-md mx-auto">
          {mobileNavItems.map((item) => {
            const isCreate = item.href === "#create";
            const isActive = !isCreate && pathname === item.href;

            if (isCreate) {
              return (
                <button
                  key="create"
                  onClick={() => setShowCreateMenu(!showCreateMenu)}
                  className="flex flex-col items-center justify-center gap-0.5 -mt-4"
                >
                  <div className="w-12 h-12 flex items-center justify-center rounded-full bg-brand-accent shadow-lg shadow-brand-accent/30 transition-transform hover:scale-105 active:scale-95">
                    <PlusCircle size={24} className="text-white" />
                  </div>
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                  isActive
                    ? "text-brand-accent"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </div>
        {/* Safe area for iOS */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </>
  );
}
