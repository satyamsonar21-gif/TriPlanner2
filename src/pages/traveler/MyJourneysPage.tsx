import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Users,
  Compass,
  Plus,
  SlidersHorizontal,
  Search,
} from 'lucide-react';
import { MOCK_JOURNEYS } from '@/domains/journeys/journey.service';

export const MyJourneysPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'planning' | 'in_progress' | 'completed' | 'cancelled'>('all');
  const [styleFilter, setStyleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const featuredJourney = MOCK_JOURNEYS[0];

  const filteredJourneys = MOCK_JOURNEYS.filter((j) => {
    const jStatus = (j.status as string) || '';
    if (activeTab === 'upcoming' && jStatus !== 'upcoming' && jStatus !== 'booked' && jStatus !== 'active') return false;
    if (activeTab === 'planning' && jStatus !== 'planning' && jStatus !== 'draft') return false;
    if (activeTab === 'in_progress' && jStatus !== 'active' && jStatus !== 'in_progress') return false;
    if (activeTab === 'completed' && jStatus !== 'completed') return false;
    if (activeTab === 'cancelled' && jStatus !== 'cancelled') return false;

    if (styleFilter !== 'all' && !j.travel_styles?.includes(styleFilter)) return false;
    if (searchQuery && !j.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;

    return true;
  });

  return (
    <div className="space-y-8 font-body pb-12">
      {/* ============================================================ */}
      {/* 1. PAGE HEADER & ACTIONS                                     */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#33231E]/10">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#1C1410] tracking-tight">
            My Journeys
          </h1>
          <p className="text-xs sm:text-sm text-[#8A7B75] mt-1 font-body">
            Plan, manage and experience every journey in one place.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/explore-destinations">
            <button className="px-4 py-2 rounded-lg bg-transparent border border-[#33231E]/20 hover:bg-[#33231E]/5 text-[#33231E] text-xs font-medium transition-colors">
              Explore Destinations
            </button>
          </Link>
          <Link to="/plan">
            <button className="px-4 py-2 rounded-lg bg-terracotta hover:bg-terracotta-hover text-white text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors">
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Journey</span>
            </button>
          </Link>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. FEATURED UPCOMING JOURNEY CARD                            */}
      {/* ============================================================ */}
      {featuredJourney && (
        <div className="space-y-2">
          <span className="text-xs font-semibold text-[#1C1410] tracking-wide block">
            Active Master Itinerary
          </span>

          <div className="bg-[#FFF9F3] border border-[#33231E]/15 rounded-2xl shadow-xs overflow-hidden grid grid-cols-1 lg:grid-cols-12">
            {/* Visual Column */}
            <div className="lg:col-span-5 relative h-64 lg:h-auto overflow-hidden bg-espresso/20">
              <img
                src={featuredJourney.hero_image}
                alt={featuredJourney.title}
                className="w-full h-full object-cover object-center filter contrast-[1.05]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-deep-slate/85 via-transparent to-black/20" />

              <div className="absolute inset-0 p-6 flex flex-col justify-between text-soft-ivory">
                <span className="self-start px-2.5 py-0.5 rounded-full bg-emerald-800/80 backdrop-blur-xs text-[10px] font-mono uppercase tracking-wider font-semibold">
                  STATUS: ONGOING & SYNCHRONIZED
                </span>

                <div>
                  <h3 className="font-display text-3xl font-semibold text-soft-ivory">
                    {featuredJourney.title}
                  </h3>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {featuredJourney.travel_styles?.map((st) => (
                      <span
                        key={st}
                        className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs"
                      >
                        {st}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Details Column */}
            <div className="lg:col-span-7 p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-[#8A7B75] uppercase block font-mono">DATES</span>
                    <span className="font-medium text-[#1C1410] mt-0.5 block">
                      {featuredJourney.start_date} – {featuredJourney.end_date}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8A7B75] uppercase block font-mono">DURATION</span>
                    <span className="font-medium text-[#1C1410] mt-0.5 block">
                      {featuredJourney.duration_days} Days • {featuredJourney.duration_nights} Nights
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8A7B75] uppercase block font-mono">TRAVELERS</span>
                    <span className="font-medium text-[#1C1410] mt-0.5 block">
                      {featuredJourney.travelers_count} Adults
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8A7B75] uppercase block font-mono">TOTAL BUDGET</span>
                    <span className="font-bold text-terracotta mt-0.5 block font-mono">
                      ₹{featuredJourney.total_budget.toLocaleString()} INR
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8A7B75] uppercase block font-mono">BOOKINGS</span>
                    <span className="font-medium text-[#1C1410] mt-0.5 block">
                      {featuredJourney.bookings_count} Confirmed Vouchers
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8A7B75] uppercase block font-mono">LAST UPDATED</span>
                    <span className="font-medium text-[#8A7B75] mt-0.5 block">
                      {featuredJourney.last_updated}
                    </span>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-1.5 pt-2 border-t border-[#33231E]/10">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#1C1410] font-medium">Journey Execution Progress</span>
                    <span className="font-mono text-terracotta font-semibold">
                      {featuredJourney.progress_percentage}% Completed
                    </span>
                  </div>
                  <div className="w-full bg-[#EBDDD0] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-terracotta h-full rounded-full transition-all duration-500"
                      style={{ width: `${featuredJourney.progress_percentage}%` }}
                    />
                  </div>
                </div>

                {/* Next Activity Indicator */}
                <div className="p-3 rounded-lg bg-[#F7EFE6] border border-[#33231E]/10 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-terracotta font-bold block">
                      NEXT CRITICAL STOP
                    </span>
                    <span className="font-medium text-[#1C1410]">{featuredJourney.next_activity}</span>
                  </div>
                  <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-[#33231E]/10">
                    Day 1
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-3 border-t border-[#33231E]/10">
                <Link to="/journeys/jrn_goa_01" className="flex-1">
                  <button className="w-full py-2.5 px-4 rounded-lg bg-terracotta hover:bg-terracotta-hover text-white text-xs font-medium transition-colors shadow-2xs">
                    View Journey Blueprint
                  </button>
                </Link>
                <Link to="/bookings" className="flex-1">
                  <button className="w-full py-2.5 px-4 rounded-lg border border-[#33231E]/20 hover:bg-[#33231E]/5 text-[#33231E] text-xs font-medium transition-colors">
                    Manage Bookings ({featuredJourney.bookings_count})
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. TABS & FILTER BAR                                         */}
      {/* ============================================================ */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#33231E]/10 pb-3">
          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Journeys' },
              { id: 'upcoming', label: 'Upcoming' },
              { id: 'planning', label: 'Planning' },
              { id: 'in_progress', label: 'In Progress' },
              { id: 'completed', label: 'Completed' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#EEDFD5] text-terracotta font-semibold'
                    : 'text-[#8A7B75] hover:text-[#1C1410] hover:bg-[#33231E]/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filter Bar Controls */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* Quick Search */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter journeys..."
                className="pl-7 pr-2.5 py-1 text-xs rounded-md bg-[#FFF9F3] border border-[#33231E]/15 text-[#1C1410] placeholder:text-[#8A7B75] focus:outline-none focus:border-terracotta transition-colors"
              />
              <Search className="w-3.5 h-3.5 text-[#8A7B75] absolute left-2 top-1.5" />
            </div>

            {/* Quick Style Filter Pills */}
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#8A7B75] mr-0.5" />
              {['all', 'Adventure', 'Culture', 'Nature', 'Luxury'].map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setStyleFilter(style)}
                  className={`text-[10px] font-mono px-2 py-1 rounded-md border transition-all ${
                    styleFilter === style
                      ? 'bg-terracotta text-white border-terracotta'
                      : 'bg-[#FFF9F3] text-[#33231E] border-[#33231E]/15 hover:border-[#33231E]/30'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 4. JOURNEY CARDS GRID                                        */}
        {/* ============================================================ */}
        {filteredJourneys.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJourneys.map((journey) => (
              <div
                key={journey.id}
                className="bg-[#FFF9F3] border border-[#33231E]/15 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between group hover:shadow-md hover:border-[#33231E]/30 transition-all duration-200"
              >
                {/* Image Header */}
                <div className="relative h-44 overflow-hidden bg-espresso/20">
                  <img
                    src={journey.hero_image}
                    alt={journey.title}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-deep-slate/75 via-transparent to-transparent" />

                  <div className="absolute top-3 right-3">
                    <span
                      className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-full font-bold shadow-2xs ${
                        journey.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : journey.status === 'booked' || (journey.status as string) === 'upcoming'
                          ? 'bg-[#F3E7DC] text-[#7A3622]'
                          : 'bg-[#EAE2D8] text-[#554742]'
                      }`}
                    >
                      {journey.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 text-soft-ivory">
                    <h4 className="font-display text-lg font-semibold leading-tight">
                      {journey.title}
                    </h4>
                    <span className="text-[10px] text-soft-ivory/80 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-antique-brass" />
                      {journey.start_date} – {journey.end_date}
                    </span>
                  </div>
                </div>

                {/* Details Body */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#8A7B75] flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {journey.travelers_count} Travelers
                      </span>
                      <span className="font-mono text-terracotta font-bold">
                        ₹{journey.total_budget.toLocaleString()} INR
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {journey.travel_styles?.map((s) => (
                        <span
                          key={s}
                          className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#F4E8DC] text-[#554742]"
                        >
                          {s}
                        </span>
                      ))}
                    </div>

                    {/* Progress Bar */}
                    <div className="pt-2">
                      <div className="flex justify-between items-center text-[10px] mb-1 font-mono text-[#8A7B75]">
                        <span>PROGRESS</span>
                        <span>{journey.progress_percentage}%</span>
                      </div>
                      <div className="w-full bg-[#EBDDD0] h-1 rounded-full overflow-hidden">
                        <div
                          className="bg-terracotta h-full rounded-full"
                          style={{ width: `${journey.progress_percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-[#33231E]/10 flex items-center gap-2">
                    <Link to={`/journeys/${journey.id}`} className="flex-1">
                      <button className="w-full py-1.5 px-3 rounded-lg bg-terracotta hover:bg-terracotta-hover text-white text-xs font-medium transition-colors">
                        View Journey
                      </button>
                    </Link>
                    <Link to="/bookings">
                      <button className="py-1.5 px-3 rounded-lg border border-[#33231E]/20 text-xs font-medium text-[#33231E] hover:bg-[#33231E]/5 transition-colors">
                        Manage
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="p-12 text-center bg-[#FFF9F3] border border-[#33231E]/15 rounded-2xl space-y-3">
            <Compass className="w-10 h-10 text-stone-gray mx-auto" />
            <h3 className="font-display text-xl text-[#1C1410] font-semibold">No journeys yet</h3>
            <p className="text-xs text-[#8A7B75] max-w-sm mx-auto">
              Your next great journey starts here. Build an itinerary tailored around your pace and preferences.
            </p>
            <Link to="/plan" className="inline-block pt-2">
              <button className="px-5 py-2 rounded-lg bg-terracotta text-white text-xs font-medium">
                Create New Journey
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
