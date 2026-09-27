import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Sparkles,
} from 'lucide-react';
import { sharedBookingStore } from '@/domains/bookings/booking-store';
import { BookingService } from '@/domains/bookings/booking.service';
import { sharedJourneyBookingCoordinator } from '@/domains/bookings/journey-booking-coordinator';
import type { Booking } from '@/domains/bookings/types';
import { InventoryService } from '@/domains/inventory/inventory.service';
import { SupplierService } from '@/domains/suppliers/supplier.service';
import { sharedAiToolRegistry } from '@/domains/ai/tool-registry';

export const OperatorBookingCenterPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [filterState, setFilterState] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'bookings' | 'inventory' | 'disruptions'>('bookings');
  const [disruptionResolving, setDisruptionResolving] = useState<boolean>(false);
  const [disruptionPackage, setDisruptionPackage] = useState<any | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const loadData = () => {
    // Ensure default Goa demo booking exists for showcase
    const existing = sharedBookingStore.getAll();
    if (existing.length === 0) {
      void (async () => {
        const res = await BookingService.createBookingIntent({
          journeyId: 'jrn_goa_01',
          travelerId: 'usr_traveler_01',
          expectedJourneyVersion: 18,
          idempotencyKey: 'idem_init_goa_ops_center',
          participants: [
            { id: 'usr_traveler_01', name: 'Aarav Patel', isPrimary: true },
            { id: 'usr_traveler_02', name: 'Diya Sharma', isPrimary: false },
          ],
          actorId: 'usr_operator_01',
          actorRole: 'operator',
        });
        if (res.success && res.booking) {
          await BookingService.verifyAndConfirmBooking({
            bookingId: res.booking.id,
            actorId: 'usr_operator_01',
            actorRole: 'operator',
          });
        }
        setBookings(sharedBookingStore.getAll());
      })();
    } else {
      setBookings(existing);
      if (!selectedBooking && existing.length > 0) {
        setSelectedBooking(existing[0]);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const inventoryItems = InventoryService.getAllItems();
  const suppliers = SupplierService.getAllSuppliers();

  const handleSimulateDisruption = async () => {
    setDisruptionResolving(true);
    setNotification('Simulating supplier cancellation for Baga Reef Scuba Diving...');
    try {
      const result = await sharedJourneyBookingCoordinator.handleSupplierDisruption({
        journeyId: 'jrn_goa_01',
        disruptedItemId: 'itm_goa_03_scuba',
        supplierId: 'sup_baga_dive_center',
        disruptionReason: 'High swell warning & marine safety advisory at Baga Reef',
        actorId: 'usr_operator_01',
        actorRole: 'operator',
      });
      setDisruptionPackage(result);
      setNotification('Disruption analyzed: Mandovi Kayaking proposed with ₹1,700 refund delta.');
      loadData();
    } catch (err: unknown) {
      setNotification(`Disruption error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDisruptionResolving(false);
    }
  };

  const handleApproveReplacement = async () => {
    if (!disruptionPackage) return;
    setDisruptionResolving(true);
    try {
      const res = await sharedJourneyBookingCoordinator.resolveDisruptionWithAlternative({
        changeRequestId: disruptionPackage.changeRequest.id,
        bookingId: disruptionPackage.bookingId,
        alternativeId: disruptionPackage.bestAlternative.id,
        actorId: 'usr_operator_01',
        actorRole: 'operator',
      });
      if (res.success) {
        setNotification(
          `Success: Replaced with ${disruptionPackage.bestAlternative.candidate.title}! Journey advanced to v${res.journeySnapshot?.version}. Refund: ₹1,700 issued.`
        );
        setDisruptionPackage(null);
        loadData();
      }
    } catch (err: unknown) {
      setNotification(`Failed to apply: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDisruptionResolving(false);
    }
  };

  const handleFetchAiExplanation = async () => {
    try {
      const toolRes = await sharedAiToolRegistry.executeTool(
        {
          toolName: 'explain_booking_change',
          arguments: { journeyId: 'jrn_goa_01' },
        },
        {
          sessionActor: {
            actorId: 'usr_operator_01',
            actorRole: 'operator',
            actorOrganizationId: 'org_goa_ops_01',
          },
          requestId: `req_${Date.now()}`,
          correlationId: `corr_${Date.now()}`,
        }
      );
      setAiExplanation(toolRes.output?.summary || 'Grounded explanation generated.');
    } catch {
      setAiExplanation('Could not load AI explanation.');
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (filterState !== 'ALL' && b.state !== filterState) return false;
    if (
      searchQuery &&
      !b.bookingReference.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !b.journeyId.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 font-body pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Phase 07 Operational Center
            </span>
            <span className="text-xs text-stone-500">Living Journey Engine Integrated</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-stone-900 mt-1">
            Booking, Payment & Supplier Inventory Operations
          </h1>
          <p className="text-sm text-stone-600 mt-0.5">
            Real-time financial reconciliation, optimistic version locks, and supplier capacity management.
          </p>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSimulateDisruption}
            disabled={disruptionResolving}
            className="px-4 py-2 text-sm font-medium text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-xl transition flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            Simulate Scuba Disruption
          </button>
          <button
            onClick={handleFetchAiExplanation}
            className="px-4 py-2 text-sm font-medium text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            AI Explain Change
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center justify-between">
          <span>{notification}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-semibold text-emerald-900 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Disruption Active Alert Card */}
      {disruptionPackage && (
        <div className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500 text-white rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-amber-950 text-lg">
                  Supplier Disruption Detected: {disruptionPackage.disruptedItem.title}
                </h3>
                <p className="text-xs text-amber-800 mt-0.5">
                  Original booking paid: ₹{(disruptionPackage.originalPaidMinor / 100).toLocaleString('en-IN')}.
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold bg-amber-200 text-amber-900 px-3 py-1 rounded-full">
              Action Required
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-white/80 p-4 rounded-xl border border-amber-200">
              <span className="text-xs text-stone-500 uppercase font-semibold">Deterministic Replacement</span>
              <p className="font-medium text-stone-900 mt-1">{disruptionPackage.bestAlternative.candidate.title}</p>
              <span className="text-xs text-stone-600">Category: {disruptionPackage.bestAlternative.candidate.category}</span>
            </div>
            <div className="bg-white/80 p-4 rounded-xl border border-amber-200">
              <span className="text-xs text-stone-500 uppercase font-semibold">Replacement Cost</span>
              <p className="font-medium text-stone-900 mt-1">₹{(disruptionPackage.replacementPriceMinor / 100).toLocaleString('en-IN')}</p>
              <span className="text-xs text-emerald-700 font-semibold">Lower cost alternative</span>
            </div>
            <div className="bg-white/80 p-4 rounded-xl border border-amber-200">
              <span className="text-xs text-stone-500 uppercase font-semibold">Traveler Refund Owed</span>
              <p className="font-bold text-emerald-800 text-lg mt-1">
                +₹{(disruptionPackage.refundOwedMinor / 100).toLocaleString('en-IN')}
              </p>
              <span className="text-xs text-stone-500">100% Policy Protection</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setDisruptionPackage(null)}
              className="px-4 py-2 text-sm text-stone-600 hover:text-stone-900"
            >
              Cancel
            </button>
            <button
              onClick={handleApproveReplacement}
              disabled={disruptionResolving}
              className="px-5 py-2.5 bg-stone-900 text-white font-medium text-sm rounded-xl hover:bg-stone-800 flex items-center gap-2 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Approve & Advance Journey to v19
            </button>
          </div>
        </div>
      )}

      {aiExplanation && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-950 text-sm flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-xs uppercase tracking-wider text-indigo-700">AI Grounded Explanation</span>
            <p>{aiExplanation}</p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-stone-200 gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('bookings')}
          className={`pb-3 transition ${
            activeTab === 'bookings'
              ? 'border-b-2 border-stone-900 text-stone-900 font-semibold'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          Active Bookings ({bookings.length})
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 transition ${
            activeTab === 'inventory'
              ? 'border-b-2 border-stone-900 text-stone-900 font-semibold'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          Live Supplier Inventory ({inventoryItems.length})
        </button>
        <button
          onClick={() => setActiveTab('disruptions')}
          className={`pb-3 transition ${
            activeTab === 'disruptions'
              ? 'border-b-2 border-stone-900 text-stone-900 font-semibold'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          Suppliers Directory ({suppliers.length})
        </button>
      </div>

      {activeTab === 'bookings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Bookings List */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search by booking reference or journey ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-stone-400"
                />
              </div>
              <select
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
                className="py-2 px-3 bg-white border border-stone-200 rounded-xl text-sm text-stone-700 focus:outline-hidden"
              >
                <option value="ALL">All States</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="PAYMENT_PENDING">PAYMENT_PENDING</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="REFUNDED">REFUNDED</option>
              </select>
            </div>

            <div className="space-y-3">
              {filteredBookings.map((b) => (
                <div
                  key={b.id}
                  onClick={() => setSelectedBooking(b)}
                  className={`p-5 rounded-2xl border transition cursor-pointer ${
                    selectedBooking?.id === b.id
                      ? 'bg-stone-50 border-stone-900 shadow-xs'
                      : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-stone-900">{b.bookingReference}</span>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                            b.state === 'CONFIRMED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : b.state === 'PAYMENT_PENDING'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {b.state}
                        </span>
                        {b.disruptionDetected && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Disrupted
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 mt-1">
                        Journey: <span className="font-mono">{b.journeyId}</span> (v{b.journeyVersion}) · Version {b.version}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-bold text-stone-900">
                        ₹{(b.totalAmountMinor / 100).toLocaleString('en-IN')}
                      </span>
                      <p className="text-xs text-stone-500">{b.items.length} items</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-stone-200/60 flex items-center justify-between text-xs text-stone-600">
                    <span>Traveler: {b.participants[0]?.name || b.travelerId}</span>
                    <span>Created {new Date(b.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Detailed Inspector */}
          <div className="lg:col-span-5">
            {selectedBooking ? (
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-6 sticky top-6">
                <div className="flex items-center justify-between pb-4 border-b border-stone-200">
                  <div>
                    <span className="text-xs text-stone-500 uppercase font-semibold">Booking Detail</span>
                    <h3 className="text-lg font-bold font-mono text-stone-900 mt-0.5">
                      {selectedBooking.bookingReference}
                    </h3>
                  </div>
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-semibold ${
                      selectedBooking.state === 'CONFIRMED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {selectedBooking.state}
                  </span>
                </div>

                {/* Items breakdown */}
                <div>
                  <h4 className="text-xs font-semibold text-stone-500 uppercase mb-3">Booking Line Items</h4>
                  <div className="space-y-2">
                    {selectedBooking.items.map((itm) => (
                      <div key={itm.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-xs">
                        <div className="flex justify-between font-medium text-stone-900">
                          <span>{itm.title}</span>
                          <span>₹{(itm.totalPriceMinor / 100).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-stone-500 mt-1">
                          <span>Supplier: {itm.supplierId}</span>
                          <span className="font-mono">{itm.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial Overview */}
                <div className="p-4 bg-stone-50 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>Total Amount:</span>
                    <span className="font-bold text-stone-900 text-sm">
                      ₹{(selectedBooking.totalAmountMinor / 100).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Payment Record:</span>
                    <span className="font-mono text-stone-700">{selectedBooking.paymentRecordId || 'Pending'}</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Price Snapshot:</span>
                    <span className="font-mono text-stone-700">{selectedBooking.priceSnapshotId}</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Optimistic Version:</span>
                    <span className="font-mono text-stone-700">v{selectedBooking.version}</span>
                  </div>
                </div>

                {/* Status Timeline */}
                <div>
                  <h4 className="text-xs font-semibold text-stone-500 uppercase mb-3 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Immutable Audit Timeline
                  </h4>
                  <div className="space-y-3 relative pl-4 border-l-2 border-stone-200">
                    {selectedBooking.statusHistory.map((h, idx) => (
                      <div key={idx} className="relative text-xs">
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-stone-400" />
                        <span className="font-semibold text-stone-800">{h.toState}</span>
                        <p className="text-stone-500 text-[11px] mt-0.5">{h.reason}</p>
                        <span className="text-[10px] text-stone-400">
                          {new Date(h.timestamp).toLocaleTimeString()} by {h.actorRole}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 bg-stone-50 rounded-2xl border border-stone-200 text-center text-stone-500 text-sm">
                Select a booking to view authoritative operational breakdown.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {inventoryItems.map((inv) => (
            <div key={inv.id} className="p-5 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-stone-100 text-stone-700">
                  {inv.itemType}
                </span>
                <span className="text-xs font-bold text-emerald-700">{inv.status}</span>
              </div>
              <h3 className="font-bold text-stone-900 text-sm leading-snug">{inv.title}</h3>
              <p className="text-xs text-stone-500">{inv.locationName}</p>

              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-stone-400">Capacity</span>
                  <p className="font-bold text-stone-800">
                    {inv.totalCapacity - inv.reservedQuantity - inv.confirmedQuantity} / {inv.totalCapacity} left
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-stone-400">Price</span>
                  <p className="font-bold text-stone-900">₹{(inv.unitPriceMinor / 100).toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'disruptions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suppliers.map((sup) => (
            <div key={sup.id} className="p-6 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700">
                  {sup.serviceType}
                </span>
                <span className="text-xs font-bold text-emerald-700">{sup.status}</span>
              </div>
              <h3 className="font-serif font-bold text-stone-900 text-base">{sup.name}</h3>
              <div className="text-xs text-stone-600 space-y-1">
                <p>Email: {sup.contactEmail}</p>
                <p>Phone: {sup.contactPhone}</p>
                <p>Timezone: {sup.operationalTimezone}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
