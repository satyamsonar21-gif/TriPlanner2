import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/core/auth/AuthContext';
import {
  Search,
  SlidersHorizontal,
  Sparkles,
  Heart,
} from 'lucide-react';
import { DestinationService } from '@/domains/destinations/destination.service';
import type { Destination } from '@/types/database.types';

export const TravelerExplorePage: React.FC = () => {
  const { user } = useAuth();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<string>('all');
  const [savedDestinationIds, setSavedDestinationIds] = useState<string[]>(['dest_goa_01']);

  useEffect(() => {
    DestinationService.getAll().then((data) => setDestinations(data));
  }, []);

  const toggleSave = (id: string) => {
    if (savedDestinationIds.includes(id)) {
      setSavedDestinationIds(savedDestinationIds.filter((item) => item !== id));
    } else {
      setSavedDestinationIds([...savedDestinationIds, id]);
    }
  };

  const filteredDestinations = destinations.filter((dest) => {
    const matchesQuery =
      searchQuery === '' ||
      dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dest.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dest.region.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStyle =
      selectedStyle === 'all' ||
      dest.styles?.some((s) => s.toLowerCase() === selectedStyle.toLowerCase());

    return matchesQuery && matchesStyle;
  });

  return (
    <div className="space-y-8 font-body pb-12">
      {/* Header */}
      <div className="pb-4 border-b border-[#33231E]/10">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#1C1410] tracking-tight">
          Explore Destinations
        </h1>
        <p className="text-xs sm:text-sm text-[#8A7B75] mt-1 font-body">
          Find places and experiences that fit the way you travel.
        </p>
      </div>

      {/* Hero Discovery Search Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-espresso shadow-sm text-soft-ivory p-6 sm:p-10 flex flex-col justify-between min-h-[220px]">
        <img
          src="https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&q=80&w=1200"
          alt="Explore Discovery"
          className="absolute inset-0 w-full h-full object-cover opacity-35 filter brightness-90"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-deep-slate/85 via-deep-slate/60 to-transparent" />

        <div className="relative z-10 max-w-xl space-y-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-antique-brass block font-bold">
            INTELLIGENT DESTINATION DISCOVERY
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-soft-ivory">
            Where do you want to go next?
          </h2>
          <p className="text-xs sm:text-sm text-soft-ivory/80 leading-relaxed">
            Every route is checked against real-time operational capacity, weather models, and personal pacing.
          </p>
        </div>

        {/* Floating Search Pill */}
        <div className="relative z-10 mt-6 max-w-lg bg-[#FFF9F3] rounded-full p-1.5 shadow-md flex items-center border border-[#33231E]/20">
          <Search className="w-4 h-4 text-[#8A7B75] ml-3 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by city, beach, mountains, or region..."
            className="flex-1 bg-transparent px-3 py-1.5 text-xs text-[#1C1410] placeholder:text-[#8A7B75]/70 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-[#8A7B75] hover:text-[#1C1410] px-2 font-mono"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Personalized Recommendation Module */}
      <div className="p-5 rounded-2xl bg-[#FFF9F3] border border-terracotta/25 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-terracotta" />
            <h3 className="font-display text-base font-semibold text-[#1C1410]">
              Because you love Adventure + Food
            </h3>
            <span className="text-[10px] font-mono bg-terracotta/10 text-terracotta px-2 py-0.5 rounded font-semibold hidden sm:inline uppercase">
              {user?.display_name || user?.full_name ? `${user.display_name || user.full_name}'S PROFILE MATCH` : 'YOUR PROFILE MATCH'}
            </span>
          </div>
          <Link to="/preferences" className="text-xs font-mono text-terracotta hover:underline flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Ask AI Travel Agent</span>
          </Link>
        </div>

        <p className="text-xs text-[#8A7B75] max-w-2xl leading-relaxed">
          The Living Journey Engine matched these coastal and mountain regions based on high-frequency outdoor activities, local tasting menus, and a balanced 2–3 stop daily pace.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {destinations.slice(0, 3).map((dest) => (
            <div
              key={dest.id}
              className="p-3 bg-[#F8F3ED] rounded-xl border border-[#33231E]/10 flex items-center gap-3 hover:border-terracotta/30 transition-colors"
            >
              <img
                src={dest.hero_image}
                alt={dest.name}
                className="w-14 h-14 rounded-lg object-cover shrink-0"
              />
              <div className="min-w-0">
                <span className="text-[9px] font-mono text-terracotta font-bold uppercase block">
                  96% PROFILE MATCH
                </span>
                <h5 className="font-display text-sm font-semibold text-[#1C1410] truncate">
                  {dest.name}
                </h5>
                <span className="text-[10px] text-[#8A7B75] block truncate">
                  From ₹{dest.starting_price?.toLocaleString()} • {dest.duration_days} Days
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Style Filter Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#33231E]/10">
        <span className="text-xs text-[#8A7B75] font-medium mr-1 flex items-center gap-1 shrink-0">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filter:
        </span>
        {['all', 'Adventure', 'Food', 'Culture', 'Relaxed', 'Nature', 'Heritage'].map((style) => (
          <button
            key={style}
            type="button"
            onClick={() => setSelectedStyle(style)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selectedStyle.toLowerCase() === style.toLowerCase()
                ? 'bg-[#EEDFD5] text-terracotta font-semibold'
                : 'text-[#8A7B75] hover:text-[#1C1410] hover:bg-[#33231E]/5'
            }`}
          >
            {style}
          </button>
        ))}
      </div>

      {/* Main Destination Catalog Grid */}
      <div className="space-y-4">
        <div className="flex justify-between items-center text-xs text-[#8A7B75]">
          <span>Showing {filteredDestinations.length} Curated Destinations</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDestinations.map((dest) => {
            const isSaved = savedDestinationIds.includes(dest.id);
            return (
              <div
                key={dest.id}
                className="bg-[#FFF9F3] border border-[#33231E]/15 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between group hover:shadow-md hover:border-[#33231E]/30 transition-all"
              >
                <div className="relative h-48 overflow-hidden bg-espresso/20">
                  <img
                    src={dest.hero_image}
                    alt={dest.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-deep-slate/75 via-transparent to-transparent" />

                  <button
                    type="button"
                    onClick={() => toggleSave(dest.id)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center transition-colors"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        isSaved ? 'fill-rose-500 text-rose-500' : 'text-white'
                      }`}
                    />
                  </button>

                  <div className="absolute bottom-3 left-3 right-3 text-soft-ivory">
                    <span className="text-[10px] font-mono uppercase tracking-wider block opacity-90">
                      {dest.region} • {dest.country}
                    </span>
                    <h4 className="font-display text-2xl font-semibold">
                      {dest.name}
                    </h4>
                  </div>
                </div>

                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <p className="text-xs text-[#8A7B75] leading-relaxed line-clamp-2">
                      {dest.description}
                    </p>

                    <div className="flex flex-wrap gap-1">
                      {dest.styles?.map((s) => (
                        <span
                          key={s}
                          className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#F4E8DC] text-[#554742]"
                        >
                          {s}
                        </span>
                      ))}
                    </div>

                    <div className="pt-2 flex justify-between items-baseline text-xs">
                      <span className="text-[#8A7B75]">From ₹{dest.starting_price?.toLocaleString()}</span>
                      <span className="font-mono text-[#8A7B75]">{dest.duration_days || 5} Days Suggested</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#33231E]/10 flex gap-2">
                    <Link to={`/destinations/${dest.slug}`} className="flex-1">
                      <button className="w-full py-2 px-3 rounded-lg bg-terracotta hover:bg-terracotta-hover text-white text-xs font-medium transition-colors">
                        Explore {dest.name}
                      </button>
                    </Link>
                    <Link to={`/plan?destination=${dest.slug}`}>
                      <button className="py-2 px-3 rounded-lg border border-[#33231E]/20 text-[#33231E] hover:bg-[#33231E]/5 text-xs font-medium transition-colors">
                        Plan
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
