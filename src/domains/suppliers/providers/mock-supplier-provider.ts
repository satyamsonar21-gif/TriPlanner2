import type {
  ISupplierProvider,
  SupplierAllocationResult,
  SupplierCancellationResult,
} from './supplier-provider.interface';
import type { SupplierAllocation, SupplierCapabilities } from '../types';

/**
 * PHASE 07 — DETERMINISTIC MOCK SUPPLIER PROVIDER
 * Clearly marked as MOCK/SANDBOX provider with configurable behavior.
 */

export class MockSupplierProvider implements ISupplierProvider {
  public readonly providerName = 'MockSupplierProvider (Sandbox)';
  public readonly capabilities: SupplierCapabilities = {
    supportsReservation: true,
    supportsCancellation: true,
    supportsRefund: true,
    supportsLiveAvailability: true,
  };

  private allocations: Map<string, SupplierAllocation> = new Map();
  private forcedFailureMode: 'SUPPLIER_REJECTED' | 'SUPPLIER_UNAVAILABLE' | 'TIMEOUT' | null = null;

  public setForcedFailureMode(mode: 'SUPPLIER_REJECTED' | 'SUPPLIER_UNAVAILABLE' | 'TIMEOUT' | null): void {
    this.forcedFailureMode = mode;
  }

  public async confirmAllocation(params: {
    allocationId: string;
    supplierId: string;
    inventoryId: string;
    bookingId: string;
    quantity: number;
  }): Promise<SupplierAllocationResult> {
    if (this.forcedFailureMode === 'TIMEOUT') {
      throw new Error('PROVIDER_TIMEOUT: Mock supplier failed to respond within SLA (8000ms)');
    }
    if (this.forcedFailureMode === 'SUPPLIER_UNAVAILABLE') {
      return {
        success: false,
        errorCode: 'SUPPLIER_UNAVAILABLE',
        errorMessage: 'Supplier service is temporarily offline for maintenance.',
      };
    }
    if (this.forcedFailureMode === 'SUPPLIER_REJECTED') {
      return {
        success: false,
        errorCode: 'SUPPLIER_REJECTED',
        errorMessage: 'Supplier rejected the allocation request: overbooked or operational stoppage.',
      };
    }

    const confRef = `SUP-CONF-${params.supplierId.slice(4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const allocation: SupplierAllocation = {
      id: params.allocationId,
      supplierId: params.supplierId,
      bookingId: params.bookingId,
      inventoryId: params.inventoryId,
      quantity: params.quantity,
      status: 'CONFIRMED',
      supplierConfirmationReference: confRef,
      createdAt: new Date().toISOString(),
      confirmedAt: new Date().toISOString(),
      version: 1,
    };

    this.allocations.set(params.allocationId, allocation);

    return {
      success: true,
      allocation: structuredClone(allocation),
      supplierConfirmationReference: confRef,
    };
  }

  public async cancelAllocation(params: {
    allocationId: string;
    supplierId: string;
    reason: string;
  }): Promise<SupplierCancellationResult> {
    const alloc = this.allocations.get(params.allocationId);
    if (alloc) {
      alloc.status = 'CANCELLED';
      alloc.cancelledAt = new Date().toISOString();
      alloc.rejectionReason = params.reason;
      alloc.version += 1;
    }

    return {
      success: true,
      allocationId: params.allocationId,
      refundEligible: true,
      penaltyFeeMinor: 0,
    };
  }

  public async getAllocationStatus(allocationId: string): Promise<SupplierAllocation | undefined> {
    const alloc = this.allocations.get(allocationId);
    return alloc ? structuredClone(alloc) : undefined;
  }
}

export const sharedMockSupplierProvider = new MockSupplierProvider();
