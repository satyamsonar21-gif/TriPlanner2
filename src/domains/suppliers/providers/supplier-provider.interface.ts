import type { SupplierAllocation, SupplierCapabilities } from '../types';

export interface SupplierAllocationResult {
  success: boolean;
  allocation?: SupplierAllocation;
  errorCode?: 'SUPPLIER_REJECTED' | 'SUPPLIER_UNAVAILABLE' | 'TIMEOUT' | 'POLICY_VIOLATION';
  errorMessage?: string;
  supplierConfirmationReference?: string;
}

export interface SupplierCancellationResult {
  success: boolean;
  allocationId: string;
  refundEligible: boolean;
  penaltyFeeMinor?: number;
  errorMessage?: string;
}

export interface ISupplierProvider {
  readonly providerName: string;
  readonly capabilities: SupplierCapabilities;

  confirmAllocation(params: {
    allocationId: string;
    supplierId: string;
    inventoryId: string;
    bookingId: string;
    quantity: number;
  }): Promise<SupplierAllocationResult>;

  cancelAllocation(params: {
    allocationId: string;
    supplierId: string;
    reason: string;
  }): Promise<SupplierCancellationResult>;

  getAllocationStatus(allocationId: string): Promise<SupplierAllocation | undefined>;
}
