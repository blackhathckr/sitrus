import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Bottom gradient fade — white at top, peach/orange at bottom */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 40%, #FDDCCC 70%, #FCA67A 100%)',
        }}
      />

      {/* Scattered orange dots */}
      <div className="absolute top-[12%] right-[48%] size-2.5 bg-[#FE4819] hidden lg:block" />
      <div className="absolute top-[8%] right-[6%] size-2.5 bg-[#FE4819] hidden lg:block" />
      <div className="absolute bottom-[18%] left-[32%] size-2.5 bg-[#FE4819] hidden lg:block" />
      <div className="absolute bottom-[10%] left-[40%] size-2.5 bg-[#FE4819] hidden lg:block" />

      <div className="relative mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-20">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          {/* Left — Copy */}
          <div className="space-y-6">
            <h1 className="text-5xl font-extrabold tracking-tight text-black sm:text-6xl lg:text-7xl leading-[1.05]">
              SIT AND
              <br />
              <span className="relative inline-block">
                <span className="relative z-10 text-[#FE4819] italic">TRUST</span>
                {/* Orange underline swoosh */}
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 200 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M2 8C40 2 80 2 100 5C120 8 160 10 198 4"
                    stroke="#FE4819"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </span>{' '}
              US
            </h1>

            <p className="max-w-md text-base text-black leading-relaxed">
              Post and{' '}
              <span className="font-semibold text-[#FE4819] italic underline underline-offset-2">
                monetize
              </span>{' '}
              your content
              <br />
              Work with top{' '}
              <span className="font-semibold text-[#FE4819] underline underline-offset-2">
                Brands
              </span>
            </p>

            <div className="flex items-center gap-3">
              {/* Get Started — peach gradient */}
              <Link
                href="/register"
                className="flex items-center gap-1.5 rounded-sm border border-black/20 px-5 py-2 text-sm font-semibold text-black transition-all"
                style={{ background: 'linear-gradient(90deg, rgba(253,220,204,0.8) 0%, rgba(255,255,255,0.8) 100%)' }}
              >
                Get Started
                <ArrowUpRight className="size-3.5" />
              </Link>
              {/* Connect IG — purple/magenta gradient */}
              <Link
                href="/register"
                className="rounded-sm bg-gradient-to-r from-[#FF6B6B] via-[#D63384] to-[#9B59B6] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Connect IG
              </Link>
            </div>
          </div>

          {/* Right — Hero Illustration */}
          <div className="flex items-center justify-center">
            <Image
              src="/hero-1.png"
              alt="Creator illustration"
              width={520}
              height={520}
              className="drop-shadow-xl"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
