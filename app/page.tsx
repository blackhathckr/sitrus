import { LandingNavbar } from '@/components/landing/landing-navbar';
import { HeroSection } from '@/components/landing/hero-section';
import { ProductSuiteBar } from '@/components/landing/product-suite-bar';
import { BrandsSection } from '@/components/landing/brands-section';
import { SitStepsSection } from '@/components/landing/sitsteps-section';
import { LandingFooter } from '@/components/landing/landing-footer';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-white">
      <LandingNavbar />
      <main>
        <HeroSection />
        <ProductSuiteBar />
        <BrandsSection />
        <SitStepsSection />
      </main>
      <LandingFooter />
      {/* Full-page grid overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-[9999]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,0,0,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.07) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
    </div>
  );
}
