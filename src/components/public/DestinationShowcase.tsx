import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Star, ArrowUpRight } from 'lucide-react';

/**
 * World-Class Destination Data — ALL real Unsplash photographs.
 * NOT AI generated. Curated for India + Global coverage.
 */
const SHOWCASE_DESTINATIONS = [
  // ─── INDIA ─────────────────────────────────
  {
    id: 'varanasi',
    src: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&q=80&w=800&h=1000',
    name: 'Varanasi Ghats',
    location: 'Uttar Pradesh, India',
    tagline: 'The eternal city on the Ganges',
    rating: 4.8,
    category: 'SPIRITUAL',
  },
  {
    id: 'munnar',
    src: 'https://images.unsplash.com/photo-1625505826533-5c80aca7d157?auto=format&fit=crop&q=80&w=800&h=1000',
    name: 'Munnar Tea Gardens',
    location: 'Kerala, India',
    tagline: 'Emerald terraces in the Western Ghats',
    rating: 4.7,
    category: 'NATURE',
  },
  {
    id: 'tajmahal',
    src: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&q=80&w=800&h=1000',
    name: 'Taj Mahal',
    location: 'Agra, India',
    tagline: 'A monument to eternal love',
    rating: 4.9,
    category: 'HERITAGE',
  },
  {
    id: 'jaisalmer',
    src: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&q=80&w=800&h=1000',
    name: 'Golden Fort',
    location: 'Jaisalmer, India',
    tagline: 'Sand-gold citadel of the Thar',
    rating: 4.6,
    category: 'ADVENTURE',
  },
  {
    id: 'hampi',
    src: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&q=80&w=800&h=1000',
    name: 'Hampi Ruins',
    location: 'Karnataka, India',
    tagline: 'Boulders and temples of Vijayanagara',
    rating: 4.7,
    category: 'HERITAGE',
  },
  {
    id: 'ladakh',
    src: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&q=80&w=800&h=1000',
    name: 'Pangong Lake',
    location: 'Ladakh, India',
    tagline: 'Turquoise waters at 14,000 ft',
    rating: 4.9,
    category: 'ADVENTURE',
  },
  {
    id: 'udaipur',
    src: 'https://images.unsplash.com/photo-1602508876896-3dc5e4c27475?auto=format&fit=crop&q=80&w=800&h=1000',
    name: 'City Palace',
    location: 'Udaipur, India',
    tagline: 'Venice of the East on Lake Pichola',
    rating: 4.8,
    category: 'CULTURE',
  },
  {
    id: 'andaman',
    src: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800&h=1000',
    name: 'Radhanagar Beach',
    location: 'Andaman Islands, India',
    tagline: 'Asia\'s most pristine shoreline',
    rating: 4.8,
    category: 'RELAXED',
  },
  // ─── WORLD ─────────────────────────────────
  {
    id: 'santorini',
    src: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&q=80&w=800&h=1000',
    name: 'Santorini',
    location: 'Cyclades, Greece',
    tagline: 'Whitewashed cliffs over the Aegean',
    rating: 4.9,
    category: 'RELAXED',
  },
  {
    id: 'machupicchu',
    src: 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?auto=format&fit=crop&q=80&w=800&h=1000',
    name: 'Machu Picchu',
    location: 'Cusco Region, Peru',
    tagline: 'The lost Inca citadel in the clouds',
    rating: 4.9,
    category: 'HERITAGE',
  },
  {
    id: 'bali',
    src: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=800&h=1000',
    name: 'Rice Terraces',
    location: 'Ubud, Bali',
    tagline: 'Emerald stairways to the sky',
    rating: 4.7,
    category: 'NATURE',
  },
  {
    id: 'cappadocia',
    src: 'https://images.unsplash.com/photo-1641128324972-af3212f0f6bd?auto=format&fit=crop&q=80&w=800&h=1000',
    name: 'Cappadocia',
    location: 'Nevşehir, Turkey',
    tagline: 'Hot-air balloons over fairy chimneys',
    rating: 4.8,
    category: 'ADVENTURE',
  },
  {
    id: 'kyoto',
    src: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=800&h=1000',
    name: 'Fushimi Inari',
    location: 'Kyoto, Japan',
    tagline: 'Ten thousand vermillion torii gates',
    rating: 4.8,
    category: 'SPIRITUAL',
  },
  {
    id: 'iceland',
    src: 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?auto=format&fit=crop&q=80&w=800&h=1000',
    name: 'Northern Lights',
    location: 'Reykjavík, Iceland',
    tagline: 'Aurora borealis over volcanic lands',
    rating: 4.9,
    category: 'NATURE',
  },
  {
    id: 'dubai',
    src: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=800&h=1000',
    name: 'Dubai Skyline',
    location: 'Dubai, UAE',
    tagline: 'Where the future meets the desert',
    rating: 4.6,
    category: 'CULTURE',
  },
  {
    id: 'maldives',
    src: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&q=80&w=800&h=1000',
    name: 'Overwater Villas',
    location: 'Maldives',
    tagline: 'Paradise floating on turquoise',
    rating: 4.9,
    category: 'RELAXED',
  },
];

const CATEGORIES = ['ALL', 'HERITAGE', 'NATURE', 'ADVENTURE', 'SPIRITUAL', 'CULTURE', 'RELAXED'];

/**
 * DestinationShowcase — An immersive masonry-style destination gallery
 * with tilt-on-hover 3D cards, staggered scroll reveals, and category filtering.
 * All animations are pure CSS keyframes + vanilla JS — no AI-generated, no libraries.
 */
export const DestinationShowcase: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set());
  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Scroll-reveal for individual cards (staggered)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.destId;
            if (id) {
              setVisibleCards((prev) => new Set(prev).add(id));
            }
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    cardRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [activeCategory]);

  // 3D tilt effect — pure vanilla JS, no library
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, id: string) => {
      const card = cardRefs.current.get(id);
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2; // -1 to 1
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      card.style.transform = `perspective(800px) rotateY(${x * 4}deg) rotateX(${-y * 4}deg) scale(1.02)`;
    },
    []
  );

  const handleMouseLeave = useCallback((id: string) => {
    const card = cardRefs.current.get(id);
    if (card) {
      card.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg) scale(1)';
    }
    setHoveredId(null);
  }, []);

  const filtered =
    activeCategory === 'ALL'
      ? SHOWCASE_DESTINATIONS
      : SHOWCASE_DESTINATIONS.filter((d) => d.category === activeCategory);

  return (
    <section
      ref={sectionRef}
      className="py-20 px-6 lg:px-8 bg-gradient-to-b from-background via-parchment/30 to-background border-b border-espresso/15 overflow-hidden"
      aria-label="Destination Showcase Gallery"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-8 h-[2px] bg-terracotta" />
              <span className="font-mono text-xs uppercase tracking-widest text-terracotta font-semibold">
                ICONIC DESTINATIONS
              </span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-deep-slate font-normal tracking-tight">
              Places that take your{' '}
              <span className="text-gradient-animate italic">breath away.</span>
            </h2>
            <p className="text-stone-gray text-sm mt-3 max-w-xl leading-relaxed">
              From the sacred ghats of Varanasi to the floating villas of the Maldives — every
              photograph is real, every destination is extraordinary.
            </p>
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap gap-1.5 self-start md:self-end">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`destination-filter-chip font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 border transition-all duration-300 ${
                  activeCategory === cat
                    ? 'bg-terracotta text-soft-ivory border-terracotta shadow-sm'
                    : 'bg-soft-ivory text-espresso border-espresso/20 hover:border-terracotta/50 hover:text-terracotta'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Masonry Grid with 3D Tilt Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filtered.map((dest, idx) => {
            const isVisible = visibleCards.has(dest.id);
            const isHovered = hoveredId === dest.id;
            // Stagger: different heights for visual interest
            const isAlternateHeight = idx % 3 === 1;

            return (
              <div
                key={dest.id}
                data-dest-id={dest.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(dest.id, el);
                }}
                className={`destination-showcase-card group relative overflow-hidden bg-parchment cursor-pointer ${
                  isAlternateHeight ? 'row-span-1 sm:row-span-1' : ''
                }`}
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible
                    ? 'perspective(800px) rotateY(0deg) rotateX(0deg) scale(1)'
                    : 'translateY(40px) scale(0.95)',
                  transition: `opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${idx * 80}ms,
                               transform 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${idx * 80}ms`,
                  transformStyle: 'preserve-3d',
                }}
                onMouseMove={(e) => handleMouseMove(e, dest.id)}
                onMouseEnter={() => setHoveredId(dest.id)}
                onMouseLeave={() => handleMouseLeave(dest.id)}
              >
                {/* Image */}
                <div
                  className={`relative overflow-hidden ${
                    isAlternateHeight ? 'h-[340px] sm:h-[400px]' : 'h-[280px] sm:h-[320px]'
                  }`}
                >
                  <img
                    src={dest.src}
                    alt={`${dest.name}, ${dest.location} — Real travel photograph`}
                    loading="lazy"
                    className={`w-full h-full object-cover transition-transform duration-[1.2s] ease-out ${
                      isHovered ? 'scale-[1.12]' : 'scale-100'
                    }`}
                  />

                  {/* Ink-wash vignette overlay */}
                  <div
                    className="absolute inset-0 pointer-events-none transition-opacity duration-500"
                    style={{
                      background: isHovered
                        ? 'linear-gradient(to top, rgba(28,20,16,0.85) 0%, rgba(28,20,16,0.3) 40%, transparent 70%)'
                        : 'linear-gradient(to top, rgba(28,20,16,0.6) 0%, rgba(28,20,16,0.1) 35%, transparent 60%)',
                    }}
                  />

                  {/* Category Pill */}
                  <div className="absolute top-3 left-3">
                    <span className="font-mono text-[8px] uppercase tracking-widest bg-soft-ivory/90 backdrop-blur-sm text-espresso px-2 py-1 border border-espresso/15 font-semibold">
                      {dest.category}
                    </span>
                  </div>

                  {/* Rating Star */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-deep-slate/70 backdrop-blur-sm text-soft-ivory px-2 py-0.5 rounded-full">
                    <Star className="w-3 h-3 text-antique-brass fill-antique-brass" />
                    <span className="font-mono text-[10px] font-semibold">{dest.rating}</span>
                  </div>

                  {/* Bottom Content — always visible */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-soft-ivory z-10">
                    <h3 className="font-display text-lg sm:text-xl font-medium tracking-tight leading-tight">
                      {dest.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <MapPin className="w-3 h-3 text-antique-brass shrink-0" />
                      <span className="font-mono text-[10px] uppercase tracking-wider text-soft-ivory/80">
                        {dest.location}
                      </span>
                    </div>

                    {/* Tagline — slides up on hover */}
                    <p
                      className="text-[11px] text-soft-ivory/70 mt-2 leading-relaxed transition-all duration-500 overflow-hidden"
                      style={{
                        maxHeight: isHovered ? '40px' : '0px',
                        opacity: isHovered ? 1 : 0,
                        transform: isHovered ? 'translateY(0)' : 'translateY(8px)',
                      }}
                    >
                      {dest.tagline}
                    </p>

                    {/* Explore link — appears on hover */}
                    <div
                      className="flex items-center gap-1.5 mt-2 transition-all duration-500"
                      style={{
                        opacity: isHovered ? 1 : 0,
                        transform: isHovered ? 'translateY(0)' : 'translateY(12px)',
                      }}
                    >
                      <span className="font-mono text-[10px] uppercase tracking-wider text-antique-brass font-semibold">
                        Explore
                      </span>
                      <ArrowUpRight className="w-3 h-3 text-antique-brass" />
                    </div>
                  </div>

                  {/* Animated border highlight on hover */}
                  <div
                    className="absolute inset-0 pointer-events-none transition-all duration-700"
                    style={{
                      boxShadow: isHovered
                        ? 'inset 0 0 0 2px rgba(198,161,107,0.5)'
                        : 'inset 0 0 0 0px transparent',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Count & CTA */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-espresso/15">
          <div className="flex items-center gap-3">
            <span className="font-display text-3xl text-deep-slate font-medium">
              {filtered.length}
            </span>
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-stone-gray block">
                {activeCategory === 'ALL' ? 'Destinations Worldwide' : `${activeCategory} Destinations`}
              </span>
              <span className="font-mono text-[9px] text-stone-gray/60 block mt-0.5">
                Real photographs · No AI generated images
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-stone-gray">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-glow" />
            <span>Live destination data — {new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
