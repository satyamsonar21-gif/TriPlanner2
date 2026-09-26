import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Compass, ArrowLeft } from 'lucide-react';
import { DestinationCard } from '@/components/public/DestinationCard';
import { DestinationService } from '@/domains/destinations/destination.service';
import type { Destination } from '@/types/database.types';
import { Link } from 'react-router-dom';

export const DestinationsPage: React.FC = () => {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<string>('all');
  const [maxBudget, setMaxBudget] = useState<number>(60000);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    DestinationService.getAll().then((data) => {
      setDestinations(data);
      setLoading(false);
    });
  }, []);

  const stylesList = ['all', 'Adventure', 'Culture', 'Relaxed', 'Nature', 'Food', 'Luxury', 'Heritage'];

  const filteredDestinations = destinations.filter((dest) => {
    const matchesQuery =
      searchQuery === '' ||
      dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dest.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dest.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dest.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStyle =
      selectedStyle === 'all' ||
      dest.styles?.some((s) => s.toLowerCase() === selectedStyle.toLowerCase());

    const matchesBudget = !dest.starting_price || dest.starting_price <= maxBudget;

    return matchesQuery && matchesStyle && matchesBudget;
  });

  return (
    <div className="bg-background text-foreground font-body min-h-screen pb-24">
      {/* Top Editorial Banner */}
      <section className="bg-parchment/50 border-b border-espresso/15 py-14 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 font-mono text-xs text-stone-gray hover:text-terracotta uppercase tracking-wider mb-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Overview</span>
          </Link>

          <span className="font-mono text-xs uppercase tracking-widest text-terracotta block">
            DESTINATION DISCOVERY CATALOG
          </span>
          <h1 className="font-display text-4xl sm:text-5xl text-deep-slate font-normal tracking-tight">
            Curated Global Destinations
          </h1>
          <p className="text-stone-gray text-sm sm:text-base max-w-2xl leading-relaxed">
            Every destination is architected with verified routes, local operator networks, and living adaptation parameters. Select a region to begin personalizing your journey.
          </p>
        </div>
      </section>

      {/* Main Filter & Content Container */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-10 space-y-8">
        {/* Interactive Filter Toolbar */}
        <div className="bg-soft-ivory border border-espresso/20 p-5 shadow-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Search Input */}
            <div className="md:col-span-6 relative">
              <label htmlFor="destination-search" className="sr-only">
                Search destinations
              </label>
              <Search className="w-4 h-4 text-stone-gray absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="destination-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by destination name, country, or keyword..."
                className="w-full pl-10 pr-4 py-2.5 bg-parchment/60 border border-espresso/20 text-xs text-espresso placeholder:text-stone-gray/70 focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta"
              />
            </div>

            {/* Budget Range Filter */}
            <div className="md:col-span-6 flex items-center justify-between sm:justify-end gap-4">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-stone-gray uppercase tracking-wider">
                  Max Budget:
                </span>
                <span className="font-mono text-xs font-bold text-terracotta">
                  ₹{maxBudget.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min="18000"
                max="60000"
                step="2000"
                value={maxBudget}
                onChange={(e) => setMaxBudget(Number(e.target.value))}
                className="accent-terracotta cursor-pointer w-32 sm:w-44"
                aria-label="Filter by maximum budget"
              />
            </div>
          </div>

          {/* Style Pills Strip */}
          <div className="pt-3 border-t border-espresso/10 flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-stone-gray mr-2 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3 text-terracotta" />
              Style:
            </span>
            {stylesList.map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => setSelectedStyle(style)}
                className={`font-mono text-[10px] uppercase tracking-wider px-3 py-1 border transition-all ${
                  selectedStyle.toLowerCase() === style.toLowerCase()
                    ? 'bg-terracotta text-soft-ivory border-terracotta font-semibold'
                    : 'bg-parchment/60 text-espresso border-espresso/20 hover:border-espresso/40'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs font-mono text-stone-gray">
          <span>
            SHOWING {filteredDestinations.length} OF {destinations.length} CURATED DESTINATIONS
          </span>
          {(searchQuery || selectedStyle !== 'all' || maxBudget < 60000) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedStyle('all');
                setMaxBudget(60000);
              }}
              className="text-terracotta hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Destination Cards Grid */}
        {loading ? (
          <div className="py-20 text-center font-mono text-xs text-stone-gray">
            Loading curated destination itineraries...
          </div>
        ) : filteredDestinations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredDestinations.map((dest, idx) => (
              <DestinationCard
                key={dest.id}
                destination={dest}
                variant={idx === 0 && !searchQuery && selectedStyle === 'all' ? 'featured' : 'standard'}
              />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-soft-ivory border border-espresso/20 space-y-3">
            <Compass className="w-8 h-8 text-stone-gray mx-auto" />
            <h3 className="font-display text-xl text-deep-slate font-medium">
              No destinations match your criteria
            </h3>
            <p className="text-stone-gray text-xs max-w-sm mx-auto">
              Try adjusting your search terms, expanding your budget threshold, or clearing the travel style filter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
