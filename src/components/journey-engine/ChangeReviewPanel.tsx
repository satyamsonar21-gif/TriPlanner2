import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  Sparkles,
  Wallet,
  ArrowRight,
  XCircle,
  History,
  Filter,
  GitBranch,
  Check,
} from 'lucide-react';
import type { UserRole } from '@/types/database.types';
import type {
  ApplyChangeResult,
  EngineChangeRequest,
  EngineSeverity,
  JourneySnapshot,
} from '@/domains/journey-engine';
import { sharedLivingJourneyEngine } from '@/domains/journey-engine';
import {
  buildAlternativeExplanationBundle,
  buildImpactExplanationBundle,
} from '@/domains/ai';
import { JourneyService } from '@/domains/journeys/journey.service';

interface ChangeReviewPanelProps {
  changeRequest: EngineChangeRequest;
  snapshot: JourneySnapshot;
  actorId?: string;
  actorRole?: UserRole;
  onChangeUpdated?: (
    updatedRequest: EngineChangeRequest,
    updatedSnapshot: JourneySnapshot,
    applyResult?: ApplyChangeResult
  ) => void;
  onClose?: () => void;
  compact?: boolean;
}

const SEVERITY_BADGE_STYLES: Record<EngineSeverity, string> = {
  NONE: 'bg-stone-100 text-stone-700 border-stone-300',
  INFO: 'bg-blue-50 text-blue-800 border-blue-200',
  LOW: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  MEDIUM: 'bg-amber-50 text-amber-900 border-amber-300',
  HIGH: 'bg-orange-100 text-orange-900 border-orange-300',
  CRITICAL: 'bg-red-100 text-red-900 border-red-300',
};

export const ChangeReviewPanel: React.FC<ChangeReviewPanelProps> = ({
  changeRequest: initialRequest,
  snapshot: initialSnapshot,
  actorId = 'usr_traveler_01',
  actorRole = 'traveler',
  onChangeUpdated,
  onClose,
}) => {
  const [changeRequest, setChangeRequest] =
    useState<EngineChangeRequest>(initialRequest);
  const [snapshot, setSnapshot] = useState<JourneySnapshot>(initialSnapshot);
  const [selectedAltId, setSelectedAltId] = useState<string>(
    initialRequest.selectedAlternativeId ||
      initialRequest.scoredAlternatives[0]?.id ||
      ''
  );
  const [showRejectedFilter, setShowRejectedFilter] = useState<boolean>(false);
  const [showAuditTimeline, setShowAuditTimeline] = useState<boolean>(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const selectedAlternative =
    changeRequest.scoredAlternatives.find((a) => a.id === selectedAltId) ||
    changeRequest.scoredAlternatives[0];

  const activeSimulation = selectedAlternative
    ? changeRequest.simulationsByAlternativeId[selectedAlternative.id]
    : undefined;

  const aiAlternativeExplanation = selectedAlternative
    ? buildAlternativeExplanationBundle({
        alternative: selectedAlternative,
        simulation: activeSimulation,
        rejectedCandidates: changeRequest.rejectedCandidates,
      })
    : null;

  const aiImpactExplanation = changeRequest.impactAnalysis
    ? buildImpactExplanationBundle({
        snapshot,
        impact: changeRequest.impactAnalysis,
        changeRequest,
      })
    : null;

  const isApplied = changeRequest.state === 'APPLIED';
  const isRejected = changeRequest.state === 'REJECTED';

  const handleSelectAlternative = (altId: string) => {
    setSelectedAltId(altId);
    if (
      changeRequest.state === 'AWAITING_APPROVAL' ||
      changeRequest.state === 'ALTERNATIVES_READY'
    ) {
      try {
        const updated = sharedLivingJourneyEngine.selectAlternative({
          changeRequestId: changeRequest.id,
          alternativeId: altId,
          actorId,
          actorRole,
        });
        setChangeRequest(updated);
      } catch {
        // Local preview if already in terminal state
      }
    }
  };

  const handleApproveAndApply = () => {
    const result = sharedLivingJourneyEngine.applyChange({
      changeRequestId: changeRequest.id,
      alternativeId: selectedAltId,
      actorId,
      actorRole,
    });

    setChangeRequest(result.changeRequest);
    if (result.success && result.updatedSnapshot) {
      setSnapshot(result.updatedSnapshot);

      // Propagate to JourneyService so Route Blueprint & Dashboard reflect v18 immediately
      JourneyService.syncFromEngineSnapshot({
        journeyId: result.updatedSnapshot.journeyId,
        version: result.updatedSnapshot.version,
        allocatedCost: result.updatedSnapshot.allocatedCost,
        stops: result.updatedSnapshot.items.map((item) => ({
          id: item.id,
          journeyId: item.journeyId,
          dayNumber: item.dayNumber,
          sequenceOrder: item.sequenceOrder,
          itemType:
            item.type === 'accommodation'
              ? 'accommodation'
              : item.type === 'meal'
              ? 'meal'
              : item.type === 'transport' ||
                item.type === 'flight' ||
                item.type === 'transfer'
              ? 'transport'
              : 'activity',
          title: item.title,
          subtitle: item.subtitle,
          startTimeIso: item.startTimeIso,
          endTimeIso: item.endTimeIso,
          displayWindow: item.displayWindow,
          price: item.price,
          currency: item.currency,
          status:
            item.status === 'cancelled'
              ? 'disrupted'
              : item.status,
          safetyBufferMinutes: item.safetyBufferMinutes,
          location: item.location,
        })),
      });

      setFeedbackBanner({
        type: 'success',
        message: `Change applied atomically! Journey upgraded from v${result.changeSet?.previousVersion} → v${result.changeSet?.newVersion}. ${result.changeSet?.summaryText}`,
      });
      onChangeUpdated?.(
        result.changeRequest,
        result.updatedSnapshot,
        result
      );
    } else {
      setFeedbackBanner({
        type: 'error',
        message:
          result.errorMessage ||
          'Could not apply change due to validation or version conflict.',
      });
    }
  };

  const handleReject = () => {
    try {
      const updated = sharedLivingJourneyEngine.rejectChangeRequest({
        changeRequestId: changeRequest.id,
        actorId,
        actorRole,
        reason: 'Declined by user during Change Review.',
      });
      setChangeRequest(updated);
      setFeedbackBanner({
        type: 'info',
        message:
          'Proposal rejected. Original journey snapshot remains untouched.',
      });
      onChangeUpdated?.(updated, snapshot);
    } catch (err) {
      setFeedbackBanner({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'Unable to reject proposal.',
      });
    }
  };

  return (
    <div
      data-testid="living-engine-change-review"
      className="bg-[#FFF9F3] border border-[#33231E]/20 rounded-2xl shadow-lg overflow-hidden font-body text-[#1C1410]"
    >
      {/* ================================================================ */}
      {/* TOP ENGINE PIPELINE STAGE HEADER                                 */}
      {/* ================================================================ */}
      <div className="bg-[#1C1410] text-[#FFF9F3] px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-terracotta animate-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-terracotta font-bold">
            LIVING JOURNEY ENGINE™ • DETERMINISTIC DECISION WORKFLOW
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
          <span className="px-2 py-0.5 rounded bg-white/10 text-white">
            SNAPSHOT v{snapshot.version}
          </span>
          <span
            data-testid="change-request-state-badge"
            className={`px-2.5 py-0.5 rounded font-bold uppercase ${
              isApplied
                ? 'bg-emerald-600 text-white'
                : isRejected
                ? 'bg-red-700 text-white'
                : 'bg-terracotta text-white'
            }`}
          >
            STATE: {changeRequest.state}
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="ml-2 text-white/70 hover:text-white px-1.5"
              aria-label="Close Change Review"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Stage Stepper */}
      <div className="bg-[#F4E8DC] px-5 py-2.5 border-b border-[#33231E]/15 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
        {[
          { label: '1. Detect Change', done: true },
          { label: '2. 10D Impact Analysis', done: Boolean(changeRequest.impactAnalysis) },
          {
            label: `3. Filter & Rank (${changeRequest.scoredAlternatives.length} Valid)`,
            done: changeRequest.scoredAlternatives.length > 0,
          },
          { label: '4. Simulate Before/After', done: Boolean(activeSimulation) },
          {
            label: isApplied ? '5. Applied (v' + snapshot.version + ')' : '5. Awaiting Approval',
            done: isApplied,
          },
        ].map((stage, i) => (
          <div
            key={stage.label}
            className={`flex items-center gap-1.5 ${
              stage.done ? 'text-[#1C1410] font-bold' : 'text-[#8A7B75]'
            }`}
          >
            <CheckCircle2
              className={`w-3.5 h-3.5 ${
                stage.done ? 'text-emerald-700' : 'text-stone-400'
              }`}
            />
            <span>{stage.label}</span>
            {i < 4 && <span className="text-[#8A7B75] ml-1">→</span>}
          </div>
        ))}
      </div>

      {feedbackBanner && (
        <div
          role="status"
          className={`px-5 py-3 text-xs font-medium flex items-center justify-between border-b ${
            feedbackBanner.type === 'success'
              ? 'bg-emerald-50 text-emerald-950 border-emerald-200'
              : feedbackBanner.type === 'error'
              ? 'bg-red-50 text-red-950 border-red-200'
              : 'bg-amber-50 text-amber-950 border-amber-200'
          }`}
        >
          <span>{feedbackBanner.message}</span>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-[10px] font-mono underline ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="p-5 sm:p-6 space-y-6">
        {/* ================================================================ */}
        {/* SECTIONS 1 & 2: WHAT CHANGED & WHY IT CHANGED                    */}
        {/* ================================================================ */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-[#FBF4EC] border border-[#33231E]/15 rounded-xl p-4">
          <div className="md:col-span-8 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded border font-mono text-[10px] font-bold uppercase ${
                  SEVERITY_BADGE_STYLES[changeRequest.severity]
                }`}
              >
                SEVERITY: {changeRequest.severity}
              </span>
              <span className="font-mono text-[10px] text-[#8A7B75] uppercase">
                TRIGGER: {changeRequest.trigger.triggerType}
              </span>
            </div>
            <h3 className="font-display text-lg sm:text-xl font-semibold text-[#1C1410]">
              {changeRequest.trigger.title}
            </h3>
            <p className="text-xs text-[#554742] leading-relaxed">
              <strong>Why it changed:</strong> {changeRequest.trigger.reason}
            </p>
          </div>

          <div className="md:col-span-4 border-t md:border-t-0 md:border-l border-[#33231E]/15 pt-3 md:pt-0 md:pl-4 flex flex-col justify-between text-xs">
            <div>
              <span className="font-mono text-[10px] uppercase text-[#8A7B75] block">
                AFFECTED DEPENDENCY CHAIN
              </span>
              <p className="font-mono text-[11px] font-semibold text-[#1C1410] mt-1">
                {changeRequest.impactAnalysis
                  ? `${changeRequest.impactAnalysis.directItemIds.length} Direct • ${changeRequest.impactAnalysis.downstreamItemIds.length} Downstream Dependents`
                  : '1 Direct Stop'}
              </p>
            </div>
            <div className="mt-2 font-mono text-[10px] text-[#8A7B75]">
              Expected Version: v{changeRequest.expectedJourneyVersion}
              {changeRequest.appliedJourneyVersion &&
                ` → Applied v${changeRequest.appliedJourneyVersion}`}
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* SECTION 3: 10-DIMENSION IMPACT SUMMARY                           */}
        {/* ================================================================ */}
        {changeRequest.impactAnalysis && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-mono text-xs uppercase tracking-wider font-bold text-[#1C1410] flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-terracotta" />
                <span>10-Dimension Impact Analysis</span>
              </h4>
              <span className="font-mono text-[10px] text-[#8A7B75]">
                Deterministic Graph Traversal
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {(
                [
                  'DIRECT',
                  'DOWNSTREAM',
                  'TEMPORAL',
                  'SPATIAL',
                  'BUDGET',
                ] as const
              ).map((dimKey) => {
                const dim = changeRequest.impactAnalysis!.dimensions[dimKey];
                return (
                  <div
                    key={dimKey}
                    className="p-3 rounded-xl bg-white border border-[#33231E]/15 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] font-bold uppercase text-[#8A7B75]">
                        {dim.dimension}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-bold border ${
                          SEVERITY_BADGE_STYLES[dim.severity]
                        }`}
                      >
                        {dim.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#1C1410] leading-snug line-clamp-3">
                      {dim.explanation}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* SECTION 4: RANKED ALTERNATIVES & MULTI-FACTOR SCORE BREAKDOWN    */}
        {/* ================================================================ */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="font-mono text-xs uppercase tracking-wider font-bold text-[#1C1410] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-terracotta" />
                <span>
                  Ranked Valid Alternatives ({changeRequest.scoredAlternatives.length})
                </span>
              </h4>
              <p className="text-[11px] text-[#8A7B75]">
                Scored across Preference (30), Time Fit (20), Proximity (15),
                Budget (15), Dependency (10), and Availability (10).
              </p>
            </div>

            {changeRequest.rejectedCandidates.length > 0 && (
              <button
                type="button"
                onClick={() => setShowRejectedFilter((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F4E8DC] border border-[#33231E]/15 font-mono text-[10px] text-[#554742] hover:text-[#1C1410]"
              >
                <Filter className="w-3 h-3 text-terracotta" />
                <span>
                  {showRejectedFilter ? 'Hide' : 'Show'}{' '}
                  {changeRequest.rejectedCandidates.length} Filtered-Out Invalid
                  Candidates
                </span>
              </button>
            )}
          </div>

          {/* Filtered-out invalid candidates proof box */}
          {showRejectedFilter && (
            <div
              data-testid="rejected-candidates-list"
              className="p-3.5 rounded-xl bg-red-50/70 border border-red-200 space-y-2 text-xs"
            >
              <span className="font-mono text-[10px] font-bold uppercase text-red-900 block">
                REJECTED BEFORE RANKING BY CONSTRAINT ENGINE:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {changeRequest.rejectedCandidates.map((rej) => (
                  <div
                    key={rej.candidateId}
                    className="p-2.5 rounded-lg bg-white border border-red-200/80"
                  >
                    <div className="flex items-center justify-between font-semibold text-red-950">
                      <span>{rej.title}</span>
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-red-100 text-red-800">
                        {rej.rejectionReasons[0]?.code}
                      </span>
                    </div>
                    <p className="text-[11px] text-red-800 mt-1">
                      {rej.rejectionReasons.map((r) => r.explanation).join(' ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Valid Alternatives Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {changeRequest.scoredAlternatives.map((alt) => {
              const isSelected = alt.id === selectedAlternative?.id;
              const sb = alt.scoreBreakdown;

              return (
                <div
                  key={alt.id}
                  data-testid={`alternative-card-${alt.candidate.id}`}
                  onClick={() => handleSelectAlternative(alt.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectAlternative(alt.id);
                    }
                  }}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer space-y-3 ${
                    isSelected
                      ? 'bg-[#FBF4EC] border-terracotta shadow-xs'
                      : 'bg-white border-[#33231E]/15 hover:border-[#33231E]/35'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#1C1410] text-white">
                          RANK #{alt.rank}
                        </span>
                        {alt.isRecommended && (
                          <span className="font-mono text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-terracotta text-white">
                            RECOMMENDED
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                          {alt.candidate.availabilityStatus}
                        </span>
                      </div>
                      <h5 className="font-display text-base font-semibold text-[#1C1410] mt-1.5">
                        {alt.candidate.title}
                      </h5>
                      <p className="text-[11px] text-[#8A7B75]">
                        {alt.candidate.subtitle}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        data-testid={`alternative-score-${alt.candidate.id}`}
                        className="font-display text-2xl font-bold text-terracotta block leading-none"
                      >
                        {sb.totalScore}
                        <span className="text-xs text-[#8A7B75] font-mono">
                          /100
                        </span>
                      </span>
                      <span className="font-mono text-[9px] uppercase text-[#8A7B75]">
                        ENGINE SCORE
                      </span>
                    </div>
                  </div>

                  {/* Time, Location & Financial Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#33231E]/10 text-xs font-mono">
                    <span className="inline-flex items-center gap-1 text-[#1C1410]">
                      <Clock className="w-3.5 h-3.5 text-terracotta" />
                      {alt.displayWindow}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[#554742]">
                      <MapPin className="w-3.5 h-3.5 text-terracotta" />
                      {(alt.distanceToNextMeters / 1000).toFixed(1)} km to next
                    </span>
                    <span className="font-bold text-emerald-800">
                      ₹{alt.candidate.priceAmount.toLocaleString()} (
                      {alt.priceDelta <= 0
                        ? `Saves ₹${Math.abs(alt.priceDelta).toLocaleString()}`
                        : `+₹${alt.priceDelta.toLocaleString()}`}
                      )
                    </span>
                  </div>

                  {/* 6-Factor Score Breakdown Pills */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1">
                    {[
                      { label: 'Pref', val: `+${sb.preferenceMatch}/30` },
                      { label: 'Time', val: `+${sb.timeFit}/20` },
                      { label: 'Loc', val: `+${sb.locationProximity}/15` },
                      { label: 'Budget', val: `+${sb.budgetFit}/15` },
                      { label: 'Dep', val: `+${sb.dependencyCompatibility}/10` },
                      { label: 'Avail', val: `+${sb.availabilityConfidence}/10` },
                    ].map((pill) => (
                      <div
                        key={pill.label}
                        className="px-1.5 py-1 rounded bg-[#F4E8DC]/80 text-center font-mono"
                      >
                        <span className="text-[8px] uppercase text-[#8A7B75] block">
                          {pill.label}
                        </span>
                        <span className="text-[10px] font-bold text-[#1C1410]">
                          {pill.val}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Factual Explanations */}
                  {isSelected && (
                    <ul className="space-y-1 pt-2 border-t border-[#33231E]/10 text-[11px] text-[#33231E]">
                      {alt.explanationReasons.map((reason) => (
                        <li key={reason} className="flex items-start gap-1.5">
                          <span className="text-terracotta font-bold">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          {/* PHASE 05: WHY THIS RECOMMENDATION? (GROUNDED AI EXPLANATION) */}
          {aiAlternativeExplanation && (
            <div
              data-testid="ai-why-this-recommendation"
              className="p-4 rounded-xl bg-[#F4E8DC]/75 border border-terracotta/30 space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-terracotta" />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#1C1410]">
                    WHY THIS RECOMMENDATION? • GROUNDED AI EXPLANATION
                  </span>
                </div>
                <span className="font-mono text-[9px] uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold">
                  {aiAlternativeExplanation.groundedFacts.length} VERIFIED FACTS
                </span>
              </div>

              <p className="text-xs text-[#1C1410] leading-relaxed">
                {aiAlternativeExplanation.summary}
              </p>

              {aiImpactExplanation && (
                <p className="text-[11px] text-[#554742] leading-snug">
                  <strong>Cascade Context:</strong> {aiImpactExplanation.summary}
                </p>
              )}

              <div className="flex flex-wrap gap-1.5 pt-1">
                {aiAlternativeExplanation.groundedFacts.map((fact) => (
                  <span
                    key={fact.factId}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/90 border border-[#33231E]/15 font-mono text-[9px] text-[#33231E]"
                  >
                    <strong className="text-terracotta">{fact.factId}:</strong>{' '}
                    {fact.label} = {fact.value}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* SECTIONS 5, 6, 7, 8: BEFORE VS AFTER SIMULATION DIFF & METRICS   */}
        {/* ================================================================ */}
        {activeSimulation && (
          <div className="space-y-4 pt-2 border-t border-[#33231E]/15">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-mono text-xs uppercase tracking-wider font-bold text-[#1C1410]">
                Before vs Proposed After Simulation —{' '}
                <span className="text-terracotta">
                  {activeSimulation.diff.alternativeTitle}
                </span>
              </h4>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span className="text-emerald-800 font-bold">
                  ✓ {activeSimulation.diff.conflictsResolved.length} Conflict(s)
                  Resolved
                </span>
                <span className="text-[#554742]">
                  {activeSimulation.diff.conflictsAfter.length} Remaining
                  Conflicts
                </span>
              </div>
            </div>

            {/* Financial, Budget & Spatial Delta KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-[#F4E8DC]/70 border border-[#33231E]/15">
                <span className="font-mono text-[9px] uppercase text-[#8A7B75] block">
                  COST BEFORE → AFTER
                </span>
                <span
                  data-testid="simulation-budget-comparison"
                  className="font-display text-base font-bold text-[#1C1410] mt-0.5 block"
                >
                  ₹{activeSimulation.diff.budgetBefore.toLocaleString()} → ₹
                  {activeSimulation.diff.budgetAfter.toLocaleString()}
                </span>
                <span className="font-mono text-[10px] text-emerald-800 font-semibold">
                  {activeSimulation.diff.costDelta <= 0
                    ? `Net Savings: ₹${Math.abs(
                        activeSimulation.diff.costDelta
                      ).toLocaleString()}`
                    : `+₹${activeSimulation.diff.costDelta.toLocaleString()}`}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#F4E8DC]/70 border border-[#33231E]/15">
                <span className="font-mono text-[9px] uppercase text-[#8A7B75] block">
                  REMAINING BUDGET HEADROOM
                </span>
                <span className="font-display text-base font-bold text-emerald-800 mt-0.5 block">
                  ₹{activeSimulation.diff.remainingBudgetAfter.toLocaleString()}
                </span>
                <span className="font-mono text-[10px] text-[#8A7B75]">
                  Cap: ₹{activeSimulation.diff.totalBudgetLimit.toLocaleString()}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#F4E8DC]/70 border border-[#33231E]/15">
                <span className="font-mono text-[9px] uppercase text-[#8A7B75] block">
                  DOWNSTREAM SCHEDULE SHIFTS
                </span>
                <span className="font-display text-base font-bold text-[#1C1410] mt-0.5 block">
                  {activeSimulation.diff.movedItems.length} Stop(s) Shifted
                </span>
                <span className="font-mono text-[10px] text-[#554742] truncate block">
                  {activeSimulation.diff.movedItems[0]
                    ? `${activeSimulation.diff.movedItems[0].itemTitle} → ${activeSimulation.diff.movedItems[0].newDisplayWindow}`
                    : 'No downstream shifts needed'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#F4E8DC]/70 border border-[#33231E]/15">
                <span className="font-mono text-[9px] uppercase text-[#8A7B75] block">
                  POST-SIMULATION VALIDATION
                </span>
                <span className="font-display text-base font-bold text-emerald-800 mt-0.5 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" />
                  {activeSimulation.afterConstraintEvaluation.valid
                    ? '100% Feasible'
                    : 'Constraint Issue'}
                </span>
                <span className="font-mono text-[10px] text-[#8A7B75]">
                  All buffers & locks verified
                </span>
              </div>
            </div>

            {/* Side-by-Side Current vs Proposed Schedule Table */}
            <div className="overflow-x-auto border border-[#33231E]/15 rounded-xl bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F4E8DC] border-b border-[#33231E]/15 font-mono text-[10px] uppercase text-[#554742]">
                    <th className="p-3">Current Schedule (Before)</th>
                    <th className="p-3">Proposed Schedule (After)</th>
                    <th className="p-3">Cost Impact</th>
                    <th className="p-3 text-right">Change Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#33231E]/10">
                  {activeSimulation.diff.changedItems.map((row) => (
                    <tr
                      key={row.itemId}
                      className={
                        row.changeType === 'REPLACED'
                          ? 'bg-terracotta/5'
                          : row.changeType === 'RESCHEDULED'
                          ? 'bg-amber-50/60'
                          : ''
                      }
                    >
                      <td className="p-3">
                        <span className="font-mono text-[10px] text-[#8A7B75] block">
                          {row.beforeWindow}
                        </span>
                        <span
                          className={`font-medium ${
                            row.changeType === 'REPLACED'
                              ? 'line-through text-red-800'
                              : 'text-[#1C1410]'
                          }`}
                        >
                          {row.beforeTitle}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-[10px] text-terracotta font-semibold block">
                          {row.afterWindow}
                        </span>
                        <span className="font-semibold text-[#1C1410]">
                          {row.afterTitle}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px]">
                        ₹{row.beforePrice.toLocaleString()} → ₹
                        {row.afterPrice.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono text-[10px]">
                        <span
                          className={`px-2 py-0.5 rounded font-bold uppercase ${
                            row.changeType === 'REPLACED'
                              ? 'bg-terracotta text-white'
                              : row.changeType === 'RESCHEDULED'
                              ? 'bg-amber-200 text-amber-950'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {row.changeType}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* SECTION 10: AUDIT & STATE TRANSITION TIMELINE                    */}
        {/* ================================================================ */}
        <div className="pt-2 border-t border-[#33231E]/15">
          <button
            type="button"
            onClick={() => setShowAuditTimeline((prev) => !prev)}
            className="text-xs font-mono text-terracotta hover:underline flex items-center gap-1.5 font-semibold"
          >
            <History className="w-3.5 h-3.5" />
            <span>
              {showAuditTimeline ? 'Hide' : 'View'} Change State Machine & Audit
              History ({changeRequest.stateHistory.length} Transitions)
            </span>
          </button>

          {showAuditTimeline && (
            <div className="mt-3 p-4 rounded-xl bg-white border border-[#33231E]/15 space-y-2 text-xs font-mono">
              {changeRequest.stateHistory.map((log, index) => (
                <div
                  key={`${log.fromState}-${log.toState}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-2 py-1 border-b last:border-b-0 border-[#33231E]/10"
                >
                  <div>
                    <span className="text-[#8A7B75]">{log.fromState}</span>
                    <span className="mx-1.5 text-terracotta font-bold">→</span>
                    <span className="font-bold text-[#1C1410]">
                      {log.toState}
                    </span>
                    <span className="ml-2 text-[#554742] font-body">
                      ({log.reason})
                    </span>
                  </div>
                  <span className="text-[10px] text-[#8A7B75]">
                    Actor: {log.actorId} [{log.actorRole}]
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* SECTION 9: APPROVAL & ATOMIC APPLY ACTION BAR                    */}
        {/* ================================================================ */}
        <div className="pt-4 border-t border-[#33231E]/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#554742]">
            <Wallet className="w-4 h-4 text-terracotta" />
            <span>
              Acting as <strong className="uppercase">{actorRole}</strong> •
              Optimistic Lock: <strong>v{snapshot.version}</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!isApplied && !isRejected && (
              <>
                <button
                  type="button"
                  data-testid="reject-change-button"
                  onClick={handleReject}
                  className="px-4 py-2 rounded-lg border border-red-300 text-red-800 hover:bg-red-50 text-xs font-mono uppercase tracking-wider flex items-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject Proposal</span>
                </button>

                <button
                  type="button"
                  data-testid="approve-and-apply-change-button"
                  onClick={handleApproveAndApply}
                  className="px-5 py-2.5 rounded-lg bg-terracotta hover:bg-terracotta-hover text-white text-xs font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    Approve & Apply ({selectedAlternative?.candidate.title})
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {isApplied && (
              <span
                data-testid="change-applied-confirmation"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-mono font-bold uppercase"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>
                  Applied to Live Journey (v{changeRequest.appliedJourneyVersion})
                </span>
              </span>
            )}

            {isRejected && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-100 text-red-900 border border-red-300 text-xs font-mono font-bold uppercase">
                <AlertTriangle className="w-4 h-4 text-red-700" />
                <span>Proposal Rejected — Original Plan Preserved</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
