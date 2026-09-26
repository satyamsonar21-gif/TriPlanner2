import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  Compass,
  CloudSun,
  Activity,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { TravelAgentChatbox } from '@/components/ai-agent/TravelAgentChatbox';
import { Link } from 'react-router-dom';

export const PreferencesPage: React.FC = () => {
  return (
    <div className="space-y-6 font-body pb-12 max-w-5xl mx-auto">
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

        <div className="flex items-center gap-2">
          <Link
            to="/journeys/jrn_goa_01"
            className="px-3.5 py-2 rounded-xl bg-soft-ivory border border-[#33231E]/15 hover:border-terracotta text-xs font-mono text-[#1C1410] hover:text-terracotta transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <span>View Active Itinerary</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. REAL-TIME AGENT TELEMETRY STRIP                          */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#FFF9F3] border border-[#33231E]/10 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#8A7B75] uppercase">
            <Compass className="w-3.5 h-3.5 text-terracotta" />
            <span>Target Journey</span>
          </div>
          <span className="font-display text-base font-bold text-[#1C1410] block mt-1">
            Goa Getaway
          </span>
          <span className="text-[10px] text-terracotta font-mono">12 May – 16 May 2026</span>
        </div>

        <div className="bg-[#FFF9F3] border border-[#33231E]/10 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#8A7B75] uppercase">
            <CloudSun className="w-3.5 h-3.5 text-amber-600" />
            <span>Telemetry Link</span>
          </div>
          <span className="font-display text-base font-bold text-[#1C1410] block mt-1">
            31°C • Swell Alert
          </span>
          <span className="text-[10px] text-amber-700 font-mono">Mandovi Estuary Calm</span>
        </div>

        <div className="bg-[#FFF9F3] border border-[#33231E]/10 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#8A7B75] uppercase">
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            <span>Graph Health</span>
          </div>
          <span className="font-display text-base font-bold text-emerald-700 block mt-1">
            100% Feasible
          </span>
          <span className="text-[10px] text-[#8A7B75] font-mono">0 Overlaps • 45m Buffers</span>
        </div>

        <div className="bg-[#FFF9F3] border border-[#33231E]/10 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#8A7B75] uppercase">
            <ShieldCheck className="w-3.5 h-3.5 text-antique-brass" />
            <span>Human-in-Loop</span>
          </div>
          <span className="font-display text-base font-bold text-[#1C1410] block mt-1">
            Approval Gate
          </span>
          <span className="text-[10px] text-[#8A7B75] font-mono">1-Tap Confirmation</span>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 3. MAIN INTERACTIVE TRAVEL AGENT CHATBOX                     */}
      {/* ──────────────────────────────────────────────────────────── */}
      <TravelAgentChatbox initialDestination="Goa" />

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 4. THREE INTELLIGENT AGENT PILLARS                          */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="p-4 rounded-xl bg-[#FFF9F3] border border-[#33231E]/10 space-y-1.5 shadow-2xs">
          <div className="flex items-center gap-2 text-terracotta">
            <Sparkles className="w-4 h-4 shrink-0" />
            <h4 className="font-display text-sm font-semibold text-[#1C1410]">
              Personalized Context
            </h4>
          </div>
          <p className="text-xs text-[#8A7B75] leading-relaxed">
            Atlas remembers your pace, dietary rules, budget cap, and preferred stay styles across conversations.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#FFF9F3] border border-[#33231E]/10 space-y-1.5 shadow-2xs">
          <div className="flex items-center gap-2 text-amber-700">
            <Layers className="w-4 h-4 shrink-0" />
            <h4 className="font-display text-sm font-semibold text-[#1C1410]">
              Living Graph Sync
            </h4>
          </div>
          <p className="text-xs text-[#8A7B75] leading-relaxed">
            Suggestions aren&apos;t just text — when you approve an alternative, Atlas updates your master passport in real time.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#FFF9F3] border border-[#33231E]/10 space-y-1.5 shadow-2xs">
          <div className="flex items-center gap-2 text-emerald-700">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <h4 className="font-display text-sm font-semibold text-[#1C1410]">
              Operational Feasibility
            </h4>
          </div>
          <p className="text-xs text-[#8A7B75] leading-relaxed">
            Every route and dining proposal is mathematically checked against transit distances and operating hours.
          </p>
        </div>
      </div>
    </div>
  );
};
