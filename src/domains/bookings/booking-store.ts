import type { Booking } from './types';

/**
 * PHASE 07 — BOOKING REPOSITORY STORE
 * Enforces optimistic concurrency (version checking) and idempotency.
 */

export class BookingStore {
  private bookings: Map<string, Booking> = new Map();
  private bookingsByIdempotency: Map<string, string> = new Map();
  private bookingsByReference: Map<string, string> = new Map();

  public save(booking: Booking, expectedVersion?: number): Booking {
    const existing = this.bookings.get(booking.id);
    if (existing) {
      if (expectedVersion !== undefined && existing.version !== expectedVersion) {
        throw new Error(
          `BOOKING_VERSION_CONFLICT: Expected booking version ${expectedVersion}, but current version is ${existing.version}.`
        );
      }
      booking.version = existing.version + 1;
    }
    booking.updatedAt = new Date().toISOString();

    const clone = structuredClone(booking);
    this.bookings.set(booking.id, clone);
    this.bookingsByIdempotency.set(booking.idempotencyKey, booking.id);
    this.bookingsByReference.set(booking.bookingReference, booking.id);

    return structuredClone(clone);
  }

  public getById(id: string): Booking | undefined {
    const b = this.bookings.get(id);
    return b ? structuredClone(b) : undefined;
  }

  public getByReference(ref: string): Booking | undefined {
    const id = this.bookingsByReference.get(ref);
    return id ? this.getById(id) : undefined;
  }

  public getByIdempotencyKey(key: string): Booking | undefined {
    const id = this.bookingsByIdempotency.get(key);
    return id ? this.getById(id) : undefined;
  }

  public getByJourneyId(journeyId: string): Booking[] {
    return Array.from(this.bookings.values())
      .filter((b) => b.journeyId === journeyId)
      .map((b) => structuredClone(b));
  }

  public getByTravelerId(travelerId: string): Booking[] {
    return Array.from(this.bookings.values())
      .filter((b) => b.travelerId === travelerId)
      .map((b) => structuredClone(b));
  }

  public getAll(): Booking[] {
    return Array.from(this.bookings.values()).map((b) => structuredClone(b));
  }
}

export const sharedBookingStore = new BookingStore();
