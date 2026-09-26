import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  Sparkles,
  FolderHeart,
  Star,
} from 'lucide-react';
import {
  MOCK_SAVED_DESTINATIONS,
} from '@/domains/traveler/traveler.data';

export const SavedPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'destinations' | 'itineraries' | 'stays' | 'experiences'>('all');
  const [savedItems, setSavedItems] = useState(MOCK_SAVED_DESTINATIONS);

  const toggleHeart = (id: string) => {
    setSavedItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-8 font-body pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#33231E]/10">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#1C1410] tracking-tight">
            Saved
          </h1>
          <p className="text-xs sm:text-sm text-[#8A7B75] mt-1 font-body">
            All the places, trips and experiences you&apos;ve saved for later.
          </p>
        </div>

        <Link to="/explore-destinations">
          <button className="px-4 py-2 rounded-lg bg-terracotta hover:bg-terracotta-hover text-white text-xs font-medium transition-colors shadow-2xs">
            + Discover More Places
          </button>
        </Link>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Main Saved Inspiration Boards (~68%) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#33231E]/10">
            {[
              { id: 'all', label: 'All Saved (24)' },
              { id: 'destinations', label: 'Destinations (6)' },
              { id: 'itineraries', label: 'Itineraries (4)' },
              { id: 'stays', label: 'Stays (8)' },
              { id: 'experiences', label: 'Experiences (6)' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as any)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  activeTab === t.id
                    ? 'bg-[#EEDFD5] text-terracotta font-semibold'
                    : 'text-[#8A7B75] hover:text-[#1C1410] hover:bg-[#33231E]/5'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Section 1: Saved Destinations */}
          {(activeTab === 'all' || activeTab === 'destinations') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-display text-lg font-semibold text-[#1C1410]">
                  Saved Destinations
                </span>
                <span className="text-xs text-[#8A7B75]">{savedItems.length} destinations</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {savedItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#FFF9F3] border border-[#33231E]/15 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
                  >
                    <div className="relative h-44 overflow-hidden bg-espresso/20">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-deep-slate/70 via-transparent to-transparent" />

                      <button
                        type="button"
                        onClick={() => toggleHeart(item.id)}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center text-rose-400 hover:text-white transition-colors"
                        title="Remove from saved"
                      >
                        <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                      </button>

                      <div className="absolute bottom-3 left-3 text-soft-ivory">
                        <span className="text-[10px] font-mono uppercase tracking-wider block opacity-90">
                          {item.category}
                        </span>
                        <h4 className="font-display text-xl font-semibold">
                          {item.name}
                        </h4>
                      </div>
                    </div>

                    <div className="p-4 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] font-mono text-[#8A7B75] uppercase block">
                          EST. BUDGET
                        </span>
                        <span className="font-mono text-terracotta font-bold">
                          {item.estimatedBudget}
                        </span>
                        <span className="text-[#8A7B75] text-[10px] ml-1">({item.duration})</span>
                      </div>

                      <Link to={`/explore-destinations`}>
                        <button className="px-3 py-1.5 rounded-lg bg-transparent border border-[#33231E]/20 text-[#33231E] hover:bg-terracotta hover:text-white hover:border-terracotta text-xs font-medium transition-colors">
                          Explore
                        </button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Saved Itineraries */}
          {(activeTab === 'all' || activeTab === 'itineraries') && (
            <div className="space-y-4 pt-4 border-t border-[#33231E]/10">
              <span className="font-display text-lg font-semibold text-[#1C1410] block">
                Saved Itinerary Blueprints
              </span>

              <div className="space-y-3">
                {[
                  {
                    title: 'Classic Rajasthan Fortress & Lake Circuit',
                    duration: '7 Days • 4 Stops',
                    budget: '₹58,000',
                    styles: 'Culture • Heritage • Royalty',
                    image: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&q=80&w=400',
                  },
                  {
                    title: 'Bosphorus Twilight & Grand Bazaar Odyssey',
                    duration: '5 Days • 3 Stops',
                    budget: '₹62,000',
                    styles: 'Historic • Gastronomy • Architecture',
                    image: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&q=80&w=400',
                  },
                ].map((itin, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#33231E]/15 flex items-center justify-between gap-4 shadow-xs"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={itin.image}
                        alt={itin.title}
                        className="w-16 h-14 rounded-xl object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <h5 className="font-display text-sm font-semibold text-[#1C1410] truncate">
                          {itin.title}
                        </h5>
                        <p className="text-xs text-[#8A7B75] mt-0.5">{itin.duration} • {itin.styles}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-xs font-bold text-terracotta hidden sm:inline">
                        {itin.budget}
                      </span>
                      <Link to="/plan">
                        <button className="px-3 py-1.5 rounded-lg bg-terracotta hover:bg-terracotta-hover text-white text-xs font-medium">
                          Build Trip
                        </button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Saved Stays & Experiences */}
          {(activeTab === 'all' || activeTab === 'stays') && (
            <div className="space-y-4 pt-4 border-t border-[#33231E]/10">
              <span className="font-display text-lg font-semibold text-[#1C1410] block">
                Saved Boutique Stays & Resorts
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    name: 'The Postcard Hideaway, Netravali',
                    location: 'South Goa Hinterland',
                    price: '₹14,500 / night',
                    rating: 4.9,
                    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=400',
                  },
                  {
                    name: 'Villa Rosa Cliffside Haven',
                    location: 'Amalfi Coast, Italy',
                    price: '₹28,000 / night',
                    rating: 4.8,
                    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=400',
                  },
                ].map((stay, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-[#FFF9F3] border border-[#33231E]/15 flex gap-3 shadow-2xs"
                  >
                    <img
                      src={stay.image}
                      alt={stay.name}
                      className="w-20 h-20 rounded-xl object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#8A7B75] truncate">{stay.location}</span>
                        <span className="flex items-center gap-0.5 text-xs text-amber-700 font-bold">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          {stay.rating}
                        </span>
                      </div>
                      <h5 className="font-display text-sm font-semibold text-[#1C1410] truncate">
                        {stay.name}
                      </h5>
                      <span className="font-mono text-xs font-bold text-terracotta block">
                        {stay.price}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Saved Summary & Collections (~32%) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Summary Card */}
          <div className="bg-[#FFF9F3] border border-[#33231E]/15 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="font-display text-base font-semibold text-[#1C1410] border-b border-[#33231E]/10 pb-3">
              Your Saved Summary
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#33231E]/5">
                <span className="text-[#8A7B75]">Total Saved Items:</span>
                <span className="font-mono font-bold text-[#1C1410]">24</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#33231E]/5">
                <span className="text-[#8A7B75]">Destinations:</span>
                <span className="font-mono text-[#33231E]">6</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#33231E]/5">
                <span className="text-[#8A7B75]">Itineraries:</span>
                <span className="font-mono text-[#33231E]">4</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#33231E]/5">
                <span className="text-[#8A7B75]">Stays & Resorts:</span>
                <span className="font-mono text-[#33231E]">8</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#8A7B75]">Experiences:</span>
                <span className="font-mono text-[#33231E]">6</span>
              </div>
            </div>
          </div>

          {/* Collections & Lists */}
          <div className="bg-[#FFF9F3] border border-[#33231E]/15 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="font-display text-base font-semibold text-[#1C1410] border-b border-[#33231E]/10 pb-3">
              Personal Collections
            </h3>
            <div className="space-y-2">
              {[
                { name: 'Summer Vacation Ideas', count: '8 items', tag: 'Upcoming 2025' },
                { name: 'Europe 2026 Grand Tour', count: '10 items', tag: 'Dream List' },
                { name: 'Adventure & Diving Wishlist', count: '6 items', tag: 'Active' },
              ].map((col, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-[#F8F3ED] hover:bg-[#EFE5DB] transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <FolderHeart className="w-4 h-4 text-terracotta" />
                    <div>
                      <h5 className="text-xs font-semibold text-[#1C1410]">{col.name}</h5>
                      <span className="text-[10px] text-[#8A7B75]">{col.count}</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono text-[#8A7B75] bg-white px-2 py-0.5 rounded border border-[#33231E]/10">
                    {col.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Get Inspired Personalization Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#F4E8DC] to-[#E9DC CE] border border-[#33231E]/15 text-xs space-y-2 shadow-2xs">
            <div className="flex items-center gap-2 text-terracotta font-semibold">
              <Sparkles className="w-4 h-4" />
              <span>Get Inspired by Your Saves</span>
            </div>
            <p className="text-[#8A7B75] leading-relaxed text-[11px]">
              Because you saved Bali and Santorini, the engine predicts high compatibility with the Amalfi Coast and southern Sri Lanka.
            </p>
            <Link to="/explore-destinations" className="inline-block text-terracotta font-semibold hover:underline text-[11px]">
              View Personalized Matches →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
