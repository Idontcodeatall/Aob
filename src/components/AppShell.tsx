"use client";

import { Navigation } from "@/components/Navigation";
import { MobileNavBar } from "@/components/MobileNavBar";
import { SettingsModal } from "@/components/SettingsModal";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navigation />
      <main className="flex-1 min-w-0 flex flex-col min-h-screen pb-16 md:pb-0">
        {children}
      </main>
      <MobileNavBar />
      <SettingsModal />
    </>
  );
}
