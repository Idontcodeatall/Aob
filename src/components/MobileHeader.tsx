import { Logo } from "@/components/Logo";

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-[60] w-full bg-brand-bg/90 backdrop-blur-md border-b border-neutral-800/50 md:hidden">
      <div className="flex items-center justify-center py-2 px-4 shadow-sm">
        <Logo collapsed={false} />
      </div>
    </header>
  );
}
