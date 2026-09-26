/**
 * Phase 03 — Provider Selection, Caching & Deduplication Factory
 *
 * Enforces strict environment-driven provider selection:
 * - In Production (when mock/demo mode is not explicitly enabled), requires a valid
 *   Google Maps configuration or throws `MAPS_CONFIGURATION_MISSING`. Never silently
 *   fabricates routes in production.
 * - In Test / Demo / Development (when `enableMockData` or `mapsProviderMode === 'demo'`),
 *   uses the deterministic `MockLocationProvider` / `MockRoutingProvider` and tags
 *   all results with `isDemoData: true`.
 */

import type {
  LocationProvider,
  GeocodingProvider,
  RoutingProvider,
  GeoLocation,
  GeoCoordinateInput,
  RouteRequest,
  RouteResult,
  TravelTimeEstimate,
  TravelModeInput,
  RouteMatrixRequest,
  RouteMatrixResult,
  PlaceSearchOptions,
  GeoProviderId,
} from '../types';
import { env } from '../../../config/env';
import { GoogleMapsProvider } from './google-provider';
import {
  MockLocationProvider,
  MockGeocodingProvider,
  MockRoutingProvider,
} from './mock-provider';
import { GeoRequestCache, buildRouteCacheKey, geoLogger } from '../cache';
import { GeoDomainError, mapProviderErrorToDomainError } from '../geo-error';

const placeSearchCache = new GeoRequestCache<GeoLocation[]>({
  ttlMs: 5 * 60 * 1000,
  maxEntries: 150,
});
const placeDetailsCache = new GeoRequestCache<GeoLocation>({
  ttlMs: 15 * 60 * 1000,
  maxEntries: 200,
});
const routeCache = new GeoRequestCache<RouteResult>({
  ttlMs: 5 * 60 * 1000,
  maxEntries: 250,
});
const matrixCache = new GeoRequestCache<RouteMatrixResult>({
  ttlMs: 5 * 60 * 1000,
  maxEntries: 100,
});

class CachedLocationProvider implements LocationProvider {
  private readonly delegate: LocationProvider;

  constructor(delegate: LocationProvider) {
    this.delegate = delegate;
  }

  get providerId(): GeoProviderId {
    return this.delegate.providerId;
  }

  async searchPlaces(
    query: string,
    options?: PlaceSearchOptions
  ): Promise<GeoLocation[]> {
    const cleaned = (query || '').trim();
    if (!cleaned || cleaned.length > 160) {
      return [];
    }
    if (options?.signal?.aborted) {
      return [];
    }

    const key = `search:${this.providerId}:${cleaned.toLowerCase()}:${options?.countryCode || ''}:${options?.locationType || ''}`;
    const start = Date.now();

    try {
      const { data, fromCache } = await placeSearchCache.getOrFetch(key, () =>
        this.delegate.searchPlaces(cleaned, options)
      );
      geoLogger.record({
        operation: 'place_search',
        provider: this.providerId,
        status: fromCache ? 'cache_hit' : 'success',
        latencyMs: Date.now() - start,
        summary: `query="${cleaned}" count=${data.length}`,
      });
      return data;
    } catch (err) {
      const domainErr = mapProviderErrorToDomainError(err, 'location');
      geoLogger.record({
        operation: 'place_search',
        provider: this.providerId,
        status: 'error',
        latencyMs: Date.now() - start,
        errorCategory: domainErr.code,
        summary: domainErr.message,
      });
      throw domainErr;
    }
  }

  async getPlaceDetails(placeId: string): Promise<GeoLocation> {
    const cleaned = (placeId || '').trim();
    if (!cleaned) {
      throw new GeoDomainError('LOCATION_NOT_FOUND', 'Place ID is required.');
    }

    const key = `details:${this.providerId}:${cleaned}`;
    const start = Date.now();

    try {
      const { data, fromCache } = await placeDetailsCache.getOrFetch(key, () =>
        this.delegate.getPlaceDetails(cleaned)
      );
      geoLogger.record({
        operation: 'place_details',
        provider: this.providerId,
        status: fromCache ? 'cache_hit' : 'success',
        latencyMs: Date.now() - start,
        summary: `placeId="${cleaned}"`,
      });
      return data;
    } catch (err) {
      const domainErr = mapProviderErrorToDomainError(err, 'location');
      geoLogger.record({
        operation: 'place_details',
        provider: this.providerId,
        status: 'error',
        latencyMs: Date.now() - start,
        errorCategory: domainErr.code,
        summary: domainErr.message,
      });
      throw domainErr;
    }
  }
}

class CachedRoutingProvider implements RoutingProvider {
  private readonly delegate: RoutingProvider;

  constructor(delegate: RoutingProvider) {
    this.delegate = delegate;
  }

  get providerId(): GeoProviderId {
    return this.delegate.providerId;
  }

  async getRoute(request: RouteRequest): Promise<RouteResult> {
    const key = `${this.providerId}:${buildRouteCacheKey(request)}`;
    const start = Date.now();

    try {
      const { data, fromCache } = await routeCache.getOrFetch(key, () =>
        this.delegate.getRoute(request)
      );
      geoLogger.record({
        operation: 'route',
        provider: this.providerId,
        status: fromCache ? 'cache_hit' : 'success',
        latencyMs: Date.now() - start,
        summary: `${data.distanceMeters}m ${data.durationSeconds}s (${data.travelMode})`,
      });
      return data;
    } catch (err) {
      const domainErr = mapProviderErrorToDomainError(err, 'routing');
      geoLogger.record({
        operation: 'route',
        provider: this.providerId,
        status: 'error',
        latencyMs: Date.now() - start,
        errorCategory: domainErr.code,
        summary: domainErr.message,
      });
      throw domainErr;
    }
  }

  async getRouteMatrix(
    origins: Array<GeoLocation | GeoCoordinateInput>,
    destinations: Array<GeoLocation | GeoCoordinateInput>,
    mode: TravelModeInput
  ): Promise<TravelTimeEstimate[][]> {
    const result = await this.getTravelTimeMatrix({
      origins,
      destinations,
      travelMode: mode,
    });
    return result.cells.map((row) =>
      row.map((cell) => ({
        distanceMeters: cell.distanceMeters,
        durationSeconds: cell.durationSeconds,
        provider: cell.provider,
        calculatedAt: cell.calculatedAt,
        trafficAware: cell.trafficAware,
      }))
    );
  }

  async getTravelTimeMatrix(
    request: RouteMatrixRequest
  ): Promise<RouteMatrixResult> {
    const start = Date.now();
    const key = `matrix:${this.providerId}:${String(request.travelMode)}:${request.origins.length}x${request.destinations.length}:${JSON.stringify(
      request.origins
    )}->${JSON.stringify(request.destinations)}`;

    try {
      const { data, fromCache } = await matrixCache.getOrFetch(key, () =>
        this.delegate.getTravelTimeMatrix(request)
      );
      geoLogger.record({
        operation: 'route_matrix',
        provider: this.providerId,
        status: fromCache ? 'cache_hit' : 'success',
        latencyMs: Date.now() - start,
        summary: `${request.origins.length}x${request.destinations.length} matrix`,
      });
      return data;
    } catch (err) {
      const domainErr = mapProviderErrorToDomainError(err, 'routing');
      geoLogger.record({
        operation: 'route_matrix',
        provider: this.providerId,
        status: 'error',
        latencyMs: Date.now() - start,
        errorCategory: domainErr.code,
        summary: domainErr.message,
      });
      throw domainErr;
    }
  }
}

export class GeoServiceFactory {
  private static googleProviderInstance: GoogleMapsProvider | null = null;
  private static mockLocationInstance: MockLocationProvider | null = null;
  private static mockGeocodingInstance: MockGeocodingProvider | null = null;
  private static mockRoutingInstance: MockRoutingProvider | null = null;

  public static isUsingDemoProvider(): boolean {
    if (
      env.mapsProviderMode === 'mock' ||
      env.mapsProviderMode === 'demo'
    ) {
      return true;
    }
    if (env.mapsProviderMode === 'google') {
      return false;
    }
    // 'auto' mode
    if (env.isGoogleMapsConfigured) {
      return false;
    }
    if (env.isProd && !env.enableMockData) {
      return false; // Will fail explicitly rather than silently using fake data
    }
    return true;
  }

  private static assertProviderReady(): void {
    if (
      !this.isUsingDemoProvider() &&
      !env.isGoogleMapsConfigured
    ) {
      throw new GeoDomainError(
        'MAPS_CONFIGURATION_MISSING',
        'Production Google Maps credentials are missing and demo mode is disabled.'
      );
    }
  }

  static getLocationProvider(): LocationProvider {
    this.assertProviderReady();

    if (this.isUsingDemoProvider()) {
      if (!this.mockLocationInstance) {
        this.mockLocationInstance = new MockLocationProvider();
      }
      return new CachedLocationProvider(this.mockLocationInstance);
    }

    if (!this.googleProviderInstance) {
      this.googleProviderInstance = new GoogleMapsProvider();
    }
    return new CachedLocationProvider(this.googleProviderInstance);
  }

  static getGeocodingProvider(): GeocodingProvider {
    this.assertProviderReady();

    if (this.isUsingDemoProvider()) {
      if (!this.mockGeocodingInstance) {
        this.mockGeocodingInstance = new MockGeocodingProvider();
      }
      return this.mockGeocodingInstance;
    }

    if (!this.googleProviderInstance) {
      this.googleProviderInstance = new GoogleMapsProvider();
    }
    return this.googleProviderInstance;
  }

  static getRoutingProvider(): RoutingProvider {
    this.assertProviderReady();

    if (this.isUsingDemoProvider()) {
      if (!this.mockRoutingInstance) {
        this.mockRoutingInstance = new MockRoutingProvider();
      }
      return new CachedRoutingProvider(this.mockRoutingInstance);
    }

    if (!this.googleProviderInstance) {
      this.googleProviderInstance = new GoogleMapsProvider();
    }
    return new CachedRoutingProvider(this.googleProviderInstance);
  }

  static clearAllCaches(): void {
    placeSearchCache.clear();
    placeDetailsCache.clear();
    routeCache.clear();
    matrixCache.clear();
  }
}

export * from './mock-provider';
export * from './google-provider';
