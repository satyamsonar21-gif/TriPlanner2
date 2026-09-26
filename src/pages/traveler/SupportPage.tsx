import React, { useState } from 'react';
import {
  Search,
  MessageSquare,
  FileQuestion,
  RefreshCw,
  CreditCard,
  FileCheck,
  PhoneCall,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Send,
  Sparkles,
} from 'lucide-react';

export const SupportPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [ticketTab, setTicketTab] = useState<'open' | 'resolved'>('open');
  const [issueType, setIssueType] = useState('Booking Modification');
  const [issueDesc, setIssueDesc] = useState('');
  const [ticketSubmitted, setTicketSubmitted] = useState(false);

  const quickActions = [
    { label: 'Booking Help', icon: RefreshCw, desc: 'Modify dates or guest counts' },
    { label: 'Payment Help', icon: CreditCard, desc: 'Invoices, receipts & charges' },
    { label: 'Change Journey', icon: Sparkles, desc: 'Reroute stops or pace' },
    { label: 'Cancellations', icon: FileQuestion, desc: 'Refund rules & vendor terms' },
    { label: 'Travel Pass', icon: FileCheck, desc: 'Download vouchers & QR pass' },
    { label: 'Contact Coordinator', icon: PhoneCall, desc: 'Speak to local team in Goa' },
  ];

  const faqs = [
    {
      q: 'How does the Living Journey Engine adapt my itinerary when an activity is cancelled?',
      a: 'When an activity is cancelled due to weather or vendor conditions, the Living Engine calculates downstream impacts across subsequent bookings. It generates 2–3 score-matched alternatives with zero scheduling conflict and lets you approve the replacement with a single click.',
    },
    {
      q: 'How do I cancel or reschedule a confirmed booking?',
      a: 'Head to the Bookings tab, select "Manage Booking" on any voucher, and choose "Request Reschedule" or "Cancel". Your cancellation policy window and refund estimate will be calculated in real-time.',
    },
    {
      q: 'When are refunds credited back to my account?',
      a: 'Approved refunds are credited directly to your original payment method (HDFC Visa or UPI) within 3–5 business days with zero administrative deduction fees on operator cancellations.',
    },
    {
      q: 'How do I contact my on-ground trip coordinator during travel?',
      a: 'Your active journey coordinator is linked directly in your Traveler Portal and Journey Passport. You can chat via WhatsApp, dispatch an instant SOS, or request an immediate callback 24/7.',
    },
  ];

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueDesc.trim()) return;
    setTicketSubmitted(true);
    setTimeout(() => {
      setTicketSubmitted(false);
      setIssueDesc('');
    }, 4000);
  };

  return (
    <div className="space-y-8 font-body pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-[#33231E]/10">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#1C1410] tracking-tight">
          How can we help?
        </h1>
        <p className="text-xs sm:text-sm text-[#8A7B75] mt-1 font-body">
          Get help with your journeys, bookings and travel plans.
        </p>
      </div>

      {/* Large Help Search Bar */}
      <div className="relative max-w-2xl mx-auto">
        <Search className="w-5 h-5 text-[#8A7B75] absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for help with bookings, refunds, living engine..."
          className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-[#FFF9F3] border border-[#33231E]/20 text-sm text-[#1C1410] placeholder:text-[#8A7B75]/70 focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 shadow-xs"
        />
      </div>

      {/* Quick Action Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {quickActions.map((action, i) => {
          const Icon = action.icon;
          return (
            <div
              key={i}
              className="p-3.5 rounded-xl bg-[#FFF9F3] border border-[#33231E]/15 hover:border-terracotta/40 hover:shadow-xs transition-all text-center flex flex-col items-center justify-between cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-full bg-[#F4E8DC] text-terracotta flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Icon className="w-4 h-4" />
              </div>
              <h5 className="font-semibold text-xs text-[#1C1410] leading-snug">{action.label}</h5>
              <span className="text-[10px] text-[#8A7B75] mt-1 line-clamp-1">{action.desc}</span>
            </div>
          );
        })}
      </div>

      {/* Active Journey Coordinator Widget */}
      <div className="p-5 rounded-2xl bg-[#F7EFE6] border border-[#33231E]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-display font-bold text-sm shrink-0">
            RV
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-base font-semibold text-[#1C1410]">
                Goa Getaway • Rahul Verma
              </span>
              <span className="text-[9px] font-mono uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                ONLINE NOW
              </span>
            </div>
            <p className="text-xs text-[#8A7B75] mt-0.5">
              Assigned Field Coordinator • Current Journey Status: Everything is on track.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => alert('Opening live chat with coordinator Rahul Verma...')}
          className="px-5 py-2.5 rounded-lg bg-terracotta hover:bg-terracotta-hover text-white text-xs font-medium font-mono uppercase tracking-wider flex items-center justify-center gap-2 shadow-2xs self-start sm:self-auto"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat with Coordinator</span>
        </button>
      </div>

      {/* Split Section: FAQs & Ticket Submission */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Popular Help FAQs (~55%) */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="font-display text-lg font-semibold text-[#1C1410]">
            Frequently Answered Questions
          </h3>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-[#FFF9F3] border border-[#33231E]/15 rounded-xl overflow-hidden shadow-2xs transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    className="w-full p-4 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold text-[#1C1410] hover:text-terracotta transition-colors"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-stone-gray shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-stone-gray shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 text-xs text-[#8A7B75] leading-relaxed border-t border-[#33231E]/10 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Support Ticket Center (~45%) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-[#1C1410]">
              Support Desk
            </h3>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setTicketTab('open')}
                className={`px-2.5 py-1 text-xs rounded-md ${
                  ticketTab === 'open' ? 'bg-[#EEDFD5] text-terracotta font-semibold' : 'text-[#8A7B75]'
                }`}
              >
                New Request
              </button>
              <button
                type="button"
                onClick={() => setTicketTab('resolved')}
                className={`px-2.5 py-1 text-xs rounded-md ${
                  ticketTab === 'resolved' ? 'bg-[#EEDFD5] text-terracotta font-semibold' : 'text-[#8A7B75]'
                }`}
              >
                History (1)
              </button>
            </div>
          </div>

          {ticketTab === 'open' ? (
            <div className="bg-[#FFF9F3] border border-[#33231E]/15 rounded-2xl p-5 shadow-xs space-y-4">
              {ticketSubmitted ? (
                <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-center space-y-2 animate-in fade-in">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                  <h5 className="font-semibold text-xs text-emerald-900">
                    Request #REQ-2025-882 Logged!
                  </h5>
                  <p className="text-[11px] text-stone-gray">
                    Coordinator Rahul has been notified. Estimated response time is under 15 minutes.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitTicket} className="space-y-3 text-xs">
                  <div>
                    <label className="font-mono text-[10px] uppercase font-bold text-[#8A7B75] block mb-1">
                      ISSUE CATEGORY
                    </label>
                    <select
                      value={issueType}
                      onChange={(e) => setIssueType(e.target.value)}
                      className="w-full p-2.5 rounded-lg bg-[#F8F3ED] border border-[#33231E]/15 text-xs text-[#1C1410] focus:outline-none focus:border-terracotta"
                    >
                      <option value="Booking Modification">Booking Modification</option>
                      <option value="Disruption Assistance">Disruption Assistance</option>
                      <option value="Billing & Refund">Billing & Refund Inquiry</option>
                      <option value="Flight Delay">Flight Delay Adjustment</option>
                      <option value="General Support">General Traveler Support</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-mono text-[10px] uppercase font-bold text-[#8A7B75] block mb-1">
                      AFFECTED JOURNEY
                    </label>
                    <input
                      type="text"
                      readOnly
                      value="Goa Getaway (12 May – 16 May 2025)"
                      className="w-full p-2.5 rounded-lg bg-[#F8F3ED] border border-[#33231E]/15 text-xs text-stone-gray font-medium"
                    />
                  </div>

                  <div>
                    <label className="font-mono text-[10px] uppercase font-bold text-[#8A7B75] block mb-1">
                      DESCRIPTION OF REQUEST
                    </label>
                    <textarea
                      rows={3}
                      value={issueDesc}
                      onChange={(e) => setIssueDesc(e.target.value)}
                      placeholder="Explain what needs adjustment..."
                      className="w-full p-2.5 rounded-lg bg-[#F8F3ED] border border-[#33231E]/15 text-xs text-[#1C1410] focus:outline-none focus:border-terracotta"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-lg bg-terracotta hover:bg-terracotta-hover text-white text-xs font-medium font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Support Request</span>
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="bg-[#FFF9F3] border border-[#33231E]/15 rounded-2xl p-4 shadow-xs space-y-3 text-xs">
              <div className="p-3 bg-[#F8F3ED] rounded-xl border border-[#33231E]/10 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[10px] text-emerald-800 font-bold">#REQ-2025-104 • RESOLVED</span>
                  <span className="text-[10px] text-[#8A7B75]">24 Apr 2025</span>
                </div>
                <h5 className="font-semibold text-[#1C1410]">Add airport fast-forward baggage</h5>
                <p className="text-[11px] text-[#8A7B75]">
                  Coordinator confirmed priority baggage on IndiGo flight 6E-204 for 2 passengers.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
