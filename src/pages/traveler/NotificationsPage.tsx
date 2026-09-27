import React, { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Clock,
  Sparkles,
  Info,
  DollarSign,
} from 'lucide-react';
import {
  ensureGoaDemoChangeRequest,
  sharedLivingJourneyEngine,
  type EngineChangeRequest,
  type JourneySnapshot,
} from '@/domains/journey-engine';
import { ChangeReviewPanel } from '@/components/journey-engine';
import {
  sharedNotificationStore,
  sharedCommunicationOrchestrator,
  type NotificationRecord,
} from '@/domains/communications';

export const NotificationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'all' | 'unread' | 'action_required' | 'disruption' | 'refund'
  >('all');
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  const [changeRequest, setChangeRequest] = useState<EngineChangeRequest>(() =>
    ensureGoaDemoChangeRequest()
  );
  const [snapshot, setSnapshot] = useState<JourneySnapshot>(
    () => sharedLivingJourneyEngine.getSnapshot('jrn_goa_01')!
  );

  const loadNotifications = () => {
    let items = sharedNotificationStore.getByRecipient('usr_traveler_01');
    if (items.length === 0) {
      // Seed default Goa notifications if empty
      const defaultNotifs: NotificationRecord[] = [
        {
          id: 'notif_init_01',
          tenantId: 'org_goa_ops_01',
          recipientId: 'usr_traveler_01',
          recipientRole: 'traveler',
          journeyId: 'jrn_goa_01',
          bookingId: 'bk_goa_01',
          category: 'DISRUPTION',
          priority: 'CRITICAL',
          severity: 'HIGH',
          title: 'Your Scuba Diving needs attention',
          body: 'Scuba Diving Excursion has been cancelled by the supplier due to high ocean swell advisory. Your 19:30 dinner reservation remains protected. 2 curated alternatives are available.',
          contextSummary: {
            whatHappened: 'Scuba Diving at Grande Island cancelled by Baga Dive Center due to high wave swell.',
            whyItMatters: 'Your scheduled 14:30 afternoon excursion cannot proceed as planned.',
            whatIsAffected: 'Scuba Diving on Day 2 of your Goa Getaway.',
            whatHasChanged: 'Downstream dinner reservations at 19:30 remain completely unchanged.',
            whatActionRequired: 'Review the proposed replacement options within your budget.',
            whatUserCanDoNext: 'Tap below to select an alternative or request an immediate refund.',
          },
          actionRequired: true,
          actionType: 'APPROVAL_REQUIRED',
          actionUrl: '/notifications',
          lifecycleState: 'DELIVERED',
          correlationId: 'corr_goa_disrupt_v18',
          idempotencyKey: 'seed_notif_01',
          version: 1,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'notif_init_02',
          tenantId: 'org_goa_ops_01',
          recipientId: 'usr_traveler_01',
          recipientRole: 'traveler',
          journeyId: 'jrn_goa_01',
          bookingId: 'bk_goa_01',
          category: 'BOOKING',
          priority: 'NORMAL',
          severity: 'LOW',
          title: 'Booking Confirmed for Goa Getaway',
          body: 'Your trip is officially confirmed. Seashell Beach Resort, transfers, and activities have guaranteed inventory reservations.',
          contextSummary: {
            whatHappened: 'All accommodations and transport allocations successfully secured.',
            whyItMatters: 'Guarantees your reservation with zero manual check-in friction.',
            whatIsAffected: 'Goa Getaway 4-Day Journey.',
            whatHasChanged: 'All itinerary stops are now locked and operational.',
            whatUserCanDoNext: 'Inspect smart packing recommendations and regional tips.',
          },
          actionRequired: false,
          actionUrl: '/traveler/journeys/jrn_goa_01',
          lifecycleState: 'READ',
          correlationId: 'corr_goa_booking_v1',
          idempotencyKey: 'seed_notif_02',
          version: 1,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ];
      for (const n of defaultNotifs) {
        sharedNotificationStore.save(n);
      }
      items = defaultNotifs;
    }
    setNotifications(items);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const isApplied = changeRequest.state === 'APPLIED';
  const topAlternative = changeRequest.scoredAlternatives[0];

  const handleMarkAllRead = () => {
    sharedNotificationStore.markAllAsRead('usr_traveler_01');
    loadNotifications();
  };

  const handleMarkRead = (id: string) => {
    sharedNotificationStore.markAsRead(id, 'usr_traveler_01');
    loadNotifications();
  };

  const handleAcknowledge = (id: string) => {
    sharedCommunicationOrchestrator.acknowledge({
      notificationId: id,
      actionState: 'ACKNOWLEDGED',
      actorId: 'usr_traveler_01',
      actorRole: 'traveler',
      notes: 'Traveler acknowledged operational alert.',
    });
    loadNotifications();
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'unread' && n.lifecycleState === 'READ') return false;
    if (activeTab === 'action_required' && !n.actionRequired) return false;
    if (activeTab === 'disruption' && n.category !== 'DISRUPTION') return false;
    if (activeTab === 'refund' && n.category !== 'REFUND') return false;
    return true;
  });

  const unreadCount = sharedNotificationStore.getUnreadCount('usr_traveler_01');

  return (
    <div className="space-y-8 font-body pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#33231E]/10">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#1C1410] tracking-tight">
              Journey Communications & Updates
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-burnt-clay text-white font-mono text-xs font-bold">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[#8A7B75] mt-1 font-body">
            Authoritative operational communications, disruption updates, and financial status for your active journeys.
          </p>
        </div>

        <button
          type="button"
          onClick={handleMarkAllRead}
          className="text-xs font-mono text-terracotta hover:underline font-semibold self-start sm:self-auto"
        >
          Mark all as read
        </button>
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center gap-2 border-b border-[#33231E]/10 overflow-x-auto pb-2">
        {[
          { id: 'all', label: 'All Updates' },
          { id: 'unread', label: 'Unread' },
          { id: 'action_required', label: 'Action Required' },
          { id: 'disruption', label: 'Disruptions' },
          { id: 'refund', label: 'Refunds & Payments' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              activeTab === tab.id
                ? 'bg-burnt-clay text-white'
                : 'text-[#8A7B75] hover:text-[#1C1410] hover:bg-[#33231E]/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* PRIORITY CRITICAL ALERT: LIVING JOURNEY ENGINE INTEGRATION */}
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
                  ? `ADAPTATION COMMITTED • SNAPSHOT v${snapshot.version}`
                  : `ATTENTION REQUIRED • LIVING ENGINE ADAPTATION (${changeRequest.state})`}
              </span>
              <h3 className="font-display text-lg text-[#1C1410] font-semibold mt-0.5">
                {changeRequest.trigger.title}
              </h3>
              <p className="text-xs text-[#554742] mt-1 leading-relaxed">
                {changeRequest.trigger.reason} Living Journey Engine has calculated an optimal alternative protecting your downstream schedule.
              </p>
            </div>
          </div>

          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase font-bold shrink-0 ${
              isApplied
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-burnt-clay/20 text-burnt-clay border border-burnt-clay/30'
            }`}
          >
            {changeRequest.state}
          </span>
        </div>

        {/* Recommended Alternative Highlight */}
        {topAlternative && (
          <div className="p-3.5 bg-white/80 rounded-xl border border-burnt-clay/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-burnt-clay shrink-0" />
              <div>
                <p className="text-xs font-semibold text-[#1C1410]">
                  Proposed Replacement: {topAlternative.candidate.title}
                </p>
                <p className="text-[11px] text-[#8A7B75] mt-0.5">
                  14:30 - 16:30 • Score: {topAlternative.scoreBreakdown?.totalScore ?? 92}/100 • Price: ₹{topAlternative.candidate.priceAmount.toLocaleString()} • Dinner at 19:30 Protected
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setReviewModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-burnt-clay text-white text-xs font-medium hover:bg-burnt-clay/90 transition-colors flex items-center gap-1.5"
              >
                {isApplied ? 'Inspect Changes' : 'Review & Approve'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* NOTIFICATIONS FEED */}
      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center bg-white/60 rounded-2xl border border-[#33231E]/10">
            <Bell className="w-8 h-8 text-[#8A7B75] mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold text-[#1C1410]">No notifications found</p>
            <p className="text-xs text-[#8A7B75] mt-1">You are all caught up with your journey updates.</p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const isUnread = notif.lifecycleState !== 'READ' && notif.lifecycleState !== 'RESOLVED';
            const isCritical = notif.priority === 'CRITICAL';

            return (
              <div
                key={notif.id}
                className={`p-5 rounded-2xl bg-white border transition-all duration-200 ${
                  isUnread
                    ? isCritical
                      ? 'border-burnt-clay/60 shadow-sm bg-burnt-clay/[0.02]'
                      : 'border-terracotta/40 shadow-xs'
                    : 'border-[#33231E]/10 opacity-90'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        notif.category === 'DISRUPTION'
                          ? 'bg-burnt-clay/10 text-burnt-clay'
                          : notif.category === 'REFUND'
                          ? 'bg-emerald-100 text-emerald-700'
                          : notif.category === 'PAYMENT'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-[#33231E]/5 text-[#1C1410]'
                      }`}
                    >
                      {notif.category === 'DISRUPTION' ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : notif.category === 'REFUND' ? (
                        <DollarSign className="w-4 h-4" />
                      ) : notif.category === 'PAYMENT' ? (
                        <Clock className="w-4 h-4" />
                      ) : (
                        <Info className="w-4 h-4" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`font-mono text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            notif.priority === 'CRITICAL'
                              ? 'bg-burnt-clay text-white'
                              : notif.priority === 'HIGH'
                              ? 'bg-amber-600 text-white'
                              : 'bg-[#33231E]/10 text-[#554742]'
                          }`}
                        >
                          {notif.priority}
                        </span>
                        <span className="font-mono text-[10px] text-[#8A7B75] uppercase">
                          {notif.category}
                        </span>
                        <span className="text-[#8A7B75] text-xs">•</span>
                        <span className="text-[11px] font-mono text-[#8A7B75]">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <h4 className="font-display text-base font-semibold text-[#1C1410]">
                        {notif.title}
                      </h4>
                      <p className="text-xs text-[#554742] leading-relaxed">
                        {notif.body}
                      </p>

                      {/* CONTEXTUAL OPERATIONAL BREAKDOWN */}
                      {notif.contextSummary && (
                        <div className="mt-3 pt-3 border-t border-[#33231E]/10 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2 rounded-lg bg-[#FAF8F5]">
                            <span className="font-mono font-bold text-[#8A7B75] block uppercase text-[9px]">
                              Why It Matters
                            </span>
                            <span className="text-[#1C1410]">{notif.contextSummary.whyItMatters}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-[#FAF8F5]">
                            <span className="font-mono font-bold text-[#8A7B75] block uppercase text-[9px]">
                              What Has Changed
                            </span>
                            <span className="text-[#1C1410]">{notif.contextSummary.whatHasChanged}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {isUnread && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(notif.id)}
                        className="text-[11px] font-mono text-[#8A7B75] hover:text-[#1C1410]"
                        title="Mark as read"
                      >
                        Dismiss
                      </button>
                    )}
                    {notif.actionRequired && notif.lifecycleState !== 'ACKNOWLEDGED' && (
                      <button
                        type="button"
                        onClick={() => {
                          handleAcknowledge(notif.id);
                          setReviewModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-burnt-clay text-white text-xs font-semibold hover:bg-burnt-clay/90 transition-colors shadow-xs"
                      >
                        Review Change
                      </button>
                    )}
                    {notif.lifecycleState === 'ACKNOWLEDGED' && (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Acknowledged
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Review Modal */}
      {reviewModalOpen && (
        <ChangeReviewPanel
          changeRequest={changeRequest}
          snapshot={snapshot}
          onClose={() => setReviewModalOpen(false)}
          onChangeUpdated={(_updatedReq, updatedSnap) => {
            setSnapshot(updatedSnap);
            setChangeRequest(sharedLivingJourneyEngine.getChangeRequest(changeRequest.id)!);
            loadNotifications();
          }}
        />
      )}
    </div>
  );
};
