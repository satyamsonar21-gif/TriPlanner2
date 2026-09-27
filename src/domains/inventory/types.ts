/**
 * PHASE 07 — INVENTORY DOMAIN CONTRACTS
 * Non-negotiable: Availability must be explicit.
 * UNKNOWN is NEVER treated as AVAILABLE.
 */

export type InventoryItemType =
  | 'HOTEL'
  | 'TRANSPORT'
  | 'ACTIVITY'
  | 'TRANSFER'
  | 'GUIDE'
  | 'OTHER';

export type InventoryStatus =
  | 'AVAILABLE'
  | 'LIMITED'
  | 'RESERVED'
  | 'SOLD_OUT'
  | 'UNAVAILABLE'
  | 'EXPIRED';

export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'RELEASED'
  | 'EXPIRED';

export interface SupplierInventoryItem {
  id: string;
  supplierId: string;
  tenantId: string;
  itemType: InventoryItemType;
  title: string;
  locationName: string;
  latitude?: number;
  longitude?: number;
  totalCapacity: number;
  reservedQuantity: number;
  confirmedQuantity: number;
  unitPriceMinor: number;
  currency: string;
  status: InventoryStatus;
  version: number;
  operatingWindowStart?: string;
  operatingWindowEnd?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryReservation {
  id: string;
  inventoryId: string;
  bookingId: string;
  quantity: number;
  status: ReservationStatus;
  idempotencyKey: string;
  reservedAt: string;
  expiresAt: string;
  releasedAt?: string;
  version: number;
}

export interface ReserveInventoryRequest {
  inventoryId: string;
  bookingId: string;
  quantity: number;
  idempotencyKey: string;
  ttlMinutes?: number;
}

export interface ReserveInventoryResult {
  success: boolean;
  reservation?: InventoryReservation;
  errorCode?: 'INVENTORY_UNAVAILABLE' | 'INVENTORY_EXPIRED' | 'CONCURRENCY_CONFLICT' | 'IDEMPOTENCY_REPLAY';
  errorMessage?: string;
  availableRemaining?: number;
}
