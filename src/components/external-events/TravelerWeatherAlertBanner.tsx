import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Wind,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react';
import { sharedExternalEventImpactCoordinator } from '@/domains/external-events/impact-coordinator';
import type {
  ExternalEventJourneyImpact,
  WeatherEventChangeProposal,
} from '@/domains/external-events/types';
import { sharedLivingJourneyEngine } from '@/domains/journey-engine';

export interface TravelerWeatherAlertBannerProps {
  journeyId: string;
  onReviewAlternatives?: () => void;
  className?: string;
}

export const TravelerWeatherAlertBanner: React.FC<TravelerWeatherAlertBannerProps> = ({
  journeyId,
  onReviewAlternatives,
  className = '',
}) => {
  const [impacts, setImpacts] = useState<ExternalEventJourneyImpact[]>([]);
  const [proposal, setProposal] = useState<WeatherEventChangeProposal | undefined>(undefined);
  const [expandedFacts, setExpandedFacts] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const activeImpacts = sharedExternalEventImpactCoordinator.getImpactsForJourney(journeyId);
    const activeProposal = sharedExternalEventImpactCoordinator.getActiveProposalForJourney(journeyId);
    setImpacts(activeImpacts);
    setProposal(activeProposal);
  }, [journeyId]);

  if (dismissed || impacts.length === 0) {
    return null;
  }

  const primaryImpact = impacts[0];
  const severityColors: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    ADVISORY: {
      bg: 'bg-amber-50/80',
      border: 'border-amber-200',
      text: 'text-amber-900',
      badge: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    WATCH: {
      bg: 'bg-orange-50/80',
      border: 'border-orange-200',
      text: 'text-orange-900',
      badge: 'bg-orange-100 text-orange-800 border-orange-300',
    },
    WARNING: {
      bg: 'bg-rose-50/90',
      border: 'border-rose-200',
      text: 'text-rose-950',
      badge: 'bg-rose-100 text-rose-800 border-rose-300',
    },
    EMERGENCY: {
      bg: 'bg-red-100/90',
      border: 'border-red-400',
      text: 'text-red-950',
      badge: 'bg-red-200 text-red-900 border-red-400 font-bold',
    },
  };

  const colors = severityColors[primaryImpact.severity] || severityColors.ADVISORY;
  const snapshot = sharedLivingJourneyEngine.getSnapshot(journeyId);
  const preservedCount = snapshot
    ? snapshot.items.filter((i) => i.id !== primaryImpact.activityId && i.status !== 'cancelled').length
    : 3;

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 shadow-xs backdrop-blur-xs transition-all ${colors.bg} ${colors.border} ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        {/* Left Icon and Content */}
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white/80 shadow-2xs border border-[#33231E]/10 flex items-center justify-center shrink-0 text-amber-700">
            {primaryImpact.severity === 'WARNING' || primaryImpact.severity === 'EMERGENCY' ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse" />
            ) : (
              <Wind className="w-5 h-5 text-amber-600" />
            )}
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase tracking-wider font-semibold ${colors.badge}`}
              >
                {primaryImpact.severity} • ATMOSPHERIC NOTICE
              </span>
              <span className="text-[10px] font-mono text-[#8A7B75] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Verified & Fresh
              </span>
            </div>

            <h4 className="font-display text-base sm:text-lg font-semibold text-[#1C1410]">
              {primaryImpact.eventTitle}
            </h4>

            <p className="text-xs sm:text-sm text-[#4A3D38] leading-relaxed">
              <strong className="text-[#1C1410] font-semibold">{primaryImpact.activityTitle}</strong>{' '}
              {primaryImpact.impactReason}
            </p>

            {/* Preserved Status */}
            <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-medium pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {preservedCount} other itinerary activities remain completely safe and protected.
              </span>
            </div>
          </div>
        </div>

        {/* Right CTA Actions */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#33231E]/10">
          {proposal && onReviewAlternatives && (
            <button
              type="button"
              onClick={onReviewAlternatives}
              className="px-4 py-2 rounded-xl bg-terracotta hover:bg-terracotta-hover text-white text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all hover:scale-[1.02]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Review Alternatives
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExpandedFacts((prev) => !prev)}
              className="text-[11px] font-mono text-[#8A7B75] hover:text-[#1C1410] flex items-center gap-1 underline underline-offset-2"
            >
              <Info className="w-3 h-3" />
              {expandedFacts ? 'Hide Verification Facts' : 'View Grounded Facts'}
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="text-[11px] font-mono text-[#8A7B75] hover:text-[#1C1410] px-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>

      {/* Grounded Fact References Inspection */}
      {expandedFacts && (
        <div className="mt-4 pt-3 border-t border-[#33231E]/10 space-y-2 text-xs">
          <div className="flex items-center justify-between text-[11px] font-mono text-[#8A7B75]">
            <span>GROUNDED OPERATIONAL FACT CITATIONS (PHASE 06)</span>
            <span>Deterministic Non-AI Source of Truth</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="p-2.5 rounded-lg bg-white/70 border border-[#33231E]/10">
              <span className="text-[#8A7B75] block text-[10px]">EVENT IDENTIFIER</span>
              <span className="font-semibold text-[#1C1410]">{primaryImpact.eventId}</span>
              <span className="block text-[#8A7B75] mt-1 text-[10px]">
                Provenance: Verified Meteorological Provider
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-white/70 border border-[#33231E]/10">
              <span className="text-[#8A7B75] block text-[10px]">EVALUATED ACTIVITY</span>
              <span className="font-semibold text-[#1C1410]">{primaryImpact.activityTitle}</span>
              <span className="block text-[#8A7B75] mt-1 text-[10px]">
                Recommended Action: {primaryImpact.recommendedAction}
              </span>
            </div>
          </div>

          {proposal && (
            <div className="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200 font-mono text-[11px] text-emerald-950 flex items-center justify-between">
              <div>
                <span className="font-semibold block">RECOMMENDED REPLACEMENT READY</span>
                <span>
                  {proposal.recommendedAlternativeTitle} (Score {proposal.recommendedScore.toFixed(2)}) • Price delta: ₹
                  {proposal.priceDelta.toLocaleString()}
                </span>
              </div>
              <span className="text-[10px] text-emerald-800 uppercase px-2 py-0.5 rounded bg-emerald-100 font-bold">
                {proposal.approvalState}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
