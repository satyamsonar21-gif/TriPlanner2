/**
 * Phase 03 — Deterministic Mock / Demo Providers
 *
 * Used strictly in:
 * - automated unit, integration, and E2E tests
 * - explicit local development / demo mode when live Google Maps keys are absent
 *
 * Every location and route emitted by this provider is explicitly marked with
 * `isDemoFixture: true` / `isDemoData: true` so the UI and consumers never
 * mistake deterministic fixture data for live provider responses.
 */

import type {
  LocationProvider,
  GeocodingProvider,
  RoutingProvider,
  GeoLocation,
  GeoCoordinateInput,
  RouteRequest,
  RouteResult,
  RouteLeg,
  TravelTimeEstimate,
  TravelModeInput,
  TravelMode,
  RouteMatrixRequest,
  RouteMatrixResult,
  RouteMatrixCell,
  PlaceSearchOptions,
} from '../types';
import {
  validateCoordinate,
  normalizeTravelMode,
  normalizeGeoLocation,
  calculateHaversineDistanceMeters,
} from '../normalization';
import { GeoDomainError } from '../geo-error';

export const DEMO_LOCATION_FIXTURES: ReadonlyArray<GeoLocation> = [
  // GOA DESTINATION & ITINERARY STOPS
  normalizeGeoLocation({
    id: 'dest_goa_01',
    name: 'Goa',
    latitude: 15.2993,
    longitude: 74.124,
    formattedAddress: 'Goa, Konkan Coast, India',
    city: 'Panjim',
    region: 'Goa',
    country: 'India',
    countryCode: 'IN',
    postalCode: '403001',
    timezone: 'Asia/Kolkata',
    provider: 'mock',
    providerPlaceId: 'demo_place_goa_india',
    locationType: 'destination',
    isDemoFixture: true,
  }),
  normalizeGeoLocation({
    id: 'loc_goa_airport',
    name: 'Dabolim International Airport (GOI)',
    latitude: 15.3808,
    longitude: 73.8314,
    formattedAddress: 'Airport Rd, Dabolim, Goa 403801, India',
    city: 'Vasco da Gama',
    region: 'Goa',
    country: 'India',
    countryCode: 'IN',
    postalCode: '403801',
    timezone: 'Asia/Kolkata',
    provider: 'mock',
    providerPlaceId: 'demo_place_goa_airport',
    locationType: 'airport',
    isDemoFixture: true,
  }),
  normalizeGeoLocation({
    id: 'loc_goa_hotel_candolim',
    name: 'Seashell Beach Resort & Spa',
    latitude: 15.5181,
    longitude: 73.7626,
    formattedAddress: 'Fort Aguada Rd, Candolim, Goa 403515, India',
    city: 'Candolim',
    region: 'Goa',
    country: 'India',
    countryCode: 'IN',
    postalCode: '403515',
    timezone: 'Asia/Kolkata',
    provider: 'mock',
    providerPlaceId: 'demo_place_seashell_candolim',
    locationType: 'accommodation',
    isDemoFixture: true,
  }),
  normalizeGeoLocation({
    id: 'loc_goa_fort_aguada',
    name: 'Fort Aguada',
    latitude: 15.4924,
    longitude: 73.7737,
    formattedAddress: 'Sinquerim, Candolim, Goa 403515, India',
    city: 'Candolim',
    region: 'Goa',
    country: 'India',
    countryCode: 'IN',
    postalCode: '403515',
    timezone: 'Asia/Kolkata',
    provider: 'mock',
    providerPlaceId: 'demo_place_fort_aguada',
    locationType: 'attraction',
    isDemoFixture: true,
  }),
  normalizeGeoLocation({
    id: 'loc_goa_baga_scuba',
    name: 'Baga Reef Scuba Diving Center',
    latitude: 15.5553,
    longitude: 73.7517,
    formattedAddress: 'Baga Beach North End, Goa 403516, India',
    city: 'Baga',
    region: 'Goa',
    country: 'India',
    countryCode: 'IN',
    postalCode: '403516',
    timezone: 'Asia/Kolkata',
    provider: 'mock',
    providerPlaceId: 'demo_place_baga_scuba',
    locationType: 'activity',
    isDemoFixture: true,
  }),
  normalizeGeoLocation({
    id: 'loc_goa_mandovi_kayak',
    name: 'Mandovi Backwater Kayaking Sanctuary',
    latitude: 15.5256,
    longitude: 73.8389,
    formattedAddress: 'Chorão Island Ferry Point, Ribandar, Goa 403403, India',
    city: 'Panjim',
    region: 'Goa',
    country: 'India',
    countryCode: 'IN',
    postalCode: '403403',
    timezone: 'Asia/Kolkata',
    provider: 'mock',
    providerPlaceId: 'demo_place_mandovi_kayak',
    locationType: 'activity',
    isDemoFixture: true,
  }),
  normalizeGeoLocation({
    id: 'loc_goa_chapora_cafe',
    name: 'Chapora Cliffside Sunset Café',
    latitude: 15.6062,
    longitude: 73.7364,
    formattedAddress: 'Chapora Fort Trail, Vagator, Goa 403509, India',
    city: 'Vagator',
    region: 'Goa',
    country: 'India',
    countryCode: 'IN',
    postalCode: '403509',
    timezone: 'Asia/Kolkata',
    provider: 'mock',
    providerPlaceId: 'demo_place_chapora_cafe',
    locationType: 'restaurant',
    isDemoFixture: true,
  }),
  normalizeGeoLocation({
    id: 'loc_goa_fontainhas_cafe',
    name: 'Fontainhas Heritage Quarter & Café Bodega',
    latitude: 15.4961,
    longitude: 73.8313,
    formattedAddress: 'Rua 31 de Janeiro, Fontainhas, Panjim, Goa 403001, India',
    city: 'Panjim',
    region: 'Goa',
    country: 'India',
    countryCode: 'IN',
    postalCode: '403001',
    timezone: 'Asia/Kolkata',
    provider: 'mock',
    providerPlaceId: 'demo_place_fontainhas_cafe',
    locationType: 'attraction',
    isDemoFixture: true,
  }),
  normalizeGeoLocation({
    id: 'loc_goa_dinner_panjim',
    name: "Mum's Kitchen Portuguese Supper Club",
    latitude: 15.4909,
    longitude: 73.8278,
    formattedAddress: 'Dayanand Bandodkar Marg, Panjim, Goa 403001, India',
    city: 'Panjim',
    region: 'Goa',
    country: 'India',
    countryCode: 'IN',
    postalCode: '403001',
    timezone: 'Asia/Kolkata',
    provider: 'mock',
    providerPlaceId: 'demo_place_mums_kitchen_goa',
    locationType: 'restaurant',
    isDemoFixture: true,
  }),
  normalizeGeoLocation({
    id: 'loc_goa_spice_plantation',
    name: 'Sahakari Organic Spice Plantation',
    latitude: 15.4021,
    longitude: 74.0182,
    formattedAddress: 'Curti, Ponda, Goa 403401, India',
    city: 'Ponda',
    region: 'Goa',
    country: 'India',
    countryCode: 'IN',
    postalCode: '403401',
    timezone: 'Asia/Kolkata',
    provider: 'mock',
    providerPlaceId: 'demo_place_ponda_spice',
    locationType: 'activity',
    isDemoFixture: true,
  }),

  // OTHER CATALOG DESTINATIONS
  normalizeGeoLocation({
    id: 'dest_jaipur_01',
    name: 'Jaipur',
    latitude: 26.9124,
    longitude: 75.7873,
    formattedAddress: 'Jaipur, Rajasthan, India',
    city: 'Jaipur',
    region: 'Rajasthan',
    country: 'India',
    countryCode: 'IN',
    postalCode: '302001',
    timezone: 'Asia/Kolkata',
    provider: 'mock',
    providerPlaceId: 'demo_place_jaipur_india',
    locationType: 'destination',
    isDemoFixture: true,
  }),
  normalizeGeoLocation({
    id: 'dest_kerala_01',
    name: 'Kerala',
    latitude: 9.9312,
    longitude: 76.2673,
    formattedAddress: 'Kochi & Alleppey Backwaters, Kerala, India',
    city: 'Kochi',
    region: 'Kerala',
    country: 'India',
    countryCode: 'IN',
    postalCode: '682001',
    timezone: 'Asia/Kolkata',
    provider: 'mock',
    providerPlaceId: 'demo_place_kerala_india',
    locationType: 'destination',
    isDemoFixture: true,
  }),
  normalizeGeoLocation({
    id: 'dest_kashmir_01',
    name: 'Kashmir',
    latitude: 34.0837,
    longitude: 74.7973,
    formattedAddress: 'Srinagar & Gulmarg, Jammu and Kashmir, India',
    city: 'Srinagar',
    region: 'Jammu and Kashmir',
    country: 'India',
    countryCode: 'IN',
    postalCode: '190001',
    timezone: 'Asia/Kolkata',
    provider: 'mock',
    providerPlaceId: 'demo_place_kashmir_india',
    locationType: 'destination',
    isDemoFixture: true,
  }),
  normalizeGeoLocation({
    id: 'dest_rajasthan_01',
    name: 'Rajasthan',
    latitude: 26.2389,
    longitude: 73.0243,
    formattedAddress: 'Jodhpur & Udaipur, Rajasthan, India',
    city: 'Jodhpur',
    region: 'Rajasthan',
    country: 'India',
    countryCode: 'IN',
    postalCode: '342001',
    timezone: 'Asia/Kolkata',
    provider: 'mock',
    providerPlaceId: 'demo_place_rajasthan_india',
    locationType: 'destination',
    isDemoFixture: true,
  }),
  normalizeGeoLocation({
    id: 'dest_mumbai_01',
    name: 'Mumbai',
    latitude: 18.922,
    longitude: 72.8347,
    formattedAddress: 'Colaba & Marine Drive, Mumbai, Maharashtra, India',
    city: 'Mumbai',
    region: 'Maharashtra',
    country: 'India',
    countryCode: 'IN',
    postalCode: '400001',
    timezone: 'Asia/Kolkata',
    provider: 'mock',
    providerPlaceId: 'demo_place_mumbai_india',
    locationType: 'destination',
    isDemoFixture: true,
  }),
  normalizeGeoLocation({
    id: 'dest_istanbul_01',
    name: 'Istanbul',
    latitude: 41.0082,
    longitude: 28.9784,
    formattedAddress: 'Sultanahmet, Istanbul, Turkey',
    city: 'Istanbul',
    region: 'Marmara',
    country: 'Turkey',
    countryCode: 'TR',
    postalCode: '34122',
    timezone: 'Europe/Istanbul',
    provider: 'mock',
    providerPlaceId: 'demo_place_istanbul_turkey',
    locationType: 'destination',
    isDemoFixture: true,
  }),
  normalizeGeoLocation({
    id: 'dest_bali_01',
    name: 'Bali',
    latitude: -8.3405,
    longitude: 115.092,
    formattedAddress: 'Ubud & Uluwatu, Bali, Indonesia',
    city: 'Ubud',
    region: 'Bali',
    country: 'Indonesia',
    countryCode: 'ID',
    postalCode: '80571',
    timezone: 'Asia/Makassar',
    provider: 'mock',
    providerPlaceId: 'demo_place_bali_indonesia',
    locationType: 'destination',
    isDemoFixture: true,
  }),
  normalizeGeoLocation({
    id: 'mock-tokyo',
    name: 'Tokyo',
    latitude: 35.6762,
    longitude: 139.6503,
    formattedAddress: 'Tokyo, Japan',
    city: 'Tokyo',
    region: 'Kanto',
    country: 'Japan',
    countryCode: 'JP',
    postalCode: '100-0001',
    timezone: 'Asia/Tokyo',
    provider: 'mock',
    providerPlaceId: 'demo_place_tokyo_japan',
    locationType: 'destination',
    isDemoFixture: true,
  }),
  normalizeGeoLocation({
    id: 'mock-kyoto',
    name: 'Kyoto',
    latitude: 35.0116,
    longitude: 135.7681,
    formattedAddress: 'Kyoto, Japan',
    city: 'Kyoto',
    region: 'Kansai',
    country: 'Japan',
    countryCode: 'JP',
    postalCode: '600-8001',
    timezone: 'Asia/Kyoto',
    provider: 'mock',
    providerPlaceId: 'demo_place_kyoto_japan',
    locationType: 'destination',
    isDemoFixture: true,
  }),
  normalizeGeoLocation({
    id: 'mock-osaka',
    name: 'Osaka',
    latitude: 34.6937,
    longitude: 135.5023,
    formattedAddress: 'Osaka, Japan',
    city: 'Osaka',
    region: 'Kansai',
    country: 'Japan',
    countryCode: 'JP',
    postalCode: '530-0001',
    timezone: 'Asia/Tokyo',
    provider: 'mock',
    providerPlaceId: 'demo_place_osaka_japan',
    locationType: 'destination',
    isDemoFixture: true,
  }),
];

export class MockLocationProvider implements LocationProvider {
  public readonly providerId = 'mock' as const;

  async searchPlaces(
    query: string,
    options?: PlaceSearchOptions
  ): Promise<GeoLocation[]> {
    if (options?.signal?.aborted) {
      return [];
    }

    const cleaned = (query || '').trim().toLowerCase();
    if (!cleaned) {
      return [];
    }

    const matches = DEMO_LOCATION_FIXTURES.filter((loc) => {
      if (
        options?.countryCode &&
        loc.countryCode !== options.countryCode.toUpperCase()
      ) {
        return false;
      }
      if (options?.locationType && loc.locationType !== options.locationType) {
        return false;
      }
      return (
        loc.name.toLowerCase().includes(cleaned) ||
        loc.formattedAddress.toLowerCase().includes(cleaned) ||
        (loc.city && loc.city.toLowerCase().includes(cleaned)) ||
        (loc.region && loc.region.toLowerCase().includes(cleaned)) ||
        (loc.country && loc.country.toLowerCase().includes(cleaned))
      );
    });

    const limit = options?.limit ?? 8;
    return matches.slice(0, limit);
  }

  async getPlaceDetails(placeId: string): Promise<GeoLocation> {
    const cleaned = (placeId || '').trim();
    if (!cleaned) {
      throw new GeoDomainError('LOCATION_NOT_FOUND', 'Place ID is empty.');
    }

    const found = DEMO_LOCATION_FIXTURES.find(
      (loc) =>
        loc.id === cleaned ||
        loc.providerPlaceId === cleaned ||
        loc.name.toLowerCase() === cleaned.toLowerCase()
    );

    if (!found) {
      throw new GeoDomainError(
        'LOCATION_NOT_FOUND',
        `No fixture location found for ID: ${cleaned}`
      );
    }

    return found;
  }
}

export class MockGeocodingProvider implements GeocodingProvider {
  public readonly providerId = 'mock' as const;

  async geocode(address: string): Promise<GeoLocation[]> {
    const cleaned = (address || '').trim().toLowerCase();
    if (!cleaned) return [];

    return DEMO_LOCATION_FIXTURES.filter(
      (loc) =>
        loc.formattedAddress.toLowerCase().includes(cleaned) ||
        loc.name.toLowerCase().includes(cleaned)
    );
  }

  async reverseGeocode(coordinate: GeoCoordinateInput): Promise<GeoLocation[]> {
    const valid = validateCoordinate(coordinate);

    const sorted = [...DEMO_LOCATION_FIXTURES].sort((a, b) => {
      const distA = calculateHaversineDistanceMeters(valid, a);
      const distB = calculateHaversineDistanceMeters(valid, b);
      return distA - distB;
    });

    return sorted.slice(0, 3);
  }
}

export class MockRoutingProvider implements RoutingProvider {
  public readonly providerId = 'mock' as const;

  private getEffectiveSpeedMps(mode: TravelMode): number {
    switch (mode) {
      case 'walking':
        return 1.35; // ~4.8 km/h
      case 'bicycling':
        return 4.2; // ~15.1 km/h
      case 'transit':
        return 7.8; // ~28 km/h average with stops
      case 'driving':
      default:
        return 9.8; // ~35.3 km/h coastal/urban road average
    }
  }

  private calculateLeg(
    originInput: GeoLocation | GeoCoordinateInput,
    destInput: GeoLocation | GeoCoordinateInput,
    mode: TravelMode
  ): RouteLeg {
    const origin = validateCoordinate(originInput);
    const destination = validateCoordinate(destInput);

    const straightLineMeters = calculateHaversineDistanceMeters(origin, destination);
    // Apply deterministic 1.26x road-winding factor for non-zero distances
    const roadDistanceMeters =
      straightLineMeters === 0 ? 0 : Math.round(straightLineMeters * 1.26);

    const speedMps = this.getEffectiveSpeedMps(mode);
    const baseSeconds =
      roadDistanceMeters === 0 ? 0 : Math.max(60, Math.round(roadDistanceMeters / speedMps));

    const originName =
      originInput && typeof originInput === 'object' && 'name' in originInput
        ? originInput.name
        : undefined;
    const destinationName =
      destInput && typeof destInput === 'object' && 'name' in destInput
        ? destInput.name
        : undefined;

    return {
      origin,
      destination,
      originName,
      destinationName,
      distanceMeters: roadDistanceMeters,
      durationSeconds: baseSeconds,
      travelMode: mode,
    };
  }

  async getRoute(request: RouteRequest): Promise<RouteResult> {
    const mode = normalizeTravelMode(
      request.travelMode ?? request.mode ?? 'driving'
    );
    const originCoord = validateCoordinate(request.origin);
    const destCoord = validateCoordinate(request.destination);

    // Prevent impossible trans-continental walking/bicycling routes (> 2,500 km)
    const directMeters = calculateHaversineDistanceMeters(originCoord, destCoord);
    if (
      directMeters > 2_500_000 &&
      (mode === 'walking' || mode === 'bicycling')
    ) {
      throw new GeoDomainError(
        'ROUTE_NOT_FOUND',
        `No ${mode} route available across ${Math.round(directMeters / 1000)} km.`
      );
    }

    const stops: Array<GeoLocation | GeoCoordinateInput> = [
      request.origin,
      ...(request.waypoints || []),
      request.destination,
    ];

    const legs: RouteLeg[] = [];
    for (let i = 0; i < stops.length - 1; i++) {
      legs.push(this.calculateLeg(stops[i], stops[i + 1], mode));
    }

    const totalDistanceMeters = legs.reduce((acc, l) => acc + l.distanceMeters, 0);
    const baseDurationSeconds = legs.reduce((acc, l) => acc + l.durationSeconds, 0);
    const trafficDelaySeconds =
      mode === 'driving' && totalDistanceMeters > 0
        ? Math.round(baseDurationSeconds * 0.08)
        : 0;
    const totalDurationSeconds = baseDurationSeconds + trafficDelaySeconds;
    const calculatedAt = new Date().toISOString();

    return {
      distanceMeters: totalDistanceMeters,
      durationSeconds: totalDurationSeconds,
      travelMode: mode,
      origin: originCoord,
      destination: destCoord,
      polyline: `demo_polyline_${originCoord.lat}_${originCoord.lng}_to_${destCoord.lat}_${destCoord.lng}`,
      legs,
      provider: 'mock',
      calculatedAt,
      isDemoData: true,
      status: 'OK',
      request,
      estimate: {
        distanceMeters: totalDistanceMeters,
        durationSeconds: totalDurationSeconds,
        trafficDelaySeconds,
        provider: 'mock',
        calculatedAt,
        trafficAware: mode === 'driving',
      },
    };
  }

  async getRouteMatrix(
    origins: Array<GeoLocation | GeoCoordinateInput>,
    destinations: Array<GeoLocation | GeoCoordinateInput>,
    mode: TravelModeInput
  ): Promise<TravelTimeEstimate[][]> {
    const matrixResult = await this.getTravelTimeMatrix({
      origins,
      destinations,
      travelMode: mode,
    });

    return matrixResult.cells.map((row) =>
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
    const mode = normalizeTravelMode(request.travelMode);
    const calculatedAt = new Date().toISOString();
    const cells: RouteMatrixCell[][] = [];

    for (let i = 0; i < request.origins.length; i++) {
      const originItem = request.origins[i];
      const row: RouteMatrixCell[] = [];

      for (let j = 0; j < request.destinations.length; j++) {
        const destItem = request.destinations[j];
        const leg = this.calculateLeg(originItem, destItem, mode);
        const trafficBuffer =
          mode === 'driving' && leg.distanceMeters > 0
            ? Math.round(leg.durationSeconds * 0.08)
            : 0;
        const durationSeconds = leg.durationSeconds + trafficBuffer;

        row.push({
          originIndex: i,
          destinationIndex: j,
          originName: leg.originName,
          destinationName: leg.destinationName,
          distanceMeters: leg.distanceMeters,
          durationSeconds,
          durationMinutes:
            durationSeconds === 0 ? 0 : Math.max(1, Math.round(durationSeconds / 60)),
          travelMode: mode,
          provider: 'mock',
          calculatedAt,
          trafficAware: mode === 'driving',
          status: 'OK',
        });
      }
      cells.push(row);
    }

    return {
      cells,
      travelMode: mode,
      provider: 'mock',
      calculatedAt,
      isDemoData: true,
    };
  }
}
