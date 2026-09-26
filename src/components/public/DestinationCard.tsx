import React from 'react';
import { Link } from 'react-router-dom';
import type { Destination } from '@/types/database.types';
import { ArrowUpRight, Clock, Sparkles } from 'lucide-react';

interface DestinationCardProps {
  destination: Destination;
  variant?: 'featured' | 'standard' | 'editorial';
  className?: string;
}

export const DestinationCard: React.FC<DestinationCardProps> = ({
  destination,
  variant = 'standard',
  className = '',
}) => {
  const isFeatured = variant === 'featured';

  return (
    <article
      className={`group relative bg-soft-ivory border border-espresso/20 flex flex-col justify-between overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-espresso/40 ${
        isFeatured ? 'md:col-span-2 md:grid md:grid-cols-12 md:gap-0' : ''
      } ${className}`}
    >
      {/* Destination Image Area */}
      <div
        className={`relative overflow-hidden bg-espresso/10 ${
          isFeatured ? 'md:col-span-7 h-72 sm:h-96 md:h-full' : 'h-64 sm:h-72 w-full'
        }`}
      >
        <img
          src={destination.hero_image}
          alt={`Scenic landscape of ${destination.name}, ${destination.country}`}
          loading="lazy"
          className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
        />
        {/* Subtle Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-deep-slate/60 via-transparent to-black/15 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
          <span className="font-mono text-[9px] uppercase tracking-widest bg-soft-ivory/95 text-deep-slate px-2.5 py-1 border border-espresso/20 shadow-xs backdrop-blur-xs font-semibold">
            {destination.region} · {destination.country}
          </span>
          {destination.duration_days && (
            <span className="font-mono text-[9px] uppercase tracking-wider bg-deep-slate/85 text-soft-ivory px-2 py-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-antique-brass" />
              {destination.duration_days} Days
            </span>
          )}
        </div>

        {/* Bottom Image Overlay Tag */}
        <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
          <div className="flex flex-wrap gap-1.5">
            {destination.styles?.slice(0, 3).map((style) => (
              <span
                key={style}
                className="font-mono text-[8px] sm:text-[9px] uppercase tracking-wider bg-parchment/90 text-espresso px-2 py-0.5 border border-espresso/20 font-medium"
              >
                {style}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Destination Information Content */}
      <div
        className={`p-6 flex flex-col justify-between ${
          isFeatured ? 'md:col-span-5 md:p-8' : ''
        }`}
      >
        <div className="space-y-3">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <h3 className="font-display text-2xl text-deep-slate font-medium tracking-tight group-hover:text-terracotta transition-colors">
              {destination.name}
            </h3>
            {destination.starting_price && (
              <div className="text-right">
                <span className="font-mono text-[9px] text-stone-gray uppercase block leading-none">
                  FROM
                </span>
                <span className="font-mono text-sm font-bold text-terracotta">
                  ₹{destination.starting_price.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <p className="text-stone-gray text-xs leading-relaxed line-clamp-3 font-body">
            {destination.description}
          </p>

          {/* Curated Highlights List */}
          {destination.curated_highlights && destination.curated_highlights.length > 0 && (
            <div className="pt-2 border-t border-espresso/10 space-y-1.5">
              <span className="font-mono text-[9px] uppercase tracking-wider text-stone-gray block">
                HIGHLIGHTS
              </span>
              <ul className="space-y-1 text-[11px] text-espresso/90 font-body">
                {destination.curated_highlights.slice(0, isFeatured ? 3 : 2).map((item, idx) => (
                  <li key={idx} className="flex items-center gap-1.5 truncate">
                    <Sparkles className="w-3 h-3 text-antique-brass shrink-0" />
                    <span className="truncate">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Action Link */}
        <div className="pt-5 mt-4 border-t border-espresso/15 flex items-center justify-between">
          <span className="font-mono text-[10px] text-stone-gray">
            Best: {destination.best_season || 'Year-round'}
          </span>
          <Link
            to={`/destinations/${destination.slug}`}
            className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-terracotta hover:text-terracotta-hover font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
            aria-label={`Explore detailed itinerary and options for ${destination.name}`}
          >
            <span>Explore {destination.name}</span>
            <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </div>
    </article>
  );
};
