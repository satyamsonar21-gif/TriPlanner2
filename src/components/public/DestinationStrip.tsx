import React, { useEffect, useRef, useState } from 'react';

/**
 * Real, high-quality Unsplash images of famous Indian and world destinations.
 * Each image is a real photograph — NOT AI generated.
 */
const DESTINATION_IMAGES = [
  {
    src: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&q=80&w=600&h=400',
    name: 'Taj Mahal',
    location: 'Agra, India',
  },
  {
    src: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&q=80&w=600&h=400',
    name: 'Hawa Mahal',
    location: 'Jaipur, India',
  },
  {
    src: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&q=80&w=600&h=400',
    name: 'Backwaters',
    location: 'Kerala, India',
  },
  {
    src: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&q=80&w=600&h=400',
    name: 'Golden Beach',
    location: 'Goa, India',
  },
  {
    src: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&q=80&w=600&h=400',
    name: 'Dal Lake',
    location: 'Kashmir, India',
  },
  {
    src: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&q=80&w=600&h=400',
    name: 'Golden Fort',
    location: 'Jaisalmer, India',
  },
  {
    src: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&q=80&w=600&h=400',
    name: 'Blue Mosque',
    location: 'Istanbul, Turkey',
  },
  {
    src: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&q=80&w=600&h=400',
    name: 'Tropical Coast',
    location: 'Bali, Indonesia',
  },
  {
    src: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&q=80&w=600&h=400',
    name: 'Gateway of India',
    location: 'Mumbai, India',
  },
  {
    src: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&q=80&w=600&h=400',
    name: 'Himalayan Vista',
    location: 'Manali, India',
  },
  {
    src: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&q=80&w=600&h=400',
    name: 'Amber Fort',
    location: 'Jaipur, India',
  },
  {
    src: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&q=80&w=600&h=400',
    name: 'Santorini',
    location: 'Greece',
  },
  // ── Additional World-Famous Destinations ──
  {
    src: 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?auto=format&fit=crop&q=80&w=600&h=400',
    name: 'Machu Picchu',
    location: 'Cusco, Peru',
  },
  {
    src: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&q=80&w=600&h=400',
    name: 'Overwater Villas',
    location: 'Maldives',
  },
  {
    src: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=600&h=400',
    name: 'Fushimi Inari',
    location: 'Kyoto, Japan',
  },
  {
    src: 'https://images.unsplash.com/photo-1641128324972-af3212f0f6bd?auto=format&fit=crop&q=80&w=600&h=400',
    name: 'Cappadocia',
    location: 'Turkey',
  },
  {
    src: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&q=80&w=600&h=400',
    name: 'Varanasi Ghats',
    location: 'Uttar Pradesh, India',
  },
  {
    src: 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?auto=format&fit=crop&q=80&w=600&h=400',
    name: 'Northern Lights',
    location: 'Iceland',
  },
];

export const DestinationStrip: React.FC = () => {
  const stripRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Scroll-reveal observer for the section
  useEffect(() => {
    const el = stripRef.current?.parentElement;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          }
        });
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Duplicate images for seamless loop
  const images = [...DESTINATION_IMAGES, ...DESTINATION_IMAGES];

  return (
    <section className="py-14 border-b border-espresso/15 bg-gradient-to-b from-parchment/50 to-background overflow-hidden reveal-on-scroll">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-2 h-2 rounded-full bg-terracotta animate-pulse-glow" />
          <span className="font-mono text-xs uppercase tracking-widest text-terracotta font-semibold">
            WORLD-CLASS DESTINATIONS
          </span>
        </div>
        <h2 className="font-display text-2xl sm:text-3xl text-deep-slate font-normal tracking-tight">
          From the Himalayan peaks to the Aegean shores.
        </h2>
        <p className="text-stone-gray text-xs sm:text-sm mt-2 max-w-xl">
          Real destinations. Real photographs. Every journey begins with a place that moves you.
        </p>
      </div>

      {/* Infinite scrolling destination strip */}
      <div
        className="relative"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Left fade edge */}
        <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        {/* Right fade edge */}
        <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        <div
          ref={stripRef}
          className="destination-strip animate-scroll-left"
          style={{
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
        >
          {images.map((img, index) => (
            <div
              key={`${img.name}-${index}`}
              className="destination-strip-item w-[260px] sm:w-[300px] h-[180px] sm:h-[200px] mx-2 sm:mx-3 relative group cursor-pointer"
            >
              <img
                src={img.src}
                alt={`${img.name}, ${img.location} — Travel destination photograph`}
                loading="lazy"
                className="w-full h-full object-cover"
              />

              {/* Hover overlay with location info */}
              <div className="absolute inset-0 bg-gradient-to-t from-deep-slate/80 via-deep-slate/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-4">
                <span className="font-display text-lg text-soft-ivory font-medium tracking-tight leading-tight">
                  {img.name}
                </span>
                <span className="font-mono text-[10px] text-antique-brass uppercase tracking-wider mt-0.5">
                  {img.location}
                </span>
              </div>

              {/* Subtle static gradient at bottom */}
              <div className="absolute inset-0 bg-gradient-to-t from-deep-slate/30 to-transparent pointer-events-none group-hover:opacity-0 transition-opacity duration-300" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
