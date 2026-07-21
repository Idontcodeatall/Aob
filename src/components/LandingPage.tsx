"use client";

import Link from "next/link";
import { Star, Bot, ArrowRight, Library } from "lucide-react";
import { Logo } from "@/components/Logo";

const features = [
  {
    icon: Library,
    title: "Track Your Library",
    desc: "TBR, Reading, Finished, DNF — your entire reading life in one place.",
  },
  {
    icon: Star,
    title: "Deep Reviews",
    desc: "Rate books on five aesthetic axes and build your reading mood profile.",
  },
  {
    icon: Bot,
    title: "AI Librarian — Montag",
    desc: "A witty AI that reads your library and recommends your next book.",
  },
];

export function LandingPage() {
  return (
    <div className="flex-1 w-full min-h-screen flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Subtle radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 40%, rgba(128,0,0,0.12) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto gap-8">
        {/* Logo */}
        <div className="mb-2">
          <Logo collapsed={false} />
        </div>

        {/* Headline */}
        <div className="space-y-4">
          <h1 className="font-serif font-bold text-brand-text leading-tight text-4xl md:text-5xl lg:text-6xl">
            An app for all your
            <br />
            <span className="text-brand-accent">reading needs.</span>
          </h1>
          <p className="text-neutral-400 text-base md:text-lg max-w-lg mx-auto leading-relaxed">
            Goodreads meets Instagram — with an AI that actually knows your taste.
            Track what you read, review with depth, and discover what&apos;s next.
          </p>
        </div>

        {/* CTA */}
        <Link
          id="landing-cta"
          href="/profile"
          className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-brand-accent text-white font-semibold text-base hover:bg-brand-accent/85 transition-all duration-200 shadow-lg shadow-brand-accent/25 hover:shadow-brand-accent/40 hover:scale-[1.02] active:scale-[0.98]"
        >
          Sign In / Create Account
          <ArrowRight size={18} />
        </Link>

        {/* Feature Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mt-2">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex flex-col items-center gap-3 bg-neutral-900/60 border border-neutral-800 rounded-2xl px-5 py-6 text-center hover:border-neutral-700 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
                <Icon size={20} className="text-brand-accent" />
              </div>
              <h3 className="font-semibold text-sm text-brand-text">{title}</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Footer nudge */}
        <p className="text-[11px] text-neutral-600 mt-2">
          No social graph yet — your data stays yours.
        </p>
      </div>
    </div>
  );
}
