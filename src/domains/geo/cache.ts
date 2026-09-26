/**
 * Phase 03 — Bounded TTL Cache, Request Deduplication & Safe Observability Logger
 *
 * Ensures usage-billed provider requests are deduplicated in flight and cached
 * with a strict time-to-live (TTL) without violating provider storage terms.
 * Never logs API keys or raw sensitive payloads.
 */

import type { GeoCoordinateInput, GeoLocation, RouteRequest } from './types';
import { validateCoordinate, normalizeTravelMode } from './normalization';
import { sanitizeLogString } from './geo-error';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  cachedAt: number;
}

export class GeoRequestCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly inFlight = new Map<string, Promise<T>>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;

  constructor(options?: { ttlMs?: number; maxEntries?: number }) {
    this.ttlMs = options?.ttlMs ?? 5 * 60 * 1000; // Default 5 minutes TTL
    this.maxEntries = options?.maxEntries ?? 250;
  }

  public get(key: string, now: number = Date.now()): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (now > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  public set(key: string, value: T, now: number = Date.now()): void {
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }
    this.store.set(key, {
      value,
      cachedAt: now,
      expiresAt: now + this.ttlMs,
    });
  }

  /**
   * Executes `fetcher` only if no valid cached value or in-flight request exists for `key`.
   */
  public async getOrFetch(
    key: string,
    fetcher: () => Promise<T>,
    now: number = Date.now()
  ): Promise<{ data: T; fromCache: boolean }> {
    const cached = this.get(key, now);
    if (cached !== undefined) {
      return { data: cached, fromCache: true };
    }

    const existingPromise = this.inFlight.get(key);
    if (existingPromise) {
      const data = await existingPromise;
      return { data, fromCache: true };
    }

    const promise = (async () => {
      try {
        const result = await fetcher();
        this.set(key, result, Date.now());
        return result;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    const data = await promise;
    return { data, fromCache: false };
  }

  public clear(): void {
    this.store.clear();
    this.inFlight.clear();
  }

  public size(): number {
    return this.store.size;
  }
}

function pointKey(point: GeoLocation | GeoCoordinateInput): string {
  try {
    const coord = validateCoordinate(point);
    return `${coord.latitude.toFixed(5)},${coord.longitude.toFixed(5)}`;
  } catch {
    if (point && typeof point === 'object' && 'id' in point && point.id) {
      return String(point.id);
    }
    return 'invalid';
  }
}

export function buildRouteCacheKey(request: RouteRequest): string {
  const mode = normalizeTravelMode(request.travelMode || request.mode || 'driving');
  const originKey = pointKey(request.origin);
  const destKey = pointKey(request.destination);
  const waypointsKey = (request.waypoints || []).map(pointKey).join('|');
  const avoidKey = (request.avoid || []).slice().sort().join(',');
  return `route:${mode}:${originKey}->${destKey}:wp(${waypointsKey}):av(${avoidKey})`;
}

export interface GeoDiagnosticEvent {
  operation: 'place_search' | 'place_details' | 'geocode' | 'route' | 'route_matrix';
  provider: string;
  status: 'success' | 'error' | 'cache_hit';
  latencyMs: number;
  errorCategory?: string;
  summary?: string;
}

const recentDiagnostics: GeoDiagnosticEvent[] = [];

export const geoLogger = {
  record(event: GeoDiagnosticEvent): void {
    const safeEvent: GeoDiagnosticEvent = {
      ...event,
      summary: event.summary ? sanitizeLogString(event.summary) : undefined,
    };
    recentDiagnostics.push(safeEvent);
    if (recentDiagnostics.length > 100) {
      recentDiagnostics.shift();
    }
  },
  getRecentEvents(): ReadonlyArray<GeoDiagnosticEvent> {
    return recentDiagnostics;
  },
};
