import type { PriceSnapshot } from '@/domains/pricing/types';

/**
 * PHASE 07 — BOOKING DOMAIN CONTRACTS
 */

export type BookingState =
  | 'DRAFT'
  | 'PENDING_INVENTORY'
  | 'INVENTORY_RESERVED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_PROCESSING'
  | 'PAYMENT_VERIFIED'
  | 'CONFIRMATION_PENDING'
  | 'CONFIRMED'
  | 'PAYMENT_FAILED'
  | 'INVENTORY_UNAVAILABLE'
  | 'SUPPLIER_REJECTED'
  | 'BOOKING_FAILED'
  | 'CANCEL_REQUESTED'
  | 'CANCELLED'
  | 'REFUND_PENDING'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED';

export interface BookingParticipant {
  id: string;
  name: string;
  email?: string;
  isPrimary: boolean;
}

export interface BookingItem {
  id: string;
  bookingId: string;
  itineraryItemId: string;
  supplierId: string;
  inventoryId: string;
  title: string;
  serviceType: string;
  quantity: number;
  unitPriceMinor: number;
  totalPriceMinor: number;
  currency: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  supplierConfirmationReference?: string;
}

export interface BookingStatusHistoryEntry {
  fromState: BookingState;
  toState: BookingState;
  actorId: string;
  actorRole: string;
  reason: string;
  timestamp: string;
}

export interface Booking {
  id: string;
  tenantId: string;
  journeyId: string;
  journeyVersion: number;
  travelerId: string;
  bookingReference: string;
  supplierReference?: string;
  state: BookingState;
  totalAmountMinor: number;
  currency: string;
  idempotencyKey: string;
  items: BookingItem[];
  participants: BookingParticipant[];
  priceSnapshotId: string;
  priceSnapshot: PriceSnapshot;
  paymentIntentId?: string;
  paymentRecordId?: string;
  statusHistory: BookingStatusHistoryEntry[];
  isLocked: boolean;
  disruptionDetected: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingRequest {
  journeyId: string;
  expectedJourneyVersion?: number;
  travelerId: string;
  tenantId?: string;
  idempotencyKey: string;
  participants: BookingParticipant[];
  actorId: string;
  actorRole: string;
}

export interface BookingCreationResult {
  success: boolean;
  booking?: Booking;
  errorCode?: string;
  errorMessage?: string;
}
