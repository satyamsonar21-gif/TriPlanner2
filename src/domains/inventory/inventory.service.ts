import { InventoryStore } from './inventory-store';
import type {
  ReserveInventoryRequest,
  ReserveInventoryResult,
  SupplierInventoryItem,
} from './types';

/**
 * PHASE 07 — INVENTORY SERVICE
 * Central coordinator for live and fixture supplier inventory.
 */

export const GOA_INVENTORY_FIXTURES: SupplierInventoryItem[] = [
  {
    id: 'inv_goa_hotel_01',
    supplierId: 'sup_seashell_resort',
    tenantId: 'org_goa_ops_01',
    itemType: 'HOTEL',
    title: 'Seashell Beach Resort Deluxe Room',
    locationName: 'Candolim Beach, North Goa',
    latitude: 15.5181,
    longitude: 73.7626,
    totalCapacity: 10,
    reservedQuantity: 0,
    confirmedQuantity: 1,
    unitPriceMinor: 1228000, // ₹12,280.00
    currency: 'INR',
    status: 'AVAILABLE',
    version: 1,
    operatingWindowStart: '2026-05-12T00:00:00Z',
    operatingWindowEnd: '2026-05-16T23:59:59Z',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inv_goa_scuba_01',
    supplierId: 'sup_baga_dive_center',
    tenantId: 'org_goa_ops_01',
    itemType: 'ACTIVITY',
    title: 'Baga Reef Coral Sanctuary Scuba Dive',
    locationName: 'Baga Beach, North Goa',
    latitude: 15.5553,
    longitude: 73.7517,
    totalCapacity: 6,
    reservedQuantity: 0,
    confirmedQuantity: 2,
    unitPriceMinor: 520000, // ₹5,200.00
    currency: 'INR',
    status: 'AVAILABLE',
    version: 1,
    operatingWindowStart: '2026-05-13T08:00:00Z',
    operatingWindowEnd: '2026-05-13T17:00:00Z',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inv_goa_kayak_01',
    supplierId: 'sup_mandovi_eco_tours',
    tenantId: 'org_goa_ops_01',
    itemType: 'ACTIVITY',
    title: 'Mandovi Mangrove Eco-Kayaking',
    locationName: 'Mandovi River Estuary, Goa',
    latitude: 15.5032,
    longitude: 73.8341,
    totalCapacity: 12,
    reservedQuantity: 0,
    confirmedQuantity: 0,
    unitPriceMinor: 350000, // ₹3,500.00
    currency: 'INR',
    status: 'AVAILABLE',
    version: 1,
    operatingWindowStart: '2026-05-13T09:00:00Z',
    operatingWindowEnd: '2026-05-13T18:00:00Z',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inv_goa_transfer_01',
    supplierId: 'sup_goa_express_cabs',
    tenantId: 'org_goa_ops_01',
    itemType: 'TRANSFER',
    title: 'Dabolim Airport AC Sedan Transfer',
    locationName: 'Dabolim Airport (GOI) to Candolim',
    latitude: 15.3808,
    longitude: 73.8314,
    totalCapacity: 20,
    reservedQuantity: 0,
    confirmedQuantity: 1,
    unitPriceMinor: 180000, // ₹1,800.00
    currency: 'INR',
    status: 'AVAILABLE',
    version: 1,
    operatingWindowStart: '2026-05-12T00:00:00Z',
    operatingWindowEnd: '2026-05-16T23:59:59Z',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const sharedInventoryStore = new InventoryStore(GOA_INVENTORY_FIXTURES);

export class InventoryService {
  public static checkAvailability(inventoryId: string, quantity = 1): boolean {
    const available = sharedInventoryStore.getAvailableCapacity(inventoryId);
    return available >= quantity;
  }

  public static reserve(req: ReserveInventoryRequest): ReserveInventoryResult {
    return sharedInventoryStore.reserve(req);
  }

  public static confirm(reservationId: string): boolean {
    return sharedInventoryStore.confirmReservation(reservationId);
  }

  public static release(reservationId: string): boolean {
    return sharedInventoryStore.releaseReservation(reservationId);
  }

  public static releaseBookingReservations(bookingId: string): number {
    const reservations = sharedInventoryStore.getReservationsForBooking(bookingId);
    let releasedCount = 0;
    for (const r of reservations) {
      if (r.status === 'PENDING' || r.status === 'CONFIRMED') {
        if (sharedInventoryStore.releaseReservation(r.id)) {
          releasedCount++;
        }
      }
    }
    return releasedCount;
  }

  public static getItem(inventoryId: string): SupplierInventoryItem | undefined {
    return sharedInventoryStore.getItem(inventoryId);
  }

  public static getAllItems(): SupplierInventoryItem[] {
    return sharedInventoryStore.getAllItems();
  }

  public static resetFixtures(): void {
    for (const fixture of GOA_INVENTORY_FIXTURES) {
      sharedInventoryStore.registerItem(fixture);
    }
  }
}
