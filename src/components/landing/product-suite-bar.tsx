export function ProductSuiteBar() {
  return (
    <section className="border-y-2 border-dashed border-[#FE4819]/60 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-center gap-6 px-4 py-4 sm:gap-10">
        {/* SitSuite */}
        <span className="text-lg font-bold italic text-[#FE4819] sm:text-xl">
          SitSuite
        </span>

        {/* Toggle: square primary + circle black */}
        <div className="flex items-center gap-1.5">
          <span className="size-3 bg-[#FE4819]" />
          <span className="size-3 rounded-full bg-black" />
        </div>

        {/* SITRUS */}
        <span className="text-lg font-bold tracking-wide text-black sm:text-xl">
          SITRUS
        </span>

        {/* Toggle: circle black + square primary */}
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-black" />
          <span className="size-3 bg-[#FE4819]" />
        </div>

        {/* SitLink */}
        <span className="text-lg font-bold italic text-[#FE4819] sm:text-xl">
          SitLink
        </span>
      </div>
    </section>
  );
}
