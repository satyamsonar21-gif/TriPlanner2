import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth/AuthContext';
import {
  Briefcase,
  Ticket,
  Heart,
  Wallet,
  Calendar,
  Pencil,
  CheckCircle2,
  Lock,
  Compass,
  AlertTriangle,
  ArrowRight,
  MoreVertical,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { MOCK_TRAVELER_METRICS } from '@/domains/traveler/traveler.data';
import { DestinationWeatherWidget } from '@/components/traveler/DestinationWeatherWidget';
import { DestinationMap } from '@/components/traveler/DestinationMap';
import {
  ensureGoaDemoChangeRequest,
  sharedLivingJourneyEngine,
  type EngineChangeRequest,
  type JourneySnapshot,
} from '@/domains/journey-engine';
import { ChangeReviewPanel } from '@/components/journey-engine';
import { TravelerAiCompanionPanel } from '@/components/ai';
import { TravelerWeatherAlertBanner } from '@/components/external-events/TravelerWeatherAlertBanner';

export const TravelerDashboardPage: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [activeAlertModal, setActiveAlertModal] = useState(false);
  const [changeRequest, setChangeRequest] = useState<EngineChangeRequest>(() =>
    ensureGoaDemoChangeRequest()
  );
  const [goaSnapshot, setGoaSnapshot] = useState<JourneySnapshot>(
    () => sharedLivingJourneyEngine.getSnapshot('jrn_goa_01')!
  );
  const alternativeApplied = changeRequest.state === 'APPLIED';

  return (
    <div className="space-y-7 font-body pb-12">
      {/* ============================================================ */}
      {/* 1. GREETING BANNER                                           */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#1C1410] tracking-tight">
            Good morning, {user?.display_name || user?.full_name || 'Traveler'} 👋
          </h1>
          <p className="text-xs sm:text-sm text-[#8A7B75] mt-1 font-body">
            Let&apos;s continue planning your next great journey.
          </p>
        </div>
        <Link
          to="/plan"
          className="sm:self-center text-xs font-mono font-medium text-terracotta hover:text-terracotta-hover hover:underline flex items-center gap-1"
        >
          <span>+ Quick Plan New Trip</span>
        </Link>
      </div>

      {/* ============================================================ */}
      {/* 2. TOP METRIC CARDS (5 HORIZONTAL CARDS)                     */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Metric 1: Upcoming Trips */}
        <Link
          to="/journeys"
          className="bg-[#FFF9F3] border border-[#33231E]/10 rounded-xl p-3.5 sm:p-4 shadow-2xs hover:shadow-xs hover:border-[#33231E]/20 transition-all flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-[#F4E8DC] text-terracotta flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-[#8A7B75] font-medium uppercase tracking-wider block truncate">
              Upcoming Trips
            </span>
            <span className="font-display text-xl font-bold text-[#1C1410] block leading-tight">
              {MOCK_TRAVELER_METRICS.upcomingTripsCount}
            </span>
            <span className="text-[9px] text-terracotta font-medium block truncate">
              {MOCK_TRAVELER_METRICS.nextTripNote}
            </span>
          </div>
        </Link>

        {/* Metric 2: Bookings */}
        <Link
          to="/bookings"
          className="bg-[#FFF9F3] border border-[#33231E]/10 rounded-xl p-3.5 sm:p-4 shadow-2xs hover:shadow-xs hover:border-[#33231E]/20 transition-all flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-[#F4E8DC] text-terracotta flex items-center justify-center shrink-0">
            <Ticket className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-[#8A7B75] font-medium uppercase tracking-wider block truncate">
              Bookings
            </span>
            <span className="font-display text-xl font-bold text-[#1C1410] block leading-tight">
              {MOCK_TRAVELER_METRICS.confirmedBookingsCount}
            </span>
            <span className="text-[9px] text-[#8A7B75] block truncate">
              Total Confirmed
            </span>
          </div>
        </Link>

        {/* Metric 3: Saved Places */}
        <Link
          to="/saved"
          className="bg-[#FFF9F3] border border-[#33231E]/10 rounded-xl p-3.5 sm:p-4 shadow-2xs hover:shadow-xs hover:border-[#33231E]/20 transition-all flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-[#F4E8DC] text-terracotta flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-[#8A7B75] font-medium uppercase tracking-wider block truncate">
              Saved Places
            </span>
            <span className="font-display text-xl font-bold text-[#1C1410] block leading-tight">
              {MOCK_TRAVELER_METRICS.savedPlacesCount}
            </span>
            <span className="text-[9px] text-[#8A7B75] block truncate">
              Destinations & Stays
            </span>
          </div>
        </Link>

        {/* Metric 4: Total Spent */}
        <Link
          to="/payments"
          className="bg-[#FFF9F3] border border-[#33231E]/10 rounded-xl p-3.5 sm:p-4 shadow-2xs hover:shadow-xs hover:border-[#33231E]/20 transition-all flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-[#F4E8DC] text-terracotta flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-[#8A7B75] font-medium uppercase tracking-wider block truncate">
              Total Spent
            </span>
            <span className="font-display text-xl font-bold text-[#1C1410] block leading-tight">
              {MOCK_TRAVELER_METRICS.totalSpent}
            </span>
            <span className="text-[9px] text-[#8A7B75] block truncate">
              All Time
            </span>
          </div>
        </Link>

        {/* Metric 5: Trip Days */}
        <div className="bg-[#FFF9F3] border border-[#33231E]/10 rounded-xl p-3.5 sm:p-4 shadow-2xs flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-[#F4E8DC] text-terracotta flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-[#8A7B75] font-medium uppercase tracking-wider block truncate">
              Trip Days
            </span>
            <span className="font-display text-xl font-bold text-[#1C1410] block leading-tight">
              {MOCK_TRAVELER_METRICS.tripDaysCount}
            </span>
            <span className="text-[9px] text-[#8A7B75] block truncate">
              Across {MOCK_TRAVELER_METRICS.countriesCount} Countries
            </span>
          </div>
        </div>
      </div>

      {/* PHASE 06: REAL-TIME WEATHER & EXTERNAL ALERT BANNER */}
      <TravelerWeatherAlertBanner
        journeyId="jrn_goa_01"
        onReviewAlternatives={() => setActiveAlertModal(true)}
      />

      {/* ============================================================ */}
      {/* 3. MAIN DASHBOARD CONTENT (2-COLUMN EDITORIAL GRID)           */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        {/* LEFT COLUMN (~60%) */}
        <div className="lg:col-span-7 space-y-7">
          {/* UPCOMING TRIP HERO CARD */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-[#1C1410] tracking-wide block">
              Upcoming Trip
            </span>

            <div className="bg-[#FFF9F3] border border-[#33231E]/15 rounded-2xl shadow-xs overflow-hidden grid grid-cols-1 sm:grid-cols-12">
              {/* Left Photo Visual */}
              <div className="sm:col-span-5 relative h-56 sm:h-auto overflow-hidden bg-espresso/20">
                <img
                  src="https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&q=80&w=800"
                  alt="Goa beach and palm trees"
                  className="w-full h-full object-cover object-center filter contrast-[1.05]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-deep-slate/75 via-transparent to-black/20" />

                {/* Overlaid Title & Tags */}
                <div className="absolute inset-0 p-5 flex flex-col justify-between text-soft-ivory">
                  <div className="text-center pt-2">
                    <h3 className="font-display text-3xl font-normal tracking-wide text-soft-ivory">
                      GOA
                    </h3>
                    <span className="text-[10px] tracking-widest uppercase font-mono block opacity-90">
                      5 DAYS • 4 NIGHTS
                    </span>
                    <span className="text-[10px] block opacity-80 mt-0.5">
                      Adventure • Beaches • Food
                    </span>
                  </div>

                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-black/40 backdrop-blur-xs border border-white/20 text-[9px] font-mono uppercase tracking-wider text-soft-ivory">
                      Upcoming
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Trip Details & JourneyThread */}
              <div className="sm:col-span-7 p-5 sm:p-6 flex flex-col justify-between space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-display text-xl text-[#1C1410] font-semibold">
                        Goa Getaway
                      </h4>
                      <button
                        type="button"
                        onClick={() => navigate('/preferences')}
                        className="text-[#8A7B75] hover:text-terracotta transition-colors"
                        title="Edit Trip Settings"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-[#8A7B75] mt-1.5 font-medium">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-stone-gray" />
                      12 May – 16 May 2026
                    </span>
                    <span>•</span>
                    <span>2 Travelers</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between items-center text-[11px] mb-1.5 font-medium">
                      <span className="text-[#1C1410]">Journey Progress</span>
                      <span className="font-mono text-terracotta">80% Completed</span>
                    </div>
                    <div className="w-full bg-[#EBDDD0] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-terracotta h-full rounded-full transition-all duration-500 w-[80%]" />
                    </div>
                  </div>

                  {/* Horizontal Journey Thread Sequence */}
                  <div className="mt-5 pt-4 border-t border-[#33231E]/10">
                    <div className="flex items-center justify-between text-center relative">
                      {/* Connecting Line */}
                      <div className="absolute top-3 left-4 right-4 h-0.5 bg-[#33231E]/15 -z-0" />

                      {/* Step 1: Discover */}
                      <div className="flex flex-col items-center relative z-10">
                        <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[10px] font-medium text-[#1C1410] mt-1">Discover</span>
                        <span className="text-[8px] text-[#8A7B75] font-mono">12 May</span>
                      </div>

                      {/* Step 2: Stay */}
                      <div className="flex flex-col items-center relative z-10">
                        <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[10px] font-medium text-[#1C1410] mt-1">Stay</span>
                        <span className="text-[8px] text-[#8A7B75] font-mono">12–16 May</span>
                      </div>

                      {/* Step 3: Experiences */}
                      <div className="flex flex-col items-center relative z-10">
                        <div className="w-6 h-6 rounded-full bg-terracotta text-white flex items-center justify-center shadow-2xs ring-2 ring-terracotta/20">
                          <Lock className="w-3 h-3" />
                        </div>
                        <span className="text-[10px] font-semibold text-terracotta mt-1">Experiences</span>
                        <span className="text-[8px] text-terracotta font-mono font-medium">3/5 Done</span>
                      </div>

                      {/* Step 4: Transfers */}
                      <div className="flex flex-col items-center relative z-10">
                        <div className="w-6 h-6 rounded-full bg-[#EFE5DB] border border-[#33231E]/20 text-[#8A7B75] flex items-center justify-center">
                          <Compass className="w-3 h-3" />
                        </div>
                        <span className="text-[10px] font-medium text-[#8A7B75] mt-1">Transfers</span>
                        <span className="text-[8px] text-[#8A7B75] font-mono">Planned</span>
                      </div>

                      {/* Step 5: Return */}
                      <div className="flex flex-col items-center relative z-10">
                        <div className="w-6 h-6 rounded-full bg-[#EFE5DB] border border-[#33231E]/20 text-[#8A7B75] flex items-center justify-center">
                          <Compass className="w-3 h-3" />
                        </div>
                        <span className="text-[10px] font-medium text-[#8A7B75] mt-1">Return</span>
                        <span className="text-[8px] text-[#8A7B75] font-mono">16 May</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center gap-3 pt-3">
                  <Link
                    to="/journeys/jrn_goa_01"
                    className="flex-1 text-center py-2 px-4 rounded-lg bg-terracotta hover:bg-terracotta-hover text-white text-xs font-medium transition-colors shadow-2xs"
                  >
                    View Journey
                  </Link>
                  <Link
                    to="/bookings"
                    className="flex-1 text-center py-2 px-4 rounded-lg bg-transparent border border-[#33231E]/20 hover:bg-[#33231E]/5 text-[#33231E] text-xs font-medium transition-colors"
                  >
                    Manage Trip
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* REAL-TIME WEATHER INTEGRATION COMPONENT */}
          <DestinationWeatherWidget initialDestinationId="dest_goa_01" />

          {/* MAPBOX INTERACTIVE DESTINATION MAP WITH ORS ROUTING */}
          <DestinationMap destinationId="dest_goa_01" originCity={profile?.origin_city || undefined} />

          {/* MY JOURNEYS LIST WIDGET */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-display text-lg text-[#1C1410] font-semibold">
                My Journeys
              </span>
              <Link to="/journeys" className="text-xs font-mono text-terracotta hover:underline font-medium">
                View All
              </Link>
            </div>

            <div className="bg-[#FFF9F3] border border-[#33231E]/15 rounded-2xl shadow-xs divide-y divide-[#33231E]/10 overflow-hidden">
              {/* Journey Row 1: Kashmir */}
              <Link
                to="/journeys/jrn_kashmir_01"
                className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-[#F9F4EE] transition-colors group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src="https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&q=80&w=300"
                    alt="Kashmir Escape"
                    className="w-14 h-11 rounded-lg object-cover shadow-2xs shrink-0"
                  />
                  <div className="min-w-0">
                    <h5 className="font-display text-sm font-semibold text-[#1C1410] group-hover:text-terracotta transition-colors truncate">
                      Kashmir Escape
                    </h5>
                    <p className="text-[11px] text-[#8A7B75] mt-0.5 truncate">
                      7 Days • 2 Travelers
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-mono text-xs text-[#8A7B75] hidden sm:inline">
                    20 May – 26 May 2026
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F3E7DC] text-[#7A3622] font-semibold">
                    Upcoming
                  </span>
                  <button type="button" className="text-[#8A7B75] hover:text-[#1C1410] p-1">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </Link>

              {/* Journey Row 2: Rajasthan */}
              <Link
                to="/journeys/jrn_rajasthan_01"
                className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-[#F9F4EE] transition-colors group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src="https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&q=80&w=300"
                    alt="Rajasthan Heritage Tour"
                    className="w-14 h-11 rounded-lg object-cover shadow-2xs shrink-0"
                  />
                  <div className="min-w-0">
                    <h5 className="font-display text-sm font-semibold text-[#1C1410] group-hover:text-terracotta transition-colors truncate">
                      Rajasthan Heritage Tour
                    </h5>
                    <p className="text-[11px] text-[#8A7B75] mt-0.5 truncate">
                      6 Days • 4 Travelers
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-mono text-xs text-[#8A7B75] hidden sm:inline">
                    10 Jun – 15 Jun 2026
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#EAE2D8] text-[#554742] font-semibold">
                    Planning
                  </span>
                  <button type="button" className="text-[#8A7B75] hover:text-[#1C1410] p-1">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </Link>

              {/* Journey Row 3: Dubai */}
              <Link
                to="/journeys/jrn_dubai_01"
                className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-[#F9F4EE] transition-colors group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src="https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=300"
                    alt="Dubai Break"
                    className="w-14 h-11 rounded-lg object-cover shadow-2xs shrink-0"
                  />
                  <div className="min-w-0">
                    <h5 className="font-display text-sm font-semibold text-[#1C1410] group-hover:text-terracotta transition-colors truncate">
                      Dubai Break
                    </h5>
                    <p className="text-[11px] text-[#8A7B75] mt-0.5 truncate">
                      4 Days • 2 Travelers
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-mono text-xs text-[#8A7B75] hidden sm:inline">
                    5 Jul – 8 Jul 2026
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E5DFD7] text-[#6B5E59] font-semibold">
                    Saved
                  </span>
                  <button type="button" className="text-[#8A7B75] hover:text-[#1C1410] p-1">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (~40%) */}
        <div className="lg:col-span-5 space-y-7">
          {/* MY JOURNEY PASSPORT ARTIFACT */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1C1410] tracking-wide block">
                My Journey Passport
              </span>
              <Link to="/journeys/jrn_goa_01" className="text-xs font-mono text-terracotta hover:underline font-medium">
                View All
              </Link>
            </div>

            {/* Vintage Travel Ticket / Passport Card */}
            <div
              className="relative bg-[#F4E8DB] border border-[#33231E]/25 rounded-2xl p-5 sm:p-6 shadow-sm overflow-hidden"
              style={{
                backgroundImage: 'radial-gradient(rgba(51, 35, 30, 0.08) 0.75px, transparent 0.75px)',
                backgroundSize: '12px 12px',
              }}
            >
              {/* Binder Clip Ring Holes on Left Edge */}
              <div className="absolute left-2.5 top-6 bottom-6 flex flex-col justify-between pointer-events-none">
                <span className="w-2.5 h-2.5 rounded-full bg-[#8A7B75]/40 border border-[#33231E]/30" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#8A7B75]/40 border border-[#33231E]/30" />
              </div>

              <div className="pl-4">
                {/* Header & Stamp */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-widest text-[#8A7B75] block">
                      YOUR JOURNEY
                    </span>
                    <h3 className="font-display text-xl sm:text-2xl font-bold text-[#1C1410] tracking-tight mt-0.5">
                      GOA GETAWAY
                    </h3>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#8A7B75] block mt-0.5">
                      5 DAYS • 4 NIGHTS
                    </span>
                    <span className="text-[10px] text-[#33231E] block font-medium">
                      ADVENTURE • BEACHES • FOOD
                    </span>
                  </div>

                  {/* Circular Compass Stamp Seal */}
                  <div className="w-18 h-18 rounded-full border-2 border-dashed border-[#8F321F]/60 flex flex-col items-center justify-center text-center p-1 transform rotate-6 select-none bg-soft-ivory/40">
                    <Compass className="w-6 h-6 text-[#8F321F]/80" />
                    <span className="text-[7px] font-mono tracking-tighter text-[#8F321F] font-bold mt-0.5">
                      TRIPLANNER
                    </span>
                    <span className="text-[6px] font-mono text-[#8F321F]/80">OFFICIAL PASS</span>
                  </div>
                </div>

                {/* Budget & Status Row */}
                <div className="mt-5 pt-3 border-t border-[#33231E]/15 flex items-baseline justify-between">
                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-[#8A7B75] block">
                      ALLOCATED / BUDGET CAP
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-display text-xl font-bold text-[#1C1410]">
                        ₹{goaSnapshot.allocatedCost.toLocaleString()}
                      </span>
                      <span className="text-[9px] text-[#8A7B75] font-mono uppercase">
                        / ₹{goaSnapshot.totalBudget.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-[#8A7B75] block">
                      SNAPSHOT VERSION
                    </span>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold uppercase tracking-wider border border-emerald-300">
                      v{goaSnapshot.version} • {alternativeApplied ? 'RESOLVED' : 'ATTENTION'}
                    </span>
                  </div>
                </div>

                {/* Machine Readable Zone */}
                <div className="mt-4 pt-3 border-t border-dashed border-[#33231E]/25 font-mono text-[8px] text-[#8A7B75]/90 tracking-widest break-all select-none leading-relaxed">
                  TP&lt;&lt;{(user?.full_name || 'TRAVELER').toUpperCase().replace(/\s+/g, '&lt;&lt;')}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
                  <br />
                  GOA250512&lt;&lt;5D4N&lt;&lt;ADVENTURE&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
                </div>
              </div>
            </div>
          </div>

          {/* ALERTS & UPDATES (LIVING JOURNEY ENGINE WIDGET) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-display text-lg text-[#1C1410] font-semibold">
                Alerts & Updates
              </span>
              <Link to="/notifications" className="text-xs font-mono text-terracotta hover:underline font-medium">
                View All
              </Link>
            </div>

            <div className="bg-[#FFF9F3] border border-[#33231E]/15 rounded-2xl p-4 shadow-xs space-y-3">
              {/* Alert Item 1: Disruption */}
              <div
                onClick={() => setActiveAlertModal(true)}
                className="p-2.5 rounded-xl hover:bg-[#F7EFE7] transition-all cursor-pointer flex items-start gap-3 group border border-transparent hover:border-terracotta/20"
              >
                <div className="w-8 h-8 rounded-full bg-terracotta/15 text-terracotta flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h5 className="text-xs font-semibold text-[#1C1410] group-hover:text-terracotta transition-colors truncate">
                      Scuba Diving on 13 May is at risk
                    </h5>
                    <span className="font-mono text-[9px] text-[#8A7B75] shrink-0">10m ago</span>
                  </div>
                  <p className="text-[11px] text-[#8A7B75] mt-0.5 leading-snug line-clamp-1">
                    {alternativeApplied
                      ? 'Alternative Kayaking selected. Schedule is now balanced.'
                      : 'High waves predicted. We have found 2 alternatives.'}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#8A7B75] group-hover:text-terracotta transition-transform group-hover:translate-x-0.5 shrink-0 self-center" />
              </div>

              {/* Alert Item 2: Booking Confirmation */}
              <Link
                to="/bookings"
                className="p-2.5 rounded-xl hover:bg-[#F7EFE7] transition-all flex items-start gap-3 group"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h5 className="text-xs font-semibold text-[#1C1410] group-hover:text-terracotta transition-colors truncate">
                      Your stay at The Hosteller is confirmed
                    </h5>
                    <span className="font-mono text-[9px] text-[#8A7B75] shrink-0">2h ago</span>
                  </div>
                  <p className="text-[11px] text-[#8A7B75] mt-0.5 leading-snug truncate">
                    Check-in on 14 May • 2 Adults • Private Suite
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#8A7B75] group-hover:text-terracotta transition-transform group-hover:translate-x-0.5 shrink-0 self-center" />
              </Link>

              {/* Alert Item 3: Price Drop */}
              <Link
                to="/payments"
                className="p-2.5 rounded-xl hover:bg-[#F7EFE7] transition-all flex items-start gap-3 group"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h5 className="text-xs font-semibold text-[#1C1410] group-hover:text-terracotta transition-colors truncate">
                      Price drop on your return flight
                    </h5>
                    <span className="font-mono text-[9px] text-[#8A7B75] shrink-0">1d ago</span>
                  </div>
                  <p className="text-[11px] text-[#8A7B75] mt-0.5 leading-snug truncate">
                    Mumbai → Delhi • 16 May • ₹1,850 less
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#8A7B75] group-hover:text-terracotta transition-transform group-hover:translate-x-0.5 shrink-0 self-center" />
              </Link>

              <div className="pt-2 text-center border-t border-[#33231E]/10">
                <Link
                  to="/notifications"
                  className="text-[11px] font-mono text-terracotta hover:underline font-semibold"
                >
                  View All Notifications
                </Link>
              </div>
            </div>
          </div>

          {/* CONTINUE PLANNING / CREATE NEW JOURNEY WIDGET */}
          <div className="bg-[#FFF9F3] border border-[#33231E]/15 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <span className="text-[10px] font-mono text-[#8A7B75] uppercase tracking-wider block">
                CONTINUE PLANNING
              </span>
              <h4 className="font-display text-base font-semibold text-[#1C1410]">
                Create a new journey
              </h4>
              <p className="text-[11px] text-[#8A7B75] leading-snug">
                Tell us your preferences and we&apos;ll build it around you.
              </p>
            </div>

            <Link
              to="/plan"
              className="shrink-0 w-10 h-10 rounded-full bg-terracotta text-white flex items-center justify-center hover:bg-terracotta-hover transition-transform hover:scale-105 shadow-xs"
              aria-label="Create New Journey"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. PHASE 05: AI JOURNEY COMPANION (GROUNDED DETERMINISTIC)    */}
      {/* ============================================================ */}
      <TravelerAiCompanionPanel
        journeyId="jrn_goa_01"
        snapshot={goaSnapshot}
        changeRequest={changeRequest}
        actorId={user?.id || 'usr_traveler_01'}
        actorRole="traveler"
        onOpenChangeReview={() => setActiveAlertModal(true)}
        onJourneyStateUpdated={(updatedReq, updatedSnap) => {
          setChangeRequest(updatedReq);
          setGoaSnapshot(updatedSnap);
        }}
      />

      {/* ============================================================ */}
      {/* LIVING JOURNEY ENGINE SIMULATION MODAL                       */}
      {/* ============================================================ */}
      {activeAlertModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in"
          onClick={() => setActiveAlertModal(false)}
        >
          <div
            className="w-full max-w-4xl my-8"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Living Engine Disruption Alert"
          >
            <ChangeReviewPanel
              changeRequest={changeRequest}
              snapshot={goaSnapshot}
              actorId={user?.id || 'usr_traveler_01'}
              actorRole="traveler"
              onChangeUpdated={(updatedReq, updatedSnap) => {
                setChangeRequest(updatedReq);
                setGoaSnapshot(updatedSnap);
              }}
              onClose={() => setActiveAlertModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
