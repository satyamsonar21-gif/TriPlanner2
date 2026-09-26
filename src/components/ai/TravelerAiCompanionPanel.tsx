import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Send,
  Compass,
  FileCheck2,
  HelpCircle,
  Lock,
} from 'lucide-react';
import type { UserRole } from '@/types/database.types';
import type {
  ApplyChangeResult,
  EngineChangeRequest,
  JourneySnapshot,
} from '@/domains/journey-engine';
import { sharedLivingJourneyEngine } from '@/domains/journey-engine';
import {
  sharedAiOrchestrator,
  type StructuredAiResponse,
} from '@/domains/ai';

export interface TravelerAiCompanionPanelProps {
  journeyId: string;
  snapshot: JourneySnapshot;
  changeRequest?: EngineChangeRequest;
  actorId?: string;
  actorRole?: UserRole;
  actorOrganizationId?: string;
  travelerDisplayName?: string;
  onOpenChangeReview?: () => void;
  onJourneyStateUpdated?: (
    updatedRequest: EngineChangeRequest,
    updatedSnapshot: JourneySnapshot,
    applyResult?: ApplyChangeResult
  ) => void;
}

const SUGGESTED_PROMPTS: Array<{ label: string; prompt: string }> = [
  {
    label: 'Adapt Cancelled Scuba (Keep Adventure & Budget)',
    prompt:
      "Scuba got cancelled. Keep the trip adventurous, don't increase my budget, and don't disturb dinner.",
  },
  {
    label: 'Why Recommend Kayaking?',
    prompt: 'Why did you recommend kayaking?',
  },
  {
    label: 'What Changed & Impact?',
    prompt: 'What changed on my itinerary and what downstream stops are affected?',
  },
  {
    label: 'Check Budget Status',
    prompt: 'How much am I spending and will this change increase my budget?',
  },
  {
    label: 'Confirmed Bookings',
    prompt: 'What bookings are confirmed and where am I staying?',
  },
];

export const TravelerAiCompanionPanel: React.FC<
  TravelerAiCompanionPanelProps
> = ({
  journeyId,
  snapshot,
  changeRequest,
  actorId = 'usr_traveler_01',
  actorRole = 'traveler',
  actorOrganizationId,
  travelerDisplayName = 'Traveler',
  onOpenChangeReview,
  onJourneyStateUpdated,
}) => {
  const [inputQuery, setInputQuery] = useState<string>('');
  const [processingStage, setProcessingStage] = useState<string | null>(null);
  const [latestResponse, setLatestResponse] =
    useState<StructuredAiResponse | null>(null);
  const [showDetailedWhy, setShowDetailedWhy] = useState<boolean>(false);

  const handleRunPrompt = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || processingStage) return;

    setProcessingStage('Checking journey context & deterministic constraints…');
    try {
      const res = await sharedAiOrchestrator.processRequest({
        operationType: 'traveler_assistant',
        userMessage: trimmed,
        journeyId,
        changeRequestId: changeRequest?.id,
        sessionActor: {
          actorId,
          actorRole,
          actorOrganizationId,
          travelerDisplayName,
        },
      });
      setLatestResponse(res);
    } finally {
      setProcessingStage(null);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleRunPrompt(inputQuery);
  };

  const handleApproveProposal = async () => {
    if (!latestResponse?.changeProposal || processingStage) return;

    setProcessingStage('Verifying journey version & executing atomic apply…');
    try {
      const applyRes = await sharedAiOrchestrator.applyApprovedProposal({
        proposal: latestResponse.changeProposal,
        sessionActor: {
          actorId,
          actorRole,
          actorOrganizationId,
          travelerDisplayName,
        },
        humanApproved: true,
      });
      setLatestResponse(applyRes);

      if (
        applyRes.applyResult?.success &&
        applyRes.applyResult.updatedSnapshot &&
        onJourneyStateUpdated
      ) {
        onJourneyStateUpdated(
          applyRes.applyResult.changeRequest,
          applyRes.applyResult.updatedSnapshot,
          applyRes.applyResult
        );
      } else {
        const refreshedSnap = sharedLivingJourneyEngine.getSnapshot(journeyId);
        const refreshedCr =
          sharedLivingJourneyEngine.getChangeRequestsForJourney(journeyId)[0];
        if (refreshedSnap && refreshedCr && onJourneyStateUpdated) {
          onJourneyStateUpdated(refreshedCr, refreshedSnap, applyRes.applyResult);
        }
      }
    } finally {
      setProcessingStage(null);
    }
  };

  return (
    <section
      aria-label="TripPlanner Grounded AI Companion"
      className="bg-[#FFF9F3] border border-[#33231E]/15 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5 font-body"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#33231E]/10">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#8F321F]/10 border border-[#8F321F]/25 flex items-center justify-center text-[#8F321F] shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-lg sm:text-xl font-bold text-[#1C1410]">
                Living Journey AI Companion
              </h2>
              <span className="px-2 py-0.5 rounded bg-[#F3E8DC] border border-[#33231E]/15 font-mono text-[10px] uppercase tracking-wider text-[#33231E]">
                Grounded in {snapshot.title} • v{snapshot.version}
              </span>
            </div>
            <p className="text-xs text-[#8A7B75] mt-0.5">
              AI interprets your preferences and explains impacts while the
              deterministic Living Journey Engine™ validates every schedule,
              dependency, and budget rule.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#2D5A37] bg-[#2D5A37]/10 px-2.5 py-1 rounded border border-[#2D5A37]/20 self-start sm:self-center">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Deterministic Guardrails Active</span>
        </div>
      </div>

      {/* Quick Contextual Prompts */}
      <div className="space-y-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-[#8A7B75] block">
          Ask About Your Live Journey or Adapt Disruptions
        </span>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={Boolean(processingStage)}
              onClick={() => {
                setInputQuery(item.prompt);
                void handleRunPrompt(item.prompt);
              }}
              className="text-left text-xs px-3 py-1.5 rounded-lg bg-[#F3E8DC]/70 hover:bg-[#F3E8DC] text-[#33231E] border border-[#33231E]/15 transition-colors cursor-pointer disabled:opacity-50"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Natural Language Input Form */}
      <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-2.5">
        <label htmlFor="traveler-ai-query-input" className="sr-only">
          Ask your TripPlanner AI Companion
        </label>
        <input
          id="traveler-ai-query-input"
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder='e.g., "Scuba got cancelled. Keep the trip adventurous, don&apos;t increase my budget, and don&apos;t disturb dinner."'
          className="flex-1 bg-white border border-[#33231E]/20 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#1C1410] placeholder:text-[#8A7B75] focus:outline-none focus:ring-2 focus:ring-[#8F321F]"
        />
        <button
          type="submit"
          disabled={!inputQuery.trim() || Boolean(processingStage)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#8F321F] hover:bg-[#762717] text-white text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Ask Companion</span>
        </button>
      </form>

      {/* Real Processing Indicator (Only shown when actual AI / Engine work is executing) */}
      {processingStage && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2.5 p-3.5 rounded-xl bg-[#F3E8DC] border border-[#C6A16B]/40 text-xs text-[#33231E]"
        >
          <Compass className="w-4 h-4 text-[#8F321F] animate-spin shrink-0" />
          <span className="font-mono">{processingStage}</span>
        </div>
      )}

      {/* Structured AI Response Display */}
      {latestResponse && !processingStage && (
        <div
          aria-live="polite"
          className="rounded-xl border border-[#33231E]/15 bg-white p-4 sm:p-5 space-y-4"
        >
          {/* Status & Telemetry Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#33231E]/10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#8F321F]/10 text-[#8F321F] font-mono text-[10px] font-semibold uppercase">
                {latestResponse.responseType}
              </span>
              <span className="px-2 py-0.5 rounded bg-[#F3E8DC] text-[#33231E] font-mono text-[10px]">
                Intent: {latestResponse.intent}
              </span>
              <span className="font-mono text-[10px] text-[#8A7B75]">
                Ref: {latestResponse.requestId}
              </span>
            </div>

            <span className="font-mono text-[10px] text-[#8A7B75]">
              Based on authoritative journey v{snapshot.version} •{' '}
              {latestResponse.groundedFacts.length} grounded facts
            </span>
          </div>

          {/* Headline & Grounded Message */}
          <div className="space-y-2">
            <h3 className="font-display text-base sm:text-lg font-bold text-[#1C1410]">
              {latestResponse.headline}
            </h3>
            <p className="text-xs sm:text-sm text-[#33231E] whitespace-pre-line leading-relaxed">
              {latestResponse.message}
            </p>
          </div>

          {/* Extracted Constraints & Preserve Rules Summary */}
          {latestResponse.extractedPreferences &&
            (latestResponse.extractedPreferences.interests.length > 0 ||
              latestResponse.extractedPreferences.budgetPolicy !==
                'UNSPECIFIED' ||
              latestResponse.extractedPreferences.preserveTargets.length >
                0) && (
              <div className="p-3 rounded-lg bg-[#F3E8DC]/60 border border-[#33231E]/10 space-y-1.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#8A7B75] block">
                  Structured Constraints Passed to Deterministic Engine
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {latestResponse.extractedPreferences.interests.map((int) => (
                    <span
                      key={`${int.value}-${int.source}`}
                      className="px-2 py-0.5 rounded bg-white border border-[#33231E]/15 text-[11px] text-[#1C1410]"
                    >
                      Interest: <strong>{int.value}</strong> ({int.source})
                    </span>
                  ))}
                  {latestResponse.extractedPreferences.budgetPolicy !==
                    'UNSPECIFIED' && (
                    <span className="px-2 py-0.5 rounded bg-white border border-[#33231E]/15 text-[11px] text-[#1C1410]">
                      Budget Policy:{' '}
                      <strong>
                        {latestResponse.extractedPreferences.budgetPolicy}
                      </strong>
                    </span>
                  )}
                  {latestResponse.extractedPreferences.preserveTargets.map(
                    (target) => (
                      <span
                        key={target}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#2D5A37]/10 border border-[#2D5A37]/25 text-[11px] text-[#2D5A37]"
                      >
                        <Lock className="w-3 h-3" />
                        Protected: <strong>{target}</strong>
                      </span>
                    )
                  )}
                </div>
              </div>
            )}

          {/* Expandable "Why This Recommendation?" Pipeline Output */}
          {latestResponse.explanation && (
            <div className="p-3.5 rounded-xl bg-[#FFF9F3] border border-[#C6A16B]/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#8F321F] font-semibold flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5" />
                  Why This Recommendation? (Deterministic Fact Breakdown)
                </span>
                <button
                  type="button"
                  onClick={() => setShowDetailedWhy((prev) => !prev)}
                  className="font-mono text-[10px] text-[#8F321F] underline cursor-pointer"
                >
                  {showDetailedWhy ? 'Hide Details' : 'Show Full Breakdown'}
                </button>
              </div>
              <p className="text-xs text-[#33231E]">
                {latestResponse.explanation.shortExplanation}
              </p>
              {showDetailedWhy && (
                <div className="space-y-2 pt-2 border-t border-[#33231E]/10 text-xs text-[#33231E]">
                  <p>{latestResponse.explanation.detailedExplanation}</p>
                  <ul className="space-y-1 pl-4 list-disc">
                    {latestResponse.explanation.whyRecommendedBullets.map(
                      (b) => (
                        <li key={b}>{b}</li>
                      )
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Actionable Change Proposal Card (Requires Human Approval) */}
          {latestResponse.changeProposal && (
            <div className="p-4 rounded-xl bg-[#F3E8DC]/70 border border-[#8F321F]/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#8F321F] font-semibold block">
                    Validated Proposal • Expected Journey v
                    {latestResponse.changeProposal.expectedJourneyVersion}
                  </span>
                  <h4 className="font-display text-base font-bold text-[#1C1410]">
                    {latestResponse.changeProposal.recommendedAlternativeTitle}{' '}
                    ({latestResponse.changeProposal.recommendedScore}/100)
                  </h4>
                </div>
                <span className="px-2.5 py-1 rounded bg-white border border-[#33231E]/15 font-mono text-xs font-semibold text-[#2D5A37]">
                  {latestResponse.changeProposal.priceDelta <= 0
                    ? `Saves ₹${Math.abs(
                        latestResponse.changeProposal.priceDelta
                      ).toLocaleString()}`
                    : `+₹${latestResponse.changeProposal.priceDelta.toLocaleString()}`}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded bg-white border border-[#33231E]/10">
                  <span className="text-[10px] font-mono text-[#8A7B75] block">
                    Budget Before
                  </span>
                  <strong className="text-[#1C1410]">
                    ₹
                    {latestResponse.changeProposal.budgetBefore.toLocaleString()}
                  </strong>
                </div>
                <div className="p-2 rounded bg-white border border-[#33231E]/10">
                  <span className="text-[10px] font-mono text-[#8A7B75] block">
                    Budget After
                  </span>
                  <strong className="text-[#2D5A37]">
                    ₹
                    {latestResponse.changeProposal.budgetAfter.toLocaleString()}
                  </strong>
                </div>
                <div className="p-2 rounded bg-white border border-[#33231E]/10">
                  <span className="text-[10px] font-mono text-[#8A7B75] block">
                    Remaining Cap
                  </span>
                  <strong className="text-[#1C1410]">
                    ₹
                    {latestResponse.changeProposal.remainingBudgetAfter.toLocaleString()}
                  </strong>
                </div>
                <div className="p-2 rounded bg-white border border-[#33231E]/10">
                  <span className="text-[10px] font-mono text-[#8A7B75] block">
                    Valid Options
                  </span>
                  <strong className="text-[#1C1410]">
                    {latestResponse.changeProposal.validAlternativesCount} valid
                    / {latestResponse.changeProposal.rejectedCandidatesCount}{' '}
                    filtered
                  </strong>
                </div>
              </div>

              {latestResponse.changeProposal.approvalState ===
              'AWAITING_HUMAN_APPROVAL' ? (
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => void handleApproveProposal()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2D5A37] hover:bg-[#23472B] text-white text-xs font-semibold uppercase tracking-wider cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve & Apply Atomically</span>
                  </button>
                  {onOpenChangeReview && (
                    <button
                      type="button"
                      onClick={onOpenChangeReview}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white hover:bg-[#F3E8DC] text-[#33231E] border border-[#33231E]/20 text-xs font-semibold uppercase tracking-wider cursor-pointer"
                    >
                      <FileCheck2 className="w-4 h-4" />
                      <span>Open Full Change Review Panel</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs font-mono text-[#2D5A37]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Proposal State: {latestResponse.changeProposal.approvalState}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Grounded Fact Reference Footer */}
          {latestResponse.groundedFacts.length > 0 && (
            <div className="pt-2 border-t border-[#33231E]/10 flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[10px] text-[#8A7B75]">
                Authoritative Sources:
              </span>
              {latestResponse.groundedFacts.slice(0, 4).map((fact) => (
                <span
                  key={fact.factId}
                  className="px-2 py-0.5 rounded bg-[#F3E8DC]/60 font-mono text-[10px] text-[#33231E]"
                  title={`${fact.label}: ${String(fact.authoritativeValue)}`}
                >
                  {fact.factId}
                </span>
              ))}
            </div>
          )}

          {/* Warnings / Safety Notices */}
          {latestResponse.warnings.length > 0 && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>{latestResponse.warnings.join(' • ')}</div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
