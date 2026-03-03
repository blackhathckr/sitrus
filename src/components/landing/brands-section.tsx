import Image from 'next/image';

const brands = [
  { name: 'Myntra', commission: '8%', logo: '/myntra.png' },
  { name: 'Ajio', commission: '8%', logo: '/ajio.png' },
  { name: 'Flipkart', commission: '8%', logo: '/flipkart.png' },
  { name: 'Amazon', commission: '8%', logo: '/amazong.png' },
  { name: 'Nykaa', commission: '8%', logo: '/nykaa.png' },
];

export function BrandsSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Top: inverted gradient (orange at top fading to white) + Bottom: white fading to orange */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #F08050 0%, #FCA67A 15%, #FDDCCC 35%, #FDDCCC 65%, #FCA67A 80%, #F08050 100%)',
        }}
      />

      {/* Scattered orange dots */}
      <div className="absolute top-[55%] left-[8%] size-2.5 bg-[#FE4819] hidden lg:block" />
      <div className="absolute bottom-[12%] right-[8%] size-2.5 bg-[#FE4819] hidden lg:block" />
      <div className="absolute bottom-[8%] left-[12%] size-2.5 bg-[#FE4819] hidden lg:block" />

      <div className="relative">
        {/* Title area */}
        <div className="mx-auto max-w-7xl px-4 pt-16 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            <span className="text-black font-extrabold">Creators</span>{' '}
            <span className="text-white">one stop tool, trusted by</span>{' '}
            <span className="text-black font-extrabold">Brands</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-center text-sm text-black">
            Explore{' '}
            <span className="font-semibold text-white italic underline underline-offset-2">
              SitSuite
            </span>{' '}
            for monetization tools and map your{' '}
            <span className="font-semibold text-white italic underline underline-offset-2">
              growth
            </span>
          </p>
        </div>

        {/* Brand Cards — rectangles with small corner radius */}
        <div className="mx-auto max-w-4xl px-4 pt-14 pb-10 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-4">
            {brands.map((brand) => (
              <div
                key={brand.name}
                className="flex w-[130px] flex-col items-center rounded-sm border-2 border-[#FE4819] bg-[#FE4819] p-0 shadow-sm transition-all hover:shadow-md sm:w-[145px]"
              >
                {/* Logo area — white bg */}
                <div className="flex h-20 w-full items-center justify-center bg-white rounded-t-[1px]">
                  <Image
                    src={brand.logo}
                    alt={brand.name}
                    width={90}
                    height={45}
                    className="object-contain"
                  />
                </div>
                {/* Commission label — white bg, black text, sits at bottom */}
                <div className="w-full bg-[#FE4819] px-1 pb-1.5 pt-1">
                  <div className="w-full rounded-[2px] bg-white py-1 text-center text-[10px] font-semibold text-black">
                    Commission {brand.commission}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Character Illustration */}
        <div className="flex justify-center pb-0">
          <Image
            src="/down-hero.png"
            alt="Creator with magnifying glass"
            width={400}
            height={400}
            className="drop-shadow-xl"
          />
        </div>
      </div>
    </section>
  );
}
