/**
 * PHASE 07 — SUPPLIER DOMAIN CONTRACTS
 */

export type SupplierServiceType =
  | 'HOTEL'
  | 'TRANSPORT'
  | 'ACTIVITY'
  | 'TRANSFER'
  | 'GUIDE';

export type SupplierIntegrationType =
  | 'MOCK'
  | 'WEBHOOK'
  | 'REST_API'
  | 'MANUAL';

export interface SupplierCapabilities {
  supportsReservation: boolean;
  supportsCancellation: boolean;
  supportsRefund: boolean;
  supportsLiveAvailability: boolean;
}

export interface Supplier {
  id: string;
  tenantId: string;
  name: string;
  contactEmail: string;
  contactPhone?: string;
  serviceType: SupplierServiceType;
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  integrationType: SupplierIntegrationType;
  operationalTimezone: string;
  cancellationPolicyId?: string;
  capabilities: SupplierCapabilities;
  createdAt: string;
  updatedAt: string;
}

export type SupplierAllocationStatus =
  | 'REQUESTED'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'CANCELLED';

export interface SupplierAllocation {
  id: string;
  supplierId: string;
  bookingId: string;
  inventoryId: string;
  quantity: number;
  status: SupplierAllocationStatus;
  supplierConfirmationReference?: string;
  rejectionReason?: string;
  createdAt: string;
  confirmedAt?: string;
  cancelledAt?: string;
  version: number;
}
