import React, { useState } from 'react';
import {
  Wallet,
  CreditCard,
  Download,
  ShieldCheck,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import {
  MOCK_PAYMENT_TRANSACTIONS,
  type PaymentTransaction,
} from '@/domains/traveler/traveler.data';
import { useAuth } from '@/core/auth/AuthContext';

export const PaymentsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'transactions' | 'upcoming' | 'invoices' | 'refunds'>('transactions');
  const [transactions] = useState<PaymentTransaction[]>(MOCK_PAYMENT_TRANSACTIONS);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [isManageMethodsOpen, setIsManageMethodsOpen] = useState(false);
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardName, setNewCardName] = useState('');

  const triggerToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3500);
  };

  return (
    <div className="space-y-8 font-body pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#33231E]/10">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#1C1410] tracking-tight">
            Payments
          </h1>
          <p className="text-xs sm:text-sm text-[#8A7B75] mt-1 font-body">
            Manage your travel payments, invoices and refunds.
          </p>
        </div>

        <button
          type="button"
          onClick={() => triggerToast('Official consolidated financial tax statement for FY 2025-26 compiled & downloaded.')}
          className="px-4 py-2 rounded-lg bg-transparent border border-[#33231E]/20 text-[#33231E] hover:bg-[#33231E]/5 text-xs font-medium transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Tax Statement</span>
        </button>
      </div>

      {/* Floating Action Feedback Toast */}
      {actionToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#33231E] text-[#FFF9F3] px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-mono animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* Top Summary Cards (4 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#33231E]/15 shadow-2xs">
          <span className="text-[10px] font-mono text-[#8A7B75] uppercase block">TOTAL SPENT</span>
          <span className="font-display text-2xl font-bold text-[#1C1410] block mt-0.5">₹1,24,560</span>
          <span className="text-[9px] text-[#8A7B75]">Across 8 travel vouchers</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#33231E]/15 shadow-2xs">
          <span className="text-[10px] font-mono text-[#8A7B75] uppercase block">PENDING BALANCE</span>
          <span className="font-display text-2xl font-bold text-amber-700 block mt-0.5">₹6,000</span>
          <span className="text-[9px] text-amber-700 font-medium">Auto-debit on 10 May</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#33231E]/15 shadow-2xs">
          <span className="text-[10px] font-mono text-[#8A7B75] uppercase block">REFUND CREDITS</span>
          <span className="font-display text-2xl font-bold text-[#1C1410] block mt-0.5">₹0</span>
          <span className="text-[9px] text-stone-gray">All accounts settled</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#33231E]/15 shadow-2xs">
          <span className="text-[10px] font-mono text-[#8A7B75] uppercase block">ACTIVE TRIP BUDGET</span>
          <span className="font-display text-2xl font-bold text-terracotta block mt-0.5">₹40,000</span>
          <span className="text-[9px] text-terracotta font-medium">Goa Getaway (80% Allocated)</span>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Transactions & Invoices (~66%) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#33231E]/10">
            {[
              { id: 'transactions', label: 'Recent Transactions' },
              { id: 'upcoming', label: 'Upcoming Schedule' },
              { id: 'invoices', label: 'Invoices & Receipts' },
              { id: 'refunds', label: 'Refunds (0)' },
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

          {/* Transactions List */}
          {activeTab === 'transactions' && (
            <div className="space-y-3">
              <span className="font-display text-base font-semibold text-[#1C1410] block">
                Settled & Pending Transactions
              </span>

              <div className="bg-[#FFF9F3] border border-[#33231E]/15 rounded-2xl shadow-xs divide-y divide-[#33231E]/10 overflow-hidden">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F9F4EE] transition-colors"
                  >
                    <div className="space-y-0.5">
                      <h5 className="font-semibold text-xs text-[#1C1410]">{tx.description}</h5>
                      <p className="text-[11px] text-[#8A7B75]">
                        {tx.journey} • {tx.date} • {tx.method}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <span className="font-mono text-sm font-bold text-[#1C1410]">
                        ₹{tx.amount.toLocaleString()}
                      </span>
                      <span
                        className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                          tx.status === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {tx.status}
                      </span>
                      {tx.receiptUrl && (
                        <button
                          type="button"
                          onClick={() => triggerToast(`Receipt downloaded for ${tx.description}`)}
                          className="text-[#8A7B75] hover:text-terracotta p-1 cursor-pointer"
                          title="Download Receipt"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Schedule */}
          {activeTab === 'upcoming' && (
            <div className="space-y-3">
              <span className="font-display text-base font-semibold text-[#1C1410] block">
                Scheduled Automatic Debits
              </span>
              <div className="p-5 rounded-2xl bg-[#FFF9F3] border border-[#33231E]/15 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono text-[#8A7B75] uppercase block">DUE 10 MAY 2026</span>
                    <h5 className="font-display text-sm font-semibold text-[#1C1410] mt-0.5">
                      IndiGo Flight GOI → DEL Final Settlement
                    </h5>
                    <p className="text-xs text-[#8A7B75] mt-0.5">
                      Goa Getaway • 2 Travelers • Auto-Debit via HDFC Visa ending in 4082
                    </p>
                  </div>
                  <span className="font-mono text-base font-bold text-terracotta">₹6,000</span>
                </div>
                <div className="pt-3 border-t border-[#33231E]/10 flex justify-between items-center text-xs">
                  <span className="text-[#8A7B75]">Cancellation Protection: Active</span>
                  <button className="text-terracotta font-semibold hover:underline">Pay Now</button>
                </div>
              </div>
            </div>
          )}

          {/* Invoices List */}
          {activeTab === 'invoices' && (
            <div className="space-y-3">
              <span className="font-display text-base font-semibold text-[#1C1410] block">
                Official Tax Invoices
              </span>
              <div className="bg-[#FFF9F3] border border-[#33231E]/15 rounded-2xl divide-y divide-[#33231E]/10 overflow-hidden">
                {[
                  { id: 'INV-2026-091', item: 'Seashell Beach Resort Stay', amount: 24560, date: '20 Apr 2026' },
                  { id: 'INV-2026-092', item: 'IndiGo Airlines Flight DEL-GOI', amount: 14200, date: '22 Apr 2026' },
                  { id: 'INV-2026-093', item: 'The Hosteller Heritage Quinta', amount: 11400, date: '25 Apr 2026' },
                ].map((inv) => (
                  <div key={inv.id} className="p-4 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-terracotta" />
                      <div>
                        <span className="font-semibold text-[#1C1410] block">{inv.item}</span>
                        <span className="text-[10px] text-[#8A7B75] font-mono">{inv.id} • {inv.date}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono font-bold text-[#1C1410]">₹{inv.amount.toLocaleString()}</span>
                      <button
                        type="button"
                        onClick={() => triggerToast(`Downloading Official Tax Invoice ${inv.id}...`)}
                        className="px-2.5 py-1 rounded border border-[#33231E]/20 text-[11px] hover:bg-[#33231E]/5 cursor-pointer"
                      >
                        PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Refunds Tab */}
          {activeTab === 'refunds' && (
            <div className="p-12 text-center bg-[#FFF9F3] border border-[#33231E]/15 rounded-2xl space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="font-display text-base font-semibold text-[#1C1410]">No Pending Refunds</h4>
              <p className="text-xs text-[#8A7B75] max-w-sm mx-auto">
                All booking modifications and cancellations have zero pending ledger balances.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Saved Cards & Payment Summary (~34%) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Saved Payment Methods */}
          <div className="bg-[#FFF9F3] border border-[#33231E]/15 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#33231E]/10 pb-3">
              <h3 className="font-display text-base font-semibold text-[#1C1410]">
                Payment Methods
              </h3>
              <button
                type="button"
                onClick={() => setIsAddCardOpen(true)}
                className="text-xs font-mono text-terracotta hover:underline font-semibold cursor-pointer"
              >
                + Add Card
              </button>
            </div>

            <div className="space-y-3">
              {/* Card 1: HDFC */}
              <div className="p-3.5 rounded-xl bg-[#F8F3ED] border border-[#33231E]/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-terracotta" />
                  <div>
                    <span className="text-xs font-semibold text-[#1C1410] block">HDFC Bank Visa</span>
                    <span className="text-[10px] font-mono text-[#8A7B75]">•••• 4082 • Exp 08/28</span>
                  </div>
                </div>
                <span className="text-[9px] font-mono uppercase bg-white px-2 py-0.5 rounded border border-[#33231E]/10 text-emerald-800 font-bold">
                  PRIMARY
                </span>
              </div>

              {/* Card 2: UPI */}
              <div className="p-3.5 rounded-xl bg-[#F8F3ED] border border-[#33231E]/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wallet className="w-4 h-4 text-stone-gray" />
                  <div>
                    <span className="text-xs font-semibold text-[#1C1410] block">Google Pay / UPI</span>
                    <span className="text-[10px] font-mono text-[#8A7B75]">{user?.display_name ? user.display_name.toLowerCase() : 'traveler'}@okaxis</span>
                  </div>
                </div>
                <span className="text-[9px] font-mono uppercase text-[#8A7B75]">LINKED</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsManageMethodsOpen(true)}
                className="w-full py-2 rounded-lg border border-[#33231E]/20 text-xs font-medium text-[#33231E] hover:bg-[#33231E]/5 transition-colors cursor-pointer"
              >
                Manage Payment Methods
              </button>
            </div>
          </div>

          {/* Security Reassurance */}
          <div className="p-4 rounded-2xl bg-[#F7EFE6] border border-[#33231E]/10 text-xs space-y-2">
            <div className="flex items-center gap-2 text-deep-slate font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>PCI-DSS Level 1 Encryption</span>
            </div>
            <p className="text-[#8A7B75] leading-relaxed text-[11px]">
              All card data is tokenized securely. TripPlanner never stores raw CVV or banking credentials on our application servers.
            </p>
          </div>
        </div>
      </div>

      {/* Add Card Modal */}
      {isAddCardOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsAddCardOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#FFF9F3] border border-[#33231E]/20 rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-[#33231E]/10 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-terracotta" />
                <h4 className="font-display text-base font-semibold text-[#1C1410]">Add Payment Method</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCardOpen(false)}
                className="text-[#8A7B75] hover:text-[#1C1410] text-sm"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setIsAddCardOpen(false);
                triggerToast(`Payment card ${newCardName || 'ending in ' + newCardNumber.slice(-4)} added successfully.`);
                setNewCardNumber('');
                setNewCardName('');
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="font-mono text-[10px] uppercase font-bold text-[#8A7B75] block mb-1">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Satyam Sonar"
                  value={newCardName}
                  onChange={(e) => setNewCardName(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-lg bg-[#F8F3ED] border border-[#33231E]/15 text-[#1C1410] focus:outline-none focus:border-terracotta"
                />
              </div>

              <div>
                <label className="font-mono text-[10px] uppercase font-bold text-[#8A7B75] block mb-1">
                  Card Number (Tokenized)
                </label>
                <input
                  type="text"
                  placeholder="•••• •••• •••• ••••"
                  maxLength={19}
                  value={newCardNumber}
                  onChange={(e) => setNewCardNumber(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-lg bg-[#F8F3ED] border border-[#33231E]/15 font-mono text-[#1C1410] focus:outline-none focus:border-terracotta"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-mono text-[10px] uppercase font-bold text-[#8A7B75] block mb-1">
                    Expires (MM/YY)
                  </label>
                  <input
                    type="text"
                    placeholder="12/28"
                    maxLength={5}
                    required
                    className="w-full p-2.5 rounded-lg bg-[#F8F3ED] border border-[#33231E]/15 font-mono text-[#1C1410] focus:outline-none focus:border-terracotta"
                  />
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase font-bold text-[#8A7B75] block mb-1">
                    CVV
                  </label>
                  <input
                    type="password"
                    placeholder="•••"
                    maxLength={4}
                    required
                    className="w-full p-2.5 rounded-lg bg-[#F8F3ED] border border-[#33231E]/15 font-mono text-[#1C1410] focus:outline-none focus:border-terracotta"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddCardOpen(false)}
                  className="flex-1 py-2 rounded-lg border border-[#33231E]/20 text-[#33231E] hover:bg-[#33231E]/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-terracotta text-white font-medium hover:bg-terracotta-hover transition-colors"
                >
                  Save Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Payment Methods Modal */}
      {isManageMethodsOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsManageMethodsOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#FFF9F3] border border-[#33231E]/20 rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-[#33231E]/10 pb-3">
              <h4 className="font-display text-base font-semibold text-[#1C1410]">Saved Payment Instruments</h4>
              <button
                type="button"
                onClick={() => setIsManageMethodsOpen(false)}
                className="text-[#8A7B75] hover:text-[#1C1410] text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#F8F3ED] rounded-xl border border-[#33231E]/10 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-[#1C1410] block">HDFC Bank Visa ending 4082</span>
                  <span className="text-[10px] text-[#8A7B75]">Primary settlement method • 3D Secure active</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                  DEFAULT
                </span>
              </div>

              <div className="p-3 bg-[#F8F3ED] rounded-xl border border-[#33231E]/10 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-[#1C1410] block">UPI: {user?.display_name ? user.display_name.toLowerCase() : 'traveler'}@okaxis</span>
                  <span className="text-[10px] text-[#8A7B75]">One-click approval enabled for instant bookings</span>
                </div>
                <span className="text-[10px] text-[#8A7B75] font-mono">LINKED</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsManageMethodsOpen(false)}
                className="px-4 py-2 bg-terracotta text-white rounded-lg text-xs font-medium hover:bg-terracotta-hover transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
