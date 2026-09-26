import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Check,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import {
  MOCK_NOTIFICATIONS,
  type TravelerNotification,
} from '@/domains/traveler/traveler.data';

export const NotificationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'disruption' | 'booking' | 'payment' | 'recommendation'>('all');
  const [notifications, setNotifications] = useState<TravelerNotification[]>(MOCK_NOTIFICATIONS);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [adaptationApplied, setAdaptationApplied] = useState(false);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'disruption' && n.type !== 'disruption') return false;
    if (activeTab === 'booking' && n.type !== 'booking') return false;
    if (activeTab === 'payment' && n.type !== 'payment') return false;
    if (activeTab === 'recommendation' && n.type !== 'recommendation') return false;
    return true;
  });

  return (
    <div className="space-y-8 font-body pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#33231E]/10">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#1C1410] tracking-tight">
            Notifications
          </h1>
          <p className="text-xs sm:text-sm text-[#8A7B75] mt-1 font-body">
            Stay updated on your journeys, bookings and important changes.
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
            <div className="w-10 h-10 rounded-full bg-burnt-clay text-white flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase font-bold text-burnt-clay tracking-wider block">
                ATTENTION REQUIRED • LIVING ENGINE ADAPTATION
              </span>
              <h3 className="font-display text-lg text-[#1C1410] font-semibold mt-0.5">
                Scuba Diving on 13 May is unavailable.
              </h3>
              <p className="text-xs text-[#8A7B75] mt-1 leading-relaxed">
                Coastal swell advisory triggered automatic cancellation by vendor Coastal Aqua. The engine has synthesized 3 alternatives to maintain zero schedule overlap for your Goa Getaway.
              </p>
            </div>
          </div>

          <span className="font-mono text-[10px] text-burnt-clay shrink-0 font-bold hidden sm:inline">
            10M AGO
          </span>
        </div>

        <div className="pt-2 border-t border-burnt-clay/20 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-mono text-deep-slate">
            <span>Proposed Alternative: </span>
            <strong className="text-terracotta font-semibold">
              {adaptationApplied ? 'Backwater Kayaking (Applied)' : 'Backwater Kayaking & Mangrove Trail (14:30)'}
            </strong>
          </div>

          <button
            type="button"
            onClick={() => setReviewModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-terracotta hover:bg-terracotta-hover text-white text-xs font-medium font-mono uppercase tracking-wider flex items-center gap-1.5 shadow-2xs"
          >
            <span>{adaptationApplied ? 'View Resolved Plan' : 'Review Change & Alternatives'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#33231E]/10">
        {[
          { id: 'all', label: 'All Notifications' },
          { id: 'disruption', label: 'Journey Updates (1)' },
          { id: 'booking', label: 'Bookings (2)' },
          { id: 'payment', label: 'Payments (2)' },
          { id: 'recommendation', label: 'Recommendations (1)' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
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
            {/* Icon */}
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
              {notif.type === 'disruption' && <AlertTriangle className="w-4 h-4" />}
              {notif.type === 'booking' && <CheckCircle2 className="w-4 h-4" />}
              {notif.type === 'payment' && <Sparkles className="w-4 h-4" />}
              {notif.type === 'recommendation' && <Bell className="w-4 h-4" />}
            </div>

            {/* Content */}
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

      {/* Alternative Proposal Review Modal */}
      {reviewModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setReviewModalOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-[#FFF9F3] border border-[#33231E]/20 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-[#33231E]/15 pb-3">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-terracotta font-bold block">
                  LIVING JOURNEY PROPOSAL REVIEW
                </span>
                <h3 className="font-display text-xl text-deep-slate font-semibold">
                  13 May Scuba Diving Replacement
                </h3>
              </div>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="text-stone-gray hover:text-espresso"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-[#F4E8DC] rounded-xl border border-espresso/15">
                <span className="font-mono text-[9px] uppercase text-stone-gray block">DISRUPTED ITEM</span>
                <p className="font-semibold text-deep-slate mt-0.5">
                  Baga Reef Marine Scuba Diving (14:00) — Vendor Swell Cancellation
                </p>
                <p className="text-[#8A7B75] text-[11px] mt-0.5">Original Cost: ₹4,200 (Credit ready)</p>
              </div>

              <div className="p-4 rounded-xl border-2 border-terracotta bg-soft-ivory shadow-xs space-y-2">
                <span className="font-mono text-[9px] uppercase tracking-wider bg-terracotta text-white px-2 py-0.5 rounded font-bold">
                  RECOMMENDED REPLACEMENT (96% MATCH)
                </span>
                <h4 className="font-display text-base font-semibold text-deep-slate">
                  Backwater Kayaking & Mangrove Bird Trail
                </h4>
                <p className="text-[11px] text-[#8A7B75]">Time: 14:30 — 16:00 • Chorão Island Sanctuary</p>
                <p className="font-mono text-terracotta font-bold">
                  Cost: ₹1,800 • Net Refund: ₹2,400 to HDFC Visa
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#33231E]/15 flex justify-between items-center">
              <button
                onClick={() => setReviewModalOpen(false)}
                className="text-xs font-mono text-stone-gray hover:text-espresso"
              >
                Keep Reviewing Later
              </button>
              <button
                onClick={() => {
                  setAdaptationApplied(true);
                  setReviewModalOpen(false);
                }}
                className="px-5 py-2.5 rounded-lg bg-terracotta hover:bg-terracotta-hover text-white text-xs font-medium font-mono uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Update Journey Pass</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
