/**
 * Landing Page — Sitrus Social Commerce Platform
 *
 * Public landing page matching the Figma design. Sections:
 * 1. Navbar (logo, nav links, search, profile)
 * 2. Hero (illustration + headline + CTA)
 * 3. Top Brands carousel
 * 4. Our Process (4-step zigzag)
 * 5. CTA banner
 * 6. Footer
 *
 * @module app/page
 */

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';


// =============================================================================
// Data
// =============================================================================

const brands = [
  { name: 'Myntra', commission: '8%', logo: '/myntra.png' },
  { name: 'Ajio', commission: '8%', logo: '/ajio.png' },
  { name: 'Flipkart', commission: '6%', logo: '/flipkart.png' },
  { name: 'Amazon', commission: '5%', logo: '/amazong.png' },
  { name: 'Nykaa', commission: '7%', logo: '/nykaa.png' },
];

const processSteps = [
  {
    image: '/process-step-1.png',
    highlight: 'Login',
    text: 'and link your Instagram in seconds.\nWe auto personalise your creator profile. No setup hassle.',
  },
  {
    image: '/process-step-2.png',
    highlight: 'Brands',
    text: 'Browse curated partner {highlight} across\ncategories. Pick the products you genuinely vibe with.',
  },
  {
    image: '/process-step-3.png',
    highlight: 'SitLinks',
    text: 'Generate unique {highlight} for any product\nyou choose. One tap → shareable, trackable, ready to promote.',
  },
  {
    image: '/process-step-4.png',
    highlight: 'Earnings',
    text: 'Add SitLinks to your content, stories, or captions.\nEvery click and sale you drive turns into real {highlight}.',
  },
];

// =============================================================================
// Component
// =============================================================================

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ================================================================== */}
      {/* Navbar                                                             */}
      {/* ================================================================== */}
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <Image
              src="/sitrus-logo-png.png"
              alt="Sitrus"
              width={36}
              height={36}
              className="rounded-lg"
            />
            <span className="text-xl font-bold tracking-tight hidden sm:inline">
              SITRUS
            </span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/register"
              className="text-sm font-semibold uppercase tracking-wide hover:text-primary transition-colors"
            >
              Creator
            </Link>
            <Link
              href="/login"
              className="text-sm font-semibold uppercase tracking-wide hover:text-primary transition-colors"
            >
              Brands
            </Link>
          </nav>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-sm items-center">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search for products and brands"
                className="pl-9 bg-muted/50 border-0"
                readOnly
              />
            </div>
          </div>

          {/* Auth */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">
                <User className="size-4 sm:mr-1" />
                <span className="hidden sm:inline">Get Started</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* ================================================================ */}
        {/* Hero Section                                                     */}
        {/* ================================================================ */}
        <section className="relative overflow-hidden">

          <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-24">
            <div className="grid items-center gap-8 lg:grid-cols-2">
              {/* Left — Hero Illustration */}
              <div className="relative order-2 lg:order-1 flex items-center justify-center">
                <Image
                  src="/hero.png"
                  alt="Sitrus hero illustration"
                  width={500}
                  height={500}
                  className="drop-shadow-lg"
                  priority
                />
              </div>

              {/* Right — Copy */}
              <div className="order-1 lg:order-2 space-y-6 text-center lg:text-left">
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                  SIT AND{' '}
                  <span className="relative inline-block">
                    <span className="relative z-10 text-primary italic">TRUST</span>
                    <span className="absolute -bottom-1 left-0 right-0 h-3 bg-primary/20 rounded" />
                  </span>{' '}
                  US
                </h1>
                <p className="max-w-md text-lg text-muted-foreground mx-auto lg:mx-0">
                  Turn your influence into your own space.
                  <br />
                  Share what you love and earn from it instantly.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                  <Button size="lg" asChild className="gap-2 rounded-md">
                    <Link href="/register">
                      Connect IG
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* Top Brands                                                       */}
        {/* ================================================================ */}
        <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
          <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">Top Brands</h2>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {brands.map((brand) => (
              <div
                key={brand.name}
                className="group relative flex shrink-0 flex-col items-center rounded-xl border-2 border-primary/60 bg-card p-4 transition-all hover:border-primary hover:shadow-md"
                style={{ width: '170px', height: '180px' }}
              >
                {/* Brand logo */}
                <div className="flex flex-1 items-center justify-center">
                  <Image
                    src={brand.logo}
                    alt={brand.name}
                    width={120}
                    height={60}
                    className="rounded object-contain"
                  />
                </div>
                {/* Commission label */}
                <div className="mt-auto w-full rounded-md bg-primary/5 py-2 text-center text-sm font-semibold text-primary">
                  {brand.commission} Commission
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================================================================ */}
        {/* Our Process                                                      */}
        {/* ================================================================ */}
        <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
          <h2 className="mb-16 text-2xl font-bold tracking-tight">Our Process</h2>

          <div className="relative space-y-16 lg:space-y-24">
            {/* Decorative connecting line */}
            <div className="absolute left-1/2 top-0 hidden h-full w-px border-l-2 border-dashed border-muted-foreground/20 lg:block" />

            {processSteps.map((step, i) => {
              const isLeft = i % 2 === 0;
              const parts = step.text.split(`{highlight}`);

              return (
                <div
                  key={i}
                  className={`relative flex flex-col items-center gap-6 lg:flex-row ${
                    isLeft ? '' : 'lg:flex-row-reverse'
                  }`}
                >
                  {/* Step Image */}
                  <div className="flex w-full justify-center lg:w-1/2">
                    <div className="relative">
                      <Image
                        src={step.image}
                        alt={`Step ${i + 1}`}
                        width={160}
                        height={160}
                        className="drop-shadow-lg"
                      />
                    </div>
                  </div>

                  {/* Step Text */}
                  <div
                    className={`w-full text-center lg:w-1/2 ${
                      isLeft ? 'lg:text-left' : 'lg:text-right'
                    }`}
                  >
                    <p className="text-base leading-relaxed text-muted-foreground whitespace-pre-line">
                      {parts.length > 1 ? (
                        <>
                          {parts[0]}
                          <span className="font-bold text-primary italic">
                            {step.highlight}
                          </span>
                          {parts[1]}
                        </>
                      ) : (
                        <>
                          <span className="font-bold text-primary italic">
                            {step.highlight}
                          </span>{' '}
                          {step.text}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ================================================================ */}
        {/* CTA Banner                                                       */}
        {/* ================================================================ */}
        <section className="mx-4 my-16 lg:mx-8">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl bg-white px-8 py-10 text-center text-foreground lg:py-14">
            <p className="text-2xl font-bold sm:text-3xl lg:text-4xl">
              Monetise your{' '}
              <span className="underline decoration-2 underline-offset-4">Content</span>.
              Work with top{' '}
              <span className="underline decoration-2 underline-offset-4">Brands</span>.
            </p>
            <div className="mt-8">
              <Button
                size="lg"
                asChild
                className="gap-2 rounded-md font-semibold"
              >
                <Link href="/register">
                  Get Started
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* ==================================================================== */}
      {/* Footer                                                               */}
      {/* ==================================================================== */}
      <footer className="border-t bg-foreground text-background">
        <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
          <div className="flex flex-col gap-6">
            {/* Logo + brand */}
            <div className="flex items-center gap-2.5">
              <Image
                src="/sitrus-logo-png.png"
                alt="Sitrus"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <span className="text-lg font-bold tracking-tight">SITRUS</span>
            </div>

            {/* Info */}
            <div className="space-y-1 text-sm text-background/60">
              <p>Copyright &copy; 2026, All Rights Reserved</p>
              <p>CIN: U47912KA2026PTC213843</p>
            </div>

            {/* Social links */}
            <div className="flex items-center gap-1 text-sm">
              <span className="text-background/60">Follow us on:</span>
              <a
                href="https://www.linkedin.com/company/teamsitrus/"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 flex size-8 items-center justify-center rounded bg-[#0077B5] text-white transition-opacity hover:opacity-80"
                aria-label="LinkedIn"
              >
                <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a
                href="https://instagram.com/sitrus.club"
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-8 items-center justify-center rounded bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white transition-opacity hover:opacity-80"
                aria-label="Instagram"
              >
                <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
