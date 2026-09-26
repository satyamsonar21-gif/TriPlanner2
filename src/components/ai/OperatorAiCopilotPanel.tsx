import React, { useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Mail,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import type { UserRole } from '@/types/database.types';
import {
  sharedAiOrchestrator,
  type CustomerCommunicationDraft,
  type StructuredAiResponse,
} from '@/domains/ai';

export interface OperatorAiCopilotPanelProps {
  actorId?: string;
  actorRole?: UserRole;
  actorOrganizationId?: string;
  onReviewJourneyChange?: (journeyId: string) => void;
}

export const OperatorAiCopilotPanel: React.FC<OperatorAiCopilotPanelProps> = ({
  actorId = 'usr_operator_01',
  actorRole = 'operator',
  actorOrganizationId = 'org_goa_luxury_escapes',
  onReviewJourneyChange,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copilotResponse, setCopilotResponse] =
    useState<StructuredAiResponse | null>(null);
  const [approvedDraftIds, setApprovedDraftIds] = useState<string[]>([]);

  const handleRunCopilotQuery = async (queryText: string) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const res = await sharedAiOrchestrator.processRequest({
        operationType: 'operator_copilot',
        userMessage: queryText,
        journeyId: 'jrn_goa_01',
        sessionActor: {
          actorId,
          actorRole,
          actorOrganizationId,
        },
      });
      setCopilotResponse(res);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveDraft = (draft: CustomerCommunicationDraft) => {
    if (!approvedDraftIds.includes(draft.draftId)) {
      setApprovedDraftIds([...approvedDraftIds, draft.draftId]);
    }
  };

  const opSummary = copilotResponse?.operatorSummary;

  return (
    <section
      aria-label="Operator AI Copilot"
      className="bg-[#FFF9F3] border border-[#33231E]/15 rounded-xl p-5 sm:p-6 space-y-5 font-body"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#33231E]/10">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#8F321F]/10 border border-[#8F321F]/25 flex items-center justify-center text-[#8F321F] shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-bold text-[#1C1410]">
                Operator AI Copilot
              </h2>
              <span className="px-2 py-0.5 rounded bg-[#F3E8DC] border border-[#33231E]/15 font-mono text-[10px] uppercase tracking-wider text-[#33231E]">
                AI summary based on current operational data
              </span>
            </div>
            <p className="text-xs text-[#8A7B75] mt-0.5">
              Summarizes active tour disruptions, pending approvals, and drafts
              grounded customer communications without executing silent changes.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={() =>
              void handleRunCopilotQuery('Which tours need attention today?')
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#8F321F] hover:bg-[#762717] text-white text-xs font-semibold uppercase tracking-wider cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}
            />
            <span>Scan Active Tours Queue</span>
          </button>
        </div>
      </div>

      {/* Processing state */}
      {isLoading && (
        <div
          role="status"
          aria-live="polite"
          className="p-3.5 rounded-lg bg-[#F3E8DC] text-xs font-mono text-[#33231E]"
        >
          Checking authorized operational queue & active ChangeRequests…
        </div>
      )}

      {/* Results */}
      {copilotResponse && !isLoading && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white border border-[#33231E]/15 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-base font-bold text-[#1C1410]">
                {copilotResponse.headline}
              </h3>
              <span className="font-mono text-[10px] text-[#8A7B75]">
                Correlation: {copilotResponse.correlationId}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#33231E] whitespace-pre-line">
              {copilotResponse.message}
            </p>
          </div>

          {/* Attention Items List */}
          {opSummary && opSummary.attentionItems.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white border border-[#33231E]/15 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#B85C42] font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Attention Required ({opSummary.attentionRequiredCount})
                  </span>
                  <span className="font-mono text-[10px] text-[#8A7B75]">
                    Evaluated {opSummary.totalToursEvaluated} tours
                  </span>
                </div>

                {opSummary.attentionItems.map((item) => (
                  <div
                    key={item.journeyId}
                    className="p-3 rounded-lg bg-[#FFF9F3] border border-[#33231E]/15 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-sm font-bold text-[#1C1410]">
                        {item.headline}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-900 font-mono text-[10px] font-semibold">
                        {item.severity} • v{item.journeyVersion}
                      </span>
                    </div>
                    <p className="text-xs text-[#33231E]">{item.summary}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-mono text-[#2D5A37]">
                        {item.validAlternativesCount} deterministic options
                        validated
                      </span>
                      {onReviewJourneyChange && (
                        <button
                          type="button"
                          onClick={() => onReviewJourneyChange(item.journeyId)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#8F321F] hover:underline cursor-pointer"
                        >
                          <span>Review Proposed Replacement</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Grounded Customer Communication Draft */}
              {opSummary.communicationDraft && (
                <div className="p-4 rounded-xl bg-white border border-[#33231E]/15 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#33231E] font-semibold flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#8F321F]" />
                      Customer Communication Draft (Requires Operator Review)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#F3E8DC] font-mono text-[10px] text-[#33231E]">
                      {approvedDraftIds.includes(
                        opSummary.communicationDraft.draftId
                      )
                        ? 'APPROVED_BY_OPERATOR'
                        : opSummary.communicationDraft.status}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#F3E8DC]/50 border border-[#33231E]/10 space-y-1.5 text-xs">
                    <div>
                      <span className="font-mono text-[10px] text-[#8A7B75]">
                        To:{' '}
                      </span>
                      <strong className="text-[#1C1410]">
                        {opSummary.communicationDraft.recipientName}
                      </strong>
                    </div>
                    <div>
                      <span className="font-mono text-[10px] text-[#8A7B75]">
                        Subject:{' '}
                      </span>
                      <strong className="text-[#1C1410]">
                        {opSummary.communicationDraft.subject}
                      </strong>
                    </div>
                    <p className="text-[#33231E] whitespace-pre-line pt-1 border-t border-[#33231E]/10">
                      {opSummary.communicationDraft.body}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-[#8A7B75] flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#2D5A37]" />
                      Grounded in{' '}
                      {opSummary.communicationDraft.groundedFactIds.join(', ')}
                    </span>

                    {approvedDraftIds.includes(
                      opSummary.communicationDraft.draftId
                    ) ? (
                      <span className="inline-flex items-center gap-1 text-xs font-mono text-[#2D5A37]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approved for Dispatch
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          handleApproveDraft(opSummary.communicationDraft!)
                        }
                        className="px-3 py-1.5 rounded-lg bg-[#2D5A37] hover:bg-[#23472B] text-white text-xs font-semibold uppercase tracking-wider cursor-pointer"
                      >
                        Approve Draft Message
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
