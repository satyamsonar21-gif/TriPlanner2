import {
  sharedMockSupplierProvider,
} from './providers/mock-supplier-provider';
import type { ISupplierProvider } from './providers/supplier-provider.interface';
import type { Supplier, SupplierAllocation } from './types';

export const GOA_SUPPLIERS: Supplier[] = [
  {
    id: 'sup_seashell_resort',
    tenantId: 'org_goa_ops_01',
    name: 'Seashell Beach Resort & Spa Hospitality Ltd',
    contactEmail: 'reservations@seashellgoa.com',
    contactPhone: '+91 832 2489000',
    serviceType: 'HOTEL',
    status: 'ACTIVE',
    integrationType: 'MOCK',
    operationalTimezone: 'Asia/Kolkata',
    capabilities: {
      supportsReservation: true,
      supportsCancellation: true,
      supportsRefund: true,
      supportsLiveAvailability: true,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sup_baga_dive_center',
    tenantId: 'org_goa_ops_01',
    name: 'Baga Reef PADI Scuba Sanctuary',
    contactEmail: 'operations@bagadivecenter.in',
    contactPhone: '+91 832 2276543',
    serviceType: 'ACTIVITY',
    status: 'ACTIVE',
    integrationType: 'MOCK',
    operationalTimezone: 'Asia/Kolkata',
    capabilities: {
      supportsReservation: true,
      supportsCancellation: true,
      supportsRefund: true,
      supportsLiveAvailability: true,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sup_mandovi_eco_tours',
    tenantId: 'org_goa_ops_01',
    name: 'Mandovi Riverine & Mangrove Eco-Ventures',
    contactEmail: 'adventures@mandoviecotours.in',
    contactPhone: '+91 832 2421111',
    serviceType: 'ACTIVITY',
    status: 'ACTIVE',
    integrationType: 'MOCK',
    operationalTimezone: 'Asia/Kolkata',
    capabilities: {
      supportsReservation: true,
      supportsCancellation: true,
      supportsRefund: true,
      supportsLiveAvailability: true,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sup_goa_express_cabs',
    tenantId: 'org_goa_ops_01',
    name: 'Goa Coast Express Premium Transfers',
    contactEmail: 'dispatch@goaexpresscabs.com',
    contactPhone: '+91 832 2514444',
    serviceType: 'TRANSFER',
    status: 'ACTIVE',
    integrationType: 'MOCK',
    operationalTimezone: 'Asia/Kolkata',
    capabilities: {
      supportsReservation: true,
      supportsCancellation: true,
      supportsRefund: true,
      supportsLiveAvailability: true,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export class SupplierService {
  private static suppliers: Map<string, Supplier> = new Map(
    GOA_SUPPLIERS.map((s) => [s.id, structuredClone(s)])
  );
  private static allocations: Map<string, SupplierAllocation> = new Map();
  private static activeProvider: ISupplierProvider = sharedMockSupplierProvider;

  public static setProvider(provider: ISupplierProvider): void {
    this.activeProvider = provider;
  }

  public static getSupplier(id: string): Supplier | undefined {
    const s = this.suppliers.get(id);
    return s ? structuredClone(s) : undefined;
  }

  public static getAllSuppliers(): Supplier[] {
    return Array.from(this.suppliers.values()).map((s) => structuredClone(s));
  }

  public static async confirmAllocation(params: {
    supplierId: string;
    inventoryId: string;
    bookingId: string;
    quantity: number;
  }) {
    const allocationId = `alloc_${params.bookingId}_${params.supplierId}_${Date.now()}`;
    const result = await this.activeProvider.confirmAllocation({
      allocationId,
      supplierId: params.supplierId,
      inventoryId: params.inventoryId,
      bookingId: params.bookingId,
      quantity: params.quantity,
    });

    if (result.success && result.allocation) {
      this.allocations.set(allocationId, result.allocation);
    }
    return result;
  }

  public static async cancelAllocation(params: {
    allocationId: string;
    supplierId: string;
    reason: string;
  }) {
    const result = await this.activeProvider.cancelAllocation(params);
    if (result.success) {
      const existing = this.allocations.get(params.allocationId);
      if (existing) {
        existing.status = 'CANCELLED';
        existing.rejectionReason = params.reason;
        existing.cancelledAt = new Date().toISOString();
        existing.version += 1;
      }
    }
    return result;
  }

  public static getAllocationsForBooking(bookingId: string): SupplierAllocation[] {
    return Array.from(this.allocations.values())
      .filter((a) => a.bookingId === bookingId)
      .map((a) => structuredClone(a));
  }
}
