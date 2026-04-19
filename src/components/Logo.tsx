import Link from "next/link";

export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link href="/" className="flex flex-col items-center justify-center group transition-transform active:scale-95">
      {/* Monogram Structure */}
      <div 
        className="relative flex items-center justify-center font-serif font-black text-brand-text leading-none select-none transition-colors group-hover:opacity-90"
        style={{ 
          fontSize: collapsed ? '1.75rem' : '2.5rem', 
          letterSpacing: '-0.02em' 
        }}
      >
        <span className="relative z-20 drop-shadow-[2px_0_4px_rgba(0,0,0,0.8)] -mr-1">A</span>
        
        {/* The 'o²' Symbol */}
        <div className="relative flex items-center justify-center z-10 text-brand-accent mx-0.5" style={{ transform: 'translateY(12%)' }}>
          <span className="italic drop-shadow-[2px_0px_4px_rgba(0,0,0,0.5)]" style={{ fontSize: collapsed ? '1.4rem' : '2rem' }}>o</span>
          <span className="absolute font-sans font-bold leading-none drop-shadow-sm" style={{ 
            fontSize: collapsed ? '0.75rem' : '1.1rem', 
            top: collapsed ? '-2px' : '-2px', 
            right: collapsed ? '-6px' : '-10px' 
          }}>
            2
          </span>
        </div>

        <span className="relative z-0 -ml-1">B</span>
      </div>

      {/* Baseline Subtext */}
      {!collapsed && (
        <span className="font-sans text-[8px] md:text-[9px] uppercase tracking-[0.2em] text-neutral-400 font-bold mt-1.5 ml-1">
          ARCHIVE OF OUR BOOKS
        </span>
      )}
    </Link>
  );
}
