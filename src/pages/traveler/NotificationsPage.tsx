import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import {
  MOCK_NOTIFICATIONS,
  type TravelerNotification,
} from '@/domains/traveler/traveler.data';
import {
  ensureGoaDemoChangeRequest,
  sharedLivingJourneyEngine,
  type EngineChangeRequest,
  type JourneySnapshot,
} from '@/domains/journey-engine';
import { ChangeReviewPanel } from '@/components/journey-engine';

export const NotificationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'all' | 'disruption' | 'booking' | 'payment' | 'recommendation'
  >('all');
  const [notifications, setNotifications] =
    useState<TravelerNotification[]>(MOCK_NOTIFICATIONS);
  const [reviewModalOpen, setReviewModalOpen] = useState(true);

  const [changeRequest, setChangeRequest] = useState<EngineChangeRequest>(() =>
    ensureGoaDemoChangeRequest()
  );
  const [snapshot, setSnapshot] = useState<JourneySnapshot>(
    () => sharedLivingJourneyEngine.getSnapshot('jrn_goa_01')!
  );

  const isApplied = changeRequest.state === 'APPLIED';
  const topAlternative = changeRequest.scoredAlternatives[0];

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'disruption' && n.type !== 'disruption') return false;
    if (activeTab === 'booking' && n.type !== 'booking') return false;
    if (activeTab === 'payment' && n.type !== 'payment') return false;
    if (activeTab === 'recommendation' && n.type !== 'recommendation')
      return false;
    return true;
  });

  return (
    <div className="space-y-8 font-body pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#33231E]/10">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#1C1410] tracking-tight">
            Notifications & Living Journey Adaptations
          </h1>
          <p className="text-xs sm:text-sm text-[#8A7B75] mt-1 font-body">
            Review deterministic impact analysis, scored alternatives, and
            before/after simulations for your active journeys.
          </p>
        </div>

        <button
          type="button"
          onClick={markAllAsRead}
          className="text-xs font-mono text-terracotta hover:underline font-semibold self-start sm:self-auto"
        >
          Mark all as read
        </button>
      </div>

      {/* PRIORITY CRITICAL ALERT: LIVING JOURNEY ENGINE */}
      <div className="p-5 sm:p-6 rounded-2xl bg-burnt-clay/10 border-2 border-burnt-clay/40 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-full text-white flex items-center justify-center shrink-0 mt-0.5 ${
                isApplied ? 'bg-emerald-700' : 'bg-burnt-clay'
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase font-bold text-burnt-clay tracking-wider block">
                {isApplied
                  ? `ADAPTATION APPLIED • SNAPSHOT v${snapshot.version}`
                  : `ATTENTION REQUIRED • LIVING ENGINE ADAPTATION (${changeRequest.state})`}
              </span>
              <h3 className="font-display text-lg text-[#1C1410] font-semibold mt-0.5">
                {changeRequest.trigger.title}
              </h3>
              <p className="text-xs text-[#554742] mt-1 leading-relaxed">
                {changeRequest.trigger.reason} Engine evaluated{' '}
                {changeRequest.scoredAlternatives.length +
                  changeRequest.rejectedCandidates.length}{' '}
                candidates, rejected {changeRequest.rejectedCandidates.length}{' '}
                invalid options, and ranked{' '}
                {changeRequest.scoredAlternatives.length} valid alternatives.
              </p>
            </div>
          </div>

          <span className="font-mono text-[10px] text-burnt-clay shrink-0 font-bold hidden sm:inline">
            SNAPSHOT v{snapshot.version}
          </span>
        </div>

        <div className="pt-2 border-t border-burnt-clay/20 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-mono text-deep-slate">
            <span>Top Scored Option: </span>
            <strong className="text-terracotta font-semibold">
              {topAlternative
                ? `${topAlternative.candidate.title} (${topAlternative.displayWindow} • Score ${topAlternative.scoreBreakdown.totalScore}/100 • ₹${topAlternative.candidate.priceAmount.toLocaleString()})`
                : 'Mandovi Backwater Mangrove Kayaking'}
            </strong>
          </div>

          <button
            type="button"
            onClick={() => setReviewModalOpen((prev) => !prev)}
            className="px-4 py-2 rounded-lg bg-terracotta hover:bg-terracotta-hover text-white text-xs font-medium font-mono uppercase tracking-wider flex items-center gap-1.5 shadow-2xs"
          >
            <span>
              {reviewModalOpen
                ? 'Hide Detailed Change Review'
                : isApplied
                ? 'Inspect Applied Change Plan'
                : 'Review Change & Alternatives'}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* INLINE DETERMINISTIC CHANGE REVIEW WORKFLOW */}
      {reviewModalOpen && (
        <ChangeReviewPanel
          changeRequest={changeRequest}
          snapshot={snapshot}
          actorId="usr_traveler_01"
          actorRole="traveler"
          onChangeUpdated={(updatedReq, updatedSnap) => {
            setChangeRequest(updatedReq);
            setSnapshot(updatedSnap);
          }}
        />
      )}

      {/* Tabs Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#33231E]/10">
        {(
          [
            { id: 'all', label: 'All Notifications' },
            { id: 'disruption', label: 'Journey Updates (1)' },
            { id: 'booking', label: 'Bookings (2)' },
            { id: 'payment', label: 'Payments (2)' },
            { id: 'recommendation', label: 'Recommendations (1)' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
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

      {/* Notifications Feed */}
      <div className="bg-[#FFF9F3] border border-[#33231E]/15 rounded-2xl divide-y divide-[#33231E]/10 overflow-hidden shadow-xs">
        {filteredNotifications.map((notif) => (
          <div
            key={notif.id}
            className={`p-4 sm:p-5 flex items-start gap-3.5 transition-colors ${
              notif.isRead ? 'bg-[#FFF9F3]' : 'bg-[#FBF4EC]'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                notif.type === 'disruption'
                  ? 'bg-burnt-clay/15 text-burnt-clay'
                  : notif.type === 'booking'
                  ? 'bg-emerald-100 text-emerald-800'
                  : notif.type === 'payment'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {notif.type === 'disruption' && (
                <AlertTriangle className="w-4 h-4" />
              )}
              {notif.type === 'booking' && (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {notif.type === 'payment' && <Sparkles className="w-4 h-4" />}
              {notif.type === 'recommendation' && <Bell className="w-4 h-4" />}
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <h4
                  className={`text-xs sm:text-sm font-semibold truncate ${
                    notif.isRead ? 'text-[#1C1410]' : 'text-terracotta'
                  }`}
                >
                  {notif.title}
                </h4>
                <span className="font-mono text-[10px] text-[#8A7B75] shrink-0">
                  {notif.timestamp}
                </span>
              </div>
              <p className="text-xs text-[#8A7B75] leading-relaxed">
                {notif.description}
              </p>

              {notif.actionLabel && (
                <div className="pt-1.5">
                  <Link
                    to={notif.actionUrl || '/bookings'}
                    className="text-xs font-mono font-medium text-terracotta hover:underline inline-flex items-center gap-1"
                  >
                    <span>{notif.actionLabel}</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>

            {!notif.isRead && (
              <span className="w-2 h-2 rounded-full bg-terracotta shrink-0 mt-2" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
