import React from 'react';
import {
  ArrowRight,
} from 'lucide-react';
import { TravelAgentChatbox } from '@/components/ai-agent/TravelAgentChatbox';
import { Link } from 'react-router-dom';

export const PreferencesPage: React.FC = () => {
  return (
    <div className="space-y-6 font-body pb-6 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
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
      {/* 3. MAIN INTERACTIVE TRAVEL AGENT CHATBOX                     */}
      {/* ──────────────────────────────────────────────────────────── */}
      <TravelAgentChatbox initialDestination="Goa" />


    </div>
  );
};
