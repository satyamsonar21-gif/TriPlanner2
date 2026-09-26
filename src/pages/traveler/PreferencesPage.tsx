import React from 'react';
import {
  ShieldCheck,
  Compass,
  CloudSun,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { TravelAgentChatbox } from '@/components/ai-agent/TravelAgentChatbox';
import { Link } from 'react-router-dom';

export const PreferencesPage: React.FC = () => {
  return (
    <div className="space-y-6 font-body pb-12 max-w-6xl mx-auto w-full">
      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. EDITORIAL HERO HEADER                                     */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#33231E]/10">
        <div>
          <div className="inline-flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-terracotta font-bold">
              AUTONOMOUS TRAVEL COPILOT • LIVING ENGINE™
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#1C1410] tracking-tight">
            Atlas — Traveling AI Agent
          </h1>
          <p className="text-xs sm:text-sm text-[#8A7B75] mt-1 font-body">
            Ask questions, tune itineraries, adapt to live weather, and configure your travel rules conversationally.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/journeys/jrn_goa_01"
            className="px-4 py-2 rounded-xl bg-soft-ivory border border-[#33231E]/15 hover:border-terracotta text-xs font-mono text-[#1C1410] hover:text-terracotta transition-all flex items-center gap-1.5 shadow-2xs group"
          >
            <span>View Active Itinerary</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. REAL-TIME AGENT TELEMETRY STRIP                          */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#FFF9F3] border border-[#33231E]/10 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#8A7B75] uppercase">
            <Compass className="w-3.5 h-3.5 text-terracotta shrink-0" />
            <span>Target Journey</span>
          </div>
          <div className="mt-2.5">
            <span className="font-display text-base font-bold text-[#1C1410] block leading-snug">
              Goa Getaway
            </span>
            <span className="text-[10px] text-terracotta font-mono mt-0.5 block">12 May – 16 May 2026</span>
          </div>
        </div>

        <div className="bg-[#FFF9F3] border border-[#33231E]/10 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#8A7B75] uppercase">
            <CloudSun className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Telemetry Link</span>
          </div>
          <div className="mt-2.5">
            <span className="font-display text-base font-bold text-[#1C1410] block leading-snug">
              31°C • Swell Alert
            </span>
            <span className="text-[10px] text-amber-700 font-mono mt-0.5 block">Mandovi Estuary Calm</span>
          </div>
        </div>

        <div className="bg-[#FFF9F3] border border-[#33231E]/10 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#8A7B75] uppercase">
            <Activity className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Graph Health</span>
          </div>
          <div className="mt-2.5">
            <span className="font-display text-base font-bold text-emerald-700 block leading-snug">
              100% Feasible
            </span>
            <span className="text-[10px] text-[#8A7B75] font-mono mt-0.5 block">0 Overlaps • 45m Buffers</span>
          </div>
        </div>

        <div className="bg-[#FFF9F3] border border-[#33231E]/10 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#8A7B75] uppercase">
            <ShieldCheck className="w-3.5 h-3.5 text-antique-brass shrink-0" />
            <span>Human-in-Loop</span>
          </div>
          <div className="mt-2.5">
            <span className="font-display text-base font-bold text-[#1C1410] block leading-snug">
              Approval Gate
            </span>
            <span className="text-[10px] text-[#8A7B75] font-mono mt-0.5 block">1-Tap Confirmation</span>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 3. MAIN INTERACTIVE TRAVEL AGENT CHATBOX                     */}
      {/* ──────────────────────────────────────────────────────────── */}
      <TravelAgentChatbox initialDestination="Goa" />


    </div>
  );
};
