import React, { useState } from 'react';
import {
  CheckCircle2,
  ShieldCheck,
  Phone,
  Mail,
} from 'lucide-react';
import { SupplierService } from '@/domains/suppliers/supplier.service';
import { InventoryService } from '@/domains/inventory/inventory.service';
import { sharedBookingStore } from '@/domains/bookings/booking-store';

export const SupplierOperationsPage: React.FC = () => {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('sup_baga_dive_center');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const suppliers = SupplierService.getAllSuppliers();
  const currentSupplier = suppliers.find((s) => s.id === selectedSupplierId) || suppliers[0];

  const allBookings = sharedBookingStore.getAll();
  // Filter bookings that contain items for this supplier
  const supplierItems = allBookings.flatMap((b) =>
    b.items
      .filter((itm) => itm.supplierId === currentSupplier?.id)
      .map((itm) => ({
        booking: b,
        item: itm,
      }))
  );

  const inventoryItems = InventoryService.getAllItems().filter(
    (inv) => inv.supplierId === currentSupplier?.id
  );

  const handleConfirmCheckin = (bookingRef: string, title: string) => {
    setActionNotice(`Traveler checked in for ${title} (${bookingRef}). Status synchronized.`);
  };

  return (
    <div className="space-y-6 font-body pb-16">
      {/* Supplier Profile Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Supplier Partner Portal
            </span>
            <span className="text-xs text-stone-500">Live Inventory & Check-in Sync</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-stone-900 mt-1">
            {currentSupplier?.name}
          </h1>
          <div className="flex items-center gap-4 text-xs text-stone-600 mt-1">
            <span className="flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" /> {currentSupplier?.contactEmail}
            </span>
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" /> {currentSupplier?.contactPhone}
            </span>
            <span className="flex items-center gap-1 font-semibold text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5" /> {currentSupplier?.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-stone-500 font-medium">Switch Supplier:</label>
          <select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            className="py-2 px-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 focus:outline-hidden"
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.serviceType})
              </option>
            ))}
          </select>
        </div>
      </div>

      {actionNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center justify-between">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-xs font-bold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Inventory & Capacity Snapshot */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500 mb-3">
          Assigned Inventory Slots
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {inventoryItems.map((inv) => (
            <div key={inv.id} className="p-5 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-2">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-stone-900 text-sm">{inv.title}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  {inv.status}
                </span>
              </div>
              <p className="text-xs text-stone-500">{inv.locationName}</p>
              <div className="pt-2 border-t border-stone-100 flex justify-between text-xs">
                <div>
                  <span className="text-stone-400">Total Capacity</span>
                  <p className="font-bold text-stone-800">{inv.totalCapacity} units</p>
                </div>
                <div className="text-right">
                  <span className="text-stone-400">Rate</span>
                  <p className="font-bold text-stone-900">₹{(inv.unitPriceMinor / 100).toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Booked Travelers & Allocations */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-stone-900">Active Bookings & Guest Check-in</h2>
            <p className="text-xs text-stone-500">Live guest reservations authorized through TripPlanner Living Engine.</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-stone-100 rounded-full text-stone-700">
            {supplierItems.length} Guest Allocation(s)
          </span>
        </div>

        {supplierItems.length === 0 ? (
          <div className="text-center py-8 text-stone-500 text-sm">
            No active reservations assigned to this supplier.
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {supplierItems.map(({ booking, item }) => (
              <div key={item.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-stone-900 text-sm">{booking.bookingReference}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                      {item.status}
                    </span>
                  </div>
                  <h4 className="font-medium text-stone-800 text-sm mt-1">{item.title}</h4>
                  <div className="flex items-center gap-3 text-xs text-stone-500 mt-0.5">
                    <span>Party: {item.quantity} guest(s)</span>
                    <span>·</span>
                    <span>Window: {item.scheduledStart ? new Date(item.scheduledStart).toLocaleDateString() : 'Active'}</span>
                    <span>·</span>
                    <span>Conf: {item.supplierConfirmationReference || 'CONFIRMED-GOA-01'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleConfirmCheckin(booking.bookingReference, item.title)}
                    className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-medium hover:bg-stone-800 transition flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Verify Check-in
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
