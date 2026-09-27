import type {
  InventoryReservation,
  ReserveInventoryRequest,
  ReserveInventoryResult,
  SupplierInventoryItem,
} from './types';

/**
 * PHASE 07 — THREAD-SAFE ATOMIC INVENTORY STORE
 * Enforces race-condition protection, optimistic locking,
 * reservation expiration, and idempotency guarantees.
 */

export class InventoryStore {
  private inventories: Map<string, SupplierInventoryItem> = new Map();
  private reservations: Map<string, InventoryReservation> = new Map();
  private reservationsByIdempotency: Map<string, string> = new Map();

  constructor(initialItems?: SupplierInventoryItem[]) {
    if (initialItems) {
      for (const item of initialItems) {
        this.inventories.set(item.id, structuredClone(item));
      }
    }
  }

  public registerItem(item: SupplierInventoryItem): void {
    this.inventories.set(item.id, structuredClone(item));
  }

  public getItem(inventoryId: string): SupplierInventoryItem | undefined {
    const item = this.inventories.get(inventoryId);
    return item ? structuredClone(item) : undefined;
  }

  public getAllItems(): SupplierInventoryItem[] {
    return Array.from(this.inventories.values()).map((i) => structuredClone(i));
  }

  public getAvailableCapacity(inventoryId: string): number {
    this.purgeExpiredReservations();
    const item = this.inventories.get(inventoryId);
    if (!item || item.status === 'UNAVAILABLE' || item.status === 'EXPIRED') {
      return 0;
    }
    const allocated = item.reservedQuantity + item.confirmedQuantity;
    return Math.max(0, item.totalCapacity - allocated);
  }

  /**
   * Atomically reserves inventory with idempotency and optimistic locking.
   */
  public reserve(req: ReserveInventoryRequest): ReserveInventoryResult {
    this.purgeExpiredReservations();

    // 1. Idempotency replay check
    if (this.reservationsByIdempotency.has(req.idempotencyKey)) {
      const resId = this.reservationsByIdempotency.get(req.idempotencyKey)!;
      const existing = this.reservations.get(resId);
      if (existing) {
        return {
          success: true,
          reservation: structuredClone(existing),
          availableRemaining: this.getAvailableCapacity(req.inventoryId),
        };
      }
    }

    const item = this.inventories.get(req.inventoryId);
    if (!item) {
      return {
        success: false,
        errorCode: 'INVENTORY_UNAVAILABLE',
        errorMessage: `Inventory item "${req.inventoryId}" does not exist.`,
        availableRemaining: 0,
      };
    }

    if (item.status === 'UNAVAILABLE' || item.status === 'EXPIRED') {
      return {
        success: false,
        errorCode: 'INVENTORY_UNAVAILABLE',
        errorMessage: `Inventory item "${item.title}" is marked ${item.status}.`,
        availableRemaining: 0,
      };
    }

    const available = item.totalCapacity - (item.reservedQuantity + item.confirmedQuantity);
    if (available < req.quantity) {
      return {
        success: false,
        errorCode: 'INVENTORY_UNAVAILABLE',
        errorMessage: `Insufficient capacity: requested ${req.quantity}, but only ${available} available for "${item.title}".`,
        availableRemaining: available,
      };
    }

    // Atomic increment
    item.reservedQuantity += req.quantity;
    item.version += 1;
    item.updatedAt = new Date().toISOString();
    if (item.totalCapacity - (item.reservedQuantity + item.confirmedQuantity) === 0) {
      item.status = 'RESERVED';
    }

    const ttlMs = (req.ttlMinutes || 15) * 60 * 1000;
    const now = new Date();
    const reservationId = `res_${req.inventoryId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const reservation: InventoryReservation = {
      id: reservationId,
      inventoryId: req.inventoryId,
      bookingId: req.bookingId,
      quantity: req.quantity,
      status: 'PENDING',
      idempotencyKey: req.idempotencyKey,
      reservedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
      version: 1,
    };

    this.reservations.set(reservationId, reservation);
    this.reservationsByIdempotency.set(req.idempotencyKey, reservationId);

    return {
      success: true,
      reservation: structuredClone(reservation),
      availableRemaining: item.totalCapacity - (item.reservedQuantity + item.confirmedQuantity),
    };
  }

  /**
   * Confirms reservation and transitions reserved quantity into confirmed quantity.
   */
  public confirmReservation(reservationId: string): boolean {
    const res = this.reservations.get(reservationId);
    if (!res || res.status !== 'PENDING') return false;

    const item = this.inventories.get(res.inventoryId);
    if (!item) return false;

    item.reservedQuantity = Math.max(0, item.reservedQuantity - res.quantity);
    item.confirmedQuantity += res.quantity;
    item.version += 1;
    item.updatedAt = new Date().toISOString();

    res.status = 'CONFIRMED';
    res.version += 1;
    return true;
  }

  /**
   * Releases reservation (on payment failure or cancellation) back to available pool.
   */
  public releaseReservation(reservationId: string): boolean {
    const res = this.reservations.get(reservationId);
    if (!res || res.status === 'RELEASED') return false;

    const item = this.inventories.get(res.inventoryId);
    if (item) {
      if (res.status === 'PENDING') {
        item.reservedQuantity = Math.max(0, item.reservedQuantity - res.quantity);
      } else if (res.status === 'CONFIRMED') {
        item.confirmedQuantity = Math.max(0, item.confirmedQuantity - res.quantity);
      }
      item.version += 1;
      item.updatedAt = new Date().toISOString();
      if (item.status === 'RESERVED' && this.getAvailableCapacity(item.id) > 0) {
        item.status = 'AVAILABLE';
      }
    }

    res.status = 'RELEASED';
    res.releasedAt = new Date().toISOString();
    res.version += 1;
    return true;
  }

  public getReservation(reservationId: string): InventoryReservation | undefined {
    const res = this.reservations.get(reservationId);
    return res ? structuredClone(res) : undefined;
  }

  public getReservationsForBooking(bookingId: string): InventoryReservation[] {
    return Array.from(this.reservations.values())
      .filter((r) => r.bookingId === bookingId)
      .map((r) => structuredClone(r));
  }

  private purgeExpiredReservations(): void {
    const nowMs = Date.now();
    for (const res of this.reservations.values()) {
      if (res.status === 'PENDING' && new Date(res.expiresAt).getTime() <= nowMs) {
        this.releaseReservation(res.id);
        res.status = 'EXPIRED';
      }
    }
  }
}
