import React, { useState, useEffect, useCallback } from 'react';

/**
 * Hero destination images — real photos from famous Indian and world landmarks.
 * Rotates with a smooth crossfade + Ken Burns effect.
 */
const HERO_DESTINATIONS = [
  {
    src: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&q=80&w=1400&h=900',
    name: 'Taj Mahal',
    region: 'Agra · Uttar Pradesh',
    ref: 'IND-2026-AGR-TAJ',
  },
  {
    src: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&q=80&w=1400&h=900',
    name: 'Alleppey Backwaters',
    region: 'Kerala · Malabar Coast',
    ref: 'IND-2026-KER-BKW',
  },
  {
    src: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&q=80&w=1400&h=900',
    name: 'Istanbul Skyline',
    region: 'Turkey · Eurasia',
    ref: 'TUR-2026-IST-LIVING',
  },
  {
    src: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&q=80&w=1400&h=900',
    name: 'Dal Lake Houseboats',
    region: 'Kashmir · Himalayas',
    ref: 'IND-2026-KAS-DAL',
  },
  {
    src: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&q=80&w=1400&h=900',
    name: 'Amber Fort',
    region: 'Jaipur · Rajasthan',
    ref: 'IND-2026-JAI-AMB',
  },
  {
    src: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&q=80&w=1400&h=900',
    name: 'Tropical Serenity',
    region: 'Bali · Indonesia',
    ref: 'IDN-2026-BAL-COAST',
  },
];

export const HeroImageCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goToNext = useCallback(() => {
    setIsTransitioning(true);
    setPrevIndex(currentIndex);
    setCurrentIndex((prev) => (prev + 1) % HERO_DESTINATIONS.length);
    setTimeout(() => {
      setIsTransitioning(false);
      setPrevIndex(null);
    }, 1200);
  }, [currentIndex]);

  useEffect(() => {
    const interval = setInterval(goToNext, 5500);
    return () => clearInterval(interval);
  }, [goToNext]);

  const current = HERO_DESTINATIONS[currentIndex];
  const prev = prevIndex !== null ? HERO_DESTINATIONS[prevIndex] : null;

  return (
    <div className="relative border-2 border-espresso/30 bg-parchment shadow-xl overflow-hidden aspect-[4/3] sm:aspect-[16/11]">
      {/* Previous image (fading out) */}
      {prev && isTransitioning && (
        <img
          src={prev.src}
          alt={`${prev.name}, ${prev.region}`}
          className="absolute inset-0 w-full h-full object-cover object-center animate-crossfade-out animate-ken-burns"
        />
      )}

      {/* Current image (fading in with Ken Burns) */}
      <img
        key={currentIndex}
        src={current.src}
        alt={`${current.name}, ${current.region} — Featured destination`}
        className={`w-full h-full object-cover object-center animate-ken-burns ${
          isTransitioning ? 'animate-crossfade-in' : ''
        }`}
      />

      {/* Subtle Grain Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-15"
        style={{
          backgroundImage: 'radial-gradient(#33231E 0.5px, transparent 0.5px)',
          backgroundSize: '8px 8px',
        }}
      />

      {/* Vignette Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-deep-slate/60 via-transparent to-black/10 pointer-events-none" />

      {/* Archive Reference Badge */}
      <div className="absolute top-4 right-4 glass-card px-3 py-1.5 shadow-sm text-right">
        <span className="font-mono text-[8px] uppercase tracking-widest text-stone-gray block">
          ARCHIVE REF
        </span>
        <span className="font-mono text-[10px] font-semibold text-deep-slate">
          {current.ref}
        </span>
      </div>

      {/* Destination Name + Region */}
      <div className="absolute bottom-4 left-4 text-soft-ivory">
        <span className="font-mono text-[9px] uppercase tracking-widest text-antique-brass block">
          FEATURED DESTINATION
        </span>
        <span className="font-display text-xl sm:text-2xl font-medium tracking-tight">
          {current.name}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-soft-ivory/70 block mt-0.5">
          {current.region}
        </span>
      </div>

      {/* Progress Dots */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1.5">
        {HERO_DESTINATIONS.map((_, idx) => (
          <button
            key={idx}
            type="button"
            aria-label={`Show destination ${idx + 1}`}
            onClick={() => {
              if (idx !== currentIndex) {
                setIsTransitioning(true);
                setPrevIndex(currentIndex);
                setCurrentIndex(idx);
                setTimeout(() => {
                  setIsTransitioning(false);
                  setPrevIndex(null);
                }, 1200);
              }
            }}
            className={`transition-all duration-300 rounded-full ${
              idx === currentIndex
                ? 'w-6 h-2 bg-terracotta'
                : 'w-2 h-2 bg-soft-ivory/50 hover:bg-soft-ivory/80'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
