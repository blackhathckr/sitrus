import Image from 'next/image';

const steps = [
  {
    image: '/process-step-1.png',
    highlight: 'Login',
    before: '',
    after: ' and link your Instagram in seconds.\nWe auto personalise your creator profile. No setup hassle.',
    position: 'left' as const,
  },
  {
    image: '/process-step-2.png',
    highlight: 'Brands',
    before: 'Browse curated partner ',
    after: ' across\ncategories. Pick the products you genuinely vibe with.',
    position: 'right' as const,
  },
  {
    image: '/process-step-3.png',
    highlight: 'SitLinks',
    before: 'Generate unique ',
    after: ' for any product\nyou choose. One tap → shareable, trackable, ready to promote.',
    position: 'left' as const,
  },
  {
    image: '/process-step-4.png',
    highlight: 'Earnings',
    before: 'Add SitLinks to your content, stories, or captions.\nEvery click and sale you drive turns into real ',
    after: '.',
    position: 'right' as const,
  },
];

// Small orange square dots scattered around
const dots = [
  { top: '2%', left: '2%' },
  { top: '28%', left: '42%' },
  { top: '26%', right: '2%' },
  { top: '48%', left: '2%' },
  { top: '50%', left: '50%' },
  { top: '68%', right: '2%' },
  { top: '72%', left: '2%' },
  { top: '78%', left: '45%' },
  { bottom: '2%', left: '48%' },
];

export function SitStepsSection() {
  return (
    <section className="relative bg-white py-16 lg:py-24 border-t-2 border-[#FE4819]">
      {/* Orange border left & right */}
      <div className="absolute left-0 top-0 h-full w-1 bg-[#FE4819]" />
      <div className="absolute right-0 top-0 h-full w-1 bg-[#FE4819]" />

      {/* Scattered orange dots */}
      {dots.map((pos, i) => (
        <div
          key={i}
          className="absolute size-2 bg-[#FE4819]"
          style={pos}
        />
      ))}

      <div className="relative mx-auto max-w-5xl px-6 lg:px-10">
        {/* Title — right aligned */}
        <h2
          className="mb-16 text-right text-3xl font-bold italic tracking-tight sm:text-4xl overflow-visible pr-1"
          style={{
            background: 'linear-gradient(90deg, #000000 0%, #FE4819 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          SitSteps
        </h2>

        {/* Steps — zigzag: icon pushed to edges, text starts from icon's inner-bottom edge */}
        <div className="space-y-16 lg:space-y-20">
          {steps.map((step, i) => {
            const isLeft = step.position === 'left';

            return (
              <div
                key={i}
                className={`flex flex-col ${isLeft ? 'items-start' : 'items-end'}`}
              >
                {/* Icon — pushed far to the edge */}
                <div className={`relative z-[10000] ${isLeft ? '-ml-2 lg:-ml-6' : '-mr-2 lg:-mr-6'}`}>
                  <Image
                    src={step.image}
                    alt={`Step ${i + 1}`}
                    width={130}
                    height={130}
                    className="drop-shadow-lg"
                  />
                </div>

                {/* Text — anchored to the inner-bottom edge of the icon */}
                <div
                  className={`mt-1 max-w-lg ${
                    isLeft ? 'pl-0 lg:pl-4 text-left' : 'pr-0 lg:pr-4 text-right'
                  }`}
                >
                  <p className="text-sm leading-relaxed text-black font-bold whitespace-pre-line sm:text-base">
                    {step.before}
                    <span className="font-bold text-[#FE4819] italic">
                      {step.highlight}
                    </span>
                    {step.after}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
