"use client";

import { Navigation } from "@/components/Navigation";
import { MobileNavBar } from "@/components/MobileNavBar";
import { SettingsModal } from "@/components/SettingsModal";
import { MobileHeader } from "@/components/MobileHeader";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navigation />
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <MobileHeader />
        <main className="flex-1 min-w-0 flex flex-col pb-16 md:pb-0 relative">
        {children}
        </main>
      </div>
      <MobileNavBar />
      <SettingsModal />
    </>
  );
}
