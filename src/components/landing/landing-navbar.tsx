import Link from 'next/link';
import Image from 'next/image';
import { Search, ArrowUpRight } from 'lucide-react';

export function LandingNavbar() {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Image
            src="/sitrus-logo-png.png"
            alt="Sitrus"
            width={32}
            height={32}
            className="rounded-lg"
          />
        </Link>

        {/* Nav Pills */}
        <nav className="hidden md:flex items-center gap-3">
          <Link
            href="/register"
            className="rounded-sm border border-black/60 px-4 py-1 text-sm font-medium tracking-wide text-black transition-colors hover:bg-black hover:text-white"
          >
            Creator
          </Link>
          <Link
            href="/login"
            className="rounded-sm border border-black/60 px-4 py-1 text-sm font-medium tracking-wide text-black transition-colors hover:bg-black hover:text-white"
          >
            Brands
          </Link>
        </nav>

        {/* Search Bar */}
        <div className="hidden md:flex flex-1 max-w-sm items-center">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-black/40" />
            <input
              placeholder="Search for products or brands"
              className="w-full rounded-sm border border-black/20 bg-white py-2 pl-9 pr-4 text-sm text-black placeholder:text-[#FE4819]/60 focus:outline-none focus:ring-2 focus:ring-[#FE4819]/30"
              readOnly
            />
          </div>
        </div>

        {/* Get Started */}
        <Link
          href="/register"
          className="flex items-center gap-1 rounded-sm border border-black/20 px-4 py-1.5 text-sm font-semibold text-black transition-all"
          style={{ background: 'linear-gradient(90deg, rgba(253,220,204,0.8) 0%, rgba(255,255,255,0.8) 100%)' }}
        >
          Get Started
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
    </header>
  );
}
