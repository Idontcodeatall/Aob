"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Home, Library, Compass, Settings, ChevronLeft, ChevronRight, PlusCircle, PenTool, ImageIcon, PlayCircle, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useReviews } from "@/lib/ReviewContext";
import { Logo } from "@/components/Logo";

const navItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Library, label: "My Library", href: "/library" },
  { icon: Compass, label: "Browse with Librarian", href: "/browse" },
  { icon: User, label: "Profile", href: "/profile" },
];

export function Navigation() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showPostMenu, setShowPostMenu] = useState(false);
  const pathname = usePathname();
  const { setShowSettings } = useReviews();

  return (
    <motion.nav
      initial={false}
      animate={{ width: isCollapsed ? 64 : 256 }}
      className="sticky top-0 h-screen bg-brand-bg border-r border-neutral-800 z-50 hidden md:flex flex-col shrink-0"
    >
      <div className="flex items-center justify-between p-4 h-16 border-b border-neutral-800">
        {!isCollapsed ? (
          <Logo collapsed={false} />
        ) : (
          <Logo collapsed={true} />
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`p-1 rounded-md hover:bg-neutral-800 text-brand-text transition-colors ${isCollapsed ? 'mx-auto' : ''}`}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <div className="flex-1 py-4 flex flex-col gap-2 px-2 relative">
        <div className="relative mb-2">
          <button
            onClick={() => setShowPostMenu(!showPostMenu)}
            className={`flex items-center w-full px-3 py-3 rounded-lg border border-brand-accent/50 text-brand-text hover:bg-brand-accent/10 transition-colors shadow-lg overflow-hidden ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? "Create" : undefined}
          >
            <PlusCircle size={20} className="shrink-0 text-brand-accent" />
            {!isCollapsed && <span className="ml-3 font-semibold whitespace-nowrap">Create</span>}
          </button>
          
          {showPostMenu && (
            <div className={`absolute left-full top-0 ml-2 w-48 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl overflow-hidden z-[60] flex flex-col ${!isCollapsed ? 'left-0 top-full mt-2 ml-0' : ''}`}>
              <Link 
                href="/post/photo" 
                className="flex items-center px-4 py-3 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                onClick={() => setShowPostMenu(false)}
              >
                <ImageIcon size={16} className="mr-3 text-neutral-500" />
                New Post
              </Link>

              <Link 
                href="/create/story" 
                className="flex items-center px-4 py-3 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors border-b border-neutral-800/50"
                onClick={() => setShowPostMenu(false)}
              >
                <PlayCircle size={16} className="mr-3 text-neutral-500" />
                Add to Story
              </Link>
              <Link 
                href="/post/review" 
                className="flex items-center px-4 py-3 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                onClick={() => setShowPostMenu(false)}
              >
                <PenTool size={16} className="mr-3 text-brand-accent" />
                Write Deep Review
              </Link>
            </div>
          )}
        </div>

        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-3 rounded-lg transition-colors overflow-hidden ${
                isActive
                  ? "bg-brand-accent text-white"
                  : "text-neutral-400 hover:bg-neutral-800 hover:text-brand-text"
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon size={20} className="shrink-0" />
              {!isCollapsed && (
                <span className="ml-3 font-medium whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-neutral-800">
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center w-full px-3 py-3 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-brand-text transition-colors overflow-hidden"
        >
          <Settings size={20} className="shrink-0" />
          {!isCollapsed && <span className="ml-3 font-medium whitespace-nowrap">Settings</span>}
        </button>
      </div>
    </motion.nav>
  );
}
