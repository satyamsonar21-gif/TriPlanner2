import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  AlertTriangle,
  Clock,
  Building,
  Plane,
  Sparkles,
  Car,
  Utensils,
  MoreVertical,
  HelpCircle,
  Printer,
  QrCode,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { MOCK_TRAVELER_BOOKINGS, type TravelerBooking } from '@/domains/traveler/traveler.data';

export const BookingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookingForModal, setSelectedBookingForModal] = useState<TravelerBooking | null>(null);

  const categories = [
    { id: 'all', label: 'All Types' },
    { id: 'accommodation', label: 'Stays', icon: Building },
    { id: 'flights', label: 'Flights', icon: Plane },
    { id: 'activities', label: 'Activities', icon: Sparkles },
    { id: 'transport', label: 'Transport', icon: Car },
    { id: 'meals', label: 'Meals', icon: Utensils },
  ];

  const filteredBookings = MOCK_TRAVELER_BOOKINGS.filter((b) => {
    if (activeTab === 'upcoming' && b.status !== 'Confirmed' && b.status !== 'At Risk' && b.status !== 'Pending')
      return false;
    if (activeTab === 'completed' && b.status !== 'Completed') return false;
    if (activeTab === 'cancelled' && b.status !== 'Cancelled') return false;

    if (selectedCategory !== 'all' && b.category !== selectedCategory) return false;

    if (
      searchQuery &&
      !b.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !b.provider.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !b.bookingCode.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !b.location.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-8 font-body pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#33231E]/10">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#1C1410] tracking-tight">
            Bookings
          </h1>
          <p className="text-xs sm:text-sm text-[#8A7B75] mt-1 font-body">
            View and manage all your trip bookings in one place.
          </p>
        </div>

        <Link
          to="/plan"
          className="px-4 py-2 rounded-lg bg-terracotta hover:bg-terracotta-hover text-white text-xs font-medium transition-colors shadow-2xs"
        >
          + Add New Reservation
        </Link>
      </div>

      {/* Main Grid: Left Bookings List, Right Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Controls & Booking Cards List (~65%) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Tabs & Search */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: 'all', label: 'All Bookings' },
                  { id: 'upcoming', label: 'Upcoming (7)' },
                  { id: 'completed', label: 'Completed' },
                  { id: 'cancelled', label: 'Cancelled' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id as any)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      activeTab === t.id
                        ? 'bg-[#EEDFD5] text-terracotta font-semibold'
                        : 'text-[#8A7B75] hover:text-[#1C1410] hover:bg-[#33231E]/5'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 text-[#8A7B75] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search bookings, ID, hotel..."
                  className="w-full pl-8 pr-3 py-1.5 bg-[#FFF9F3] border border-[#33231E]/15 rounded-lg text-xs text-[#1C1410] focus:outline-none focus:border-terracotta"
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border transition-colors whitespace-nowrap ${
                      selectedCategory === cat.id
                        ? 'bg-terracotta text-white border-terracotta'
                        : 'bg-[#FFF9F3] text-[#33231E] border-[#33231E]/15 hover:border-[#33231E]/30'
                    }`}
                  >
                    {Icon && <Icon className="w-3 h-3" />}
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bookings Card List */}
          <div className="space-y-4">
            {filteredBookings.map((b) => (
              <div
                key={b.id}
                className={`bg-[#FFF9F3] border rounded-2xl p-4 sm:p-5 shadow-xs transition-all hover:shadow-md ${
                  b.isDisrupted
                    ? 'border-burnt-clay/40 bg-gradient-to-r from-burnt-clay/5 via-[#FFF9F3] to-[#FFF9F3]'
                    : 'border-[#33231E]/15'
                }`}
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Provider Image */}
                  <img
                    src={b.image}
                    alt={b.title}
                    className="w-full sm:w-28 h-32 sm:h-28 rounded-xl object-cover shadow-2xs shrink-0"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-[#8A7B75] uppercase tracking-wider block">
                          {b.category} • {b.journeyTitle}
                        </span>
                        <h4 className="font-display text-base font-semibold text-[#1C1410] leading-snug">
                          {b.title}
                        </h4>
                        <p className="text-xs text-[#8A7B75] mt-0.5">{b.location}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-display text-base font-bold text-[#1C1410] block">
                          ₹{b.amount.toLocaleString()}
                        </span>
                        <span
                          className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                            b.paymentStatus === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {b.paymentStatus}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#8A7B75] pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-stone-gray" />
                        {b.dates}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-[11px] text-[#33231E] font-medium">
                        ID: {b.bookingCode}
                      </span>
                      <span>•</span>
                      <span
                        className={`font-semibold ${
                          b.status === 'Confirmed'
                            ? 'text-emerald-700'
                            : b.status === 'At Risk'
                            ? 'text-burnt-clay'
                            : 'text-amber-700'
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>

                    {/* Disruption Alert Notice (Living Engine Integration) */}
                    {b.isDisrupted && (
                      <div className="p-2.5 rounded-lg bg-burnt-clay/10 border border-burnt-clay/30 flex items-start gap-2 text-xs text-burnt-clay">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">Action Required on Activity</span>
                          <span className="text-[11px] text-espresso/80">{b.disruptionNotice}</span>
                        </div>
                      </div>
                    )}

                    {/* Card Actions */}
                    <div className="pt-2 border-t border-[#33231E]/10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedBookingForModal(b)}
                          className="px-3 py-1.5 rounded-lg bg-terracotta hover:bg-terracotta-hover text-white text-xs font-medium transition-colors"
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedBookingForModal(b)}
                          className="px-3 py-1.5 rounded-lg border border-[#33231E]/20 text-[#33231E] hover:bg-[#33231E]/5 text-xs font-medium transition-colors"
                        >
                          Manage Booking
                        </button>
                      </div>

                      <button type="button" className="text-[#8A7B75] hover:text-[#1C1410] p-1">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: Bookings Summary & Payments Overview (~35%) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Bookings Summary Card */}
          <div className="bg-[#FFF9F3] border border-[#33231E]/15 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-display text-base font-semibold text-[#1C1410] border-b border-[#33231E]/10 pb-3">
              Bookings Summary
            </h3>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-[#F8F3ED] rounded-xl border border-[#33231E]/10">
                <span className="font-display text-2xl font-bold text-[#1C1410] block">8</span>
                <span className="text-[10px] uppercase font-mono text-[#8A7B75]">Total Bookings</span>
              </div>
              <div className="p-3 bg-[#F8F3ED] rounded-xl border border-[#33231E]/10">
                <span className="font-display text-2xl font-bold text-emerald-800 block">6</span>
                <span className="text-[10px] uppercase font-mono text-[#8A7B75]">Confirmed</span>
              </div>
              <div className="p-3 bg-[#F8F3ED] rounded-xl border border-[#33231E]/10">
                <span className="font-display text-2xl font-bold text-burnt-clay block">1</span>
                <span className="text-[10px] uppercase font-mono text-burnt-clay font-bold">At Risk</span>
              </div>
              <div className="p-3 bg-[#F8F3ED] rounded-xl border border-[#33231E]/10">
                <span className="font-display text-2xl font-bold text-amber-700 block">1</span>
                <span className="text-[10px] uppercase font-mono text-[#8A7B75]">Pending</span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#33231E]/10 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#8A7B75]">Total Spent So Far:</span>
                <span className="font-mono font-bold text-[#1C1410]">₹1,24,560</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#8A7B75]">Goa Trip Budget:</span>
                <span className="font-mono text-terracotta font-semibold">₹40,000</span>
              </div>
            </div>
          </div>

          {/* Payment Overview */}
          <div className="bg-[#FFF9F3] border border-[#33231E]/15 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="font-display text-base font-semibold text-[#1C1410] border-b border-[#33231E]/10 pb-3">
              Payment Overview
            </h3>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-[#8A7B75]">PAID SETTLED:</span>
                <span className="text-emerald-800 font-bold">₹1,18,560</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A7B75]">PENDING BALANCE:</span>
                <span className="text-amber-800 font-bold">₹6,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A7B75]">REFUNDS PROCESSED:</span>
                <span className="text-[#8A7B75]">₹0</span>
              </div>
            </div>

            <div className="pt-3">
              <Link
                to="/payments"
                className="block w-full text-center py-2 rounded-lg border border-[#33231E]/20 text-xs font-medium text-[#33231E] hover:bg-[#33231E]/5 transition-colors"
              >
                View Invoices & Receipts
              </Link>
            </div>
          </div>

          {/* Support Assistance Box */}
          <div className="p-4 rounded-2xl bg-[#F7EFE6] border border-[#33231E]/10 text-xs space-y-2">
            <div className="flex items-center gap-2 text-[#1C1410] font-semibold">
              <HelpCircle className="w-4 h-4 text-terracotta" />
              <span>Need help modifying a reservation?</span>
            </div>
            <p className="text-[#8A7B75] leading-relaxed text-[11px]">
              Our 24/7 journey coordinators can adjust dates, request room upgrades, or coordinate with hotel vendors directly.
            </p>
            <Link to="/support" className="inline-block text-terracotta hover:underline font-semibold text-[11px]">
              Chat With Coordinator →
            </Link>
          </div>
        </div>
      </div>

      {/* Official Printable Voucher Modal */}
      {selectedBookingForModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedBookingForModal(null)}
        >
          <div
            className="w-full max-w-2xl bg-[#FFF9F3] border border-[#33231E]/20 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Voucher Header / Airline & Boutique Pass Banner */}
            <div className="bg-[#33231E] text-[#FFF9F3] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-terracotta" />
                <div>
                  <h3 className="font-display text-base font-semibold tracking-wide uppercase">
                    TripPlanner Official Voucher
                  </h3>
                  <span className="font-mono text-[10px] text-[#C2B29F] tracking-widest uppercase block">
                    Living Pass Architecture • Ref: {selectedBookingForModal.bookingCode}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-block px-2.5 py-1 bg-white/10 rounded font-mono text-[10px] text-emerald-300 font-medium uppercase tracking-wider">
                  Verified & Confirmed
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedBookingForModal(null)}
                  className="text-[#C2B29F] hover:text-white text-sm"
                  aria-label="Close voucher"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Voucher Body */}
            <div className="p-6 space-y-6">
              {/* Top Service Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#33231E]/10">
                <div>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[#8A7B75]">
                    Service Item
                  </span>
                  <h4 className="font-display text-2xl text-[#1C1410] font-semibold">
                    {selectedBookingForModal.title}
                  </h4>
                  <p className="text-xs text-[#8A7B75] mt-0.5">
                    {selectedBookingForModal.provider} • {selectedBookingForModal.location}
                  </p>
                </div>
                <div className="sm:text-right shrink-0">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[#8A7B75] block">
                    Amount Paid
                  </span>
                  <span className="font-mono text-xl font-bold text-terracotta">
                    ₹{selectedBookingForModal.amount.toLocaleString()}
                  </span>
                  <span className="font-mono text-[10px] text-emerald-700 font-semibold block">
                    PAID IN FULL
                  </span>
                </div>
              </div>

              {/* Grid Information */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-white/60 border border-[#33231E]/10 rounded-xl space-y-1">
                  <span className="font-mono text-[10px] uppercase text-[#8A7B75] block">Schedule Dates</span>
                  <span className="font-semibold text-[#1C1410] block">{selectedBookingForModal.dates}</span>
                  <span className="text-[11px] text-[#8A7B75]">Local Standard Time</span>
                </div>

                <div className="p-3 bg-white/60 border border-[#33231E]/10 rounded-xl space-y-1">
                  <span className="font-mono text-[10px] uppercase text-[#8A7B75] block">Status</span>
                  <span className="font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{selectedBookingForModal.status.toUpperCase()}</span>
                  </span>
                  <span className="text-[11px] text-[#8A7B75]">Instant Check-in Ready</span>
                </div>

                <div className="p-3 bg-white/60 border border-[#33231E]/10 rounded-xl space-y-1">
                  <span className="font-mono text-[10px] uppercase text-[#8A7B75] block">Traveler</span>
                  <span className="font-semibold text-[#1C1410] block">Satyam Sonar (Lead)</span>
                  <span className="text-[11px] text-[#8A7B75]">Trip Ref: TUR-2026-GOA</span>
                </div>
              </div>

              {/* QR Verification & Barcode Representation */}
              <div className="p-4 bg-white/80 border border-[#33231E]/15 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-16 h-16 bg-[#33231E] rounded-lg p-1.5 flex items-center justify-center shrink-0">
                    <QrCode className="w-12 h-12 text-[#FFF9F3]" />
                  </div>
                  <div>
                    <span className="font-mono text-[10px] uppercase text-[#8A7B75] block">
                      Digital Pass Verification
                    </span>
                    <span className="font-mono text-sm font-bold text-terracotta tracking-wider">
                      {selectedBookingForModal.bookingCode}
                    </span>
                    <p className="text-[11px] text-[#8A7B75] mt-0.5">
                      Present at reception or gate. Guaranteed by Living Journey Engine™.
                    </p>
                  </div>
                </div>

                <div className="font-mono text-[9px] text-[#8A7B75] sm:text-right space-y-0.5 shrink-0">
                  <div>ISSUER: TRIPPLANNER PLATFORM</div>
                  <div>PROTOCOL: SHA-256 SECURED</div>
                  <div>COORD: 24/7 +91 832 272 8888</div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-2 border-t border-[#33231E]/10 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedBookingForModal(null)}
                  className="px-4 py-2 rounded-lg border border-[#33231E]/20 text-xs font-medium text-[#33231E] hover:bg-[#33231E]/5 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2 rounded-lg bg-terracotta hover:bg-terracotta-hover text-white text-xs font-medium flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save as PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
