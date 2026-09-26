/**
 * Phase 03 — Google Maps Platform Adapter
 *
 * Implements LocationProvider, GeocodingProvider, and RoutingProvider using
 * the modern Google Maps functional loader (`setOptions` / `importLibrary`).
 * All Google-specific responses are normalized into TripPlanner domain types
 * at this adapter boundary.
 */

/// <reference types="google.maps" />
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { env } from '../../../config/env';
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
  TravelMode,
  TravelModeInput,
  RouteMatrixRequest,
  RouteMatrixResult,
  RouteMatrixCell,
  PlaceSearchOptions,
} from '../types';
import {
  validateCoordinate,
  normalizeTravelMode,
  normalizeGeoLocation,
  normalizeLocationType,
} from '../normalization';
import { GeoDomainError, mapProviderErrorToDomainError } from '../geo-error';

let optionsConfigured = false;
let librariesLoadedPromise: Promise<void> | null = null;

export async function ensureGoogleMapsLoaded(): Promise<void> {
  if (!env.isGoogleMapsConfigured || !env.googleMapsBrowserKey) {
    throw new GeoDomainError(
      'MAPS_CONFIGURATION_MISSING',
      'Google Maps Browser API key (VITE_GOOGLE_MAPS_BROWSER_KEY) is not configured.'
    );
  }

  if (!optionsConfigured) {
    setOptions({
      key: env.googleMapsBrowserKey,
      v: 'weekly',
    });
    optionsConfigured = true;
  }

  if (!librariesLoadedPromise) {
    librariesLoadedPromise = (async () => {
      try {
        await Promise.all([
          importLibrary('maps'),
          importLibrary('places'),
          importLibrary('routes'),
          importLibrary('geocoding'),
        ]);
      } catch (err) {
        librariesLoadedPromise = null;
        throw mapProviderErrorToDomainError(err, 'location');
      }
    })();
  }

  return librariesLoadedPromise;
}

function extractAddressParts(
  components: google.maps.GeocoderAddressComponent[] | undefined
): {
  city: string | null;
  region: string | null;
  country: string | null;
  countryCode: string | null;
  postalCode: string | null;
} {
  let city: string | null = null;
  let region: string | null = null;
  let country: string | null = null;
  let countryCode: string | null = null;
  let postalCode: string | null = null;

  if (!components) {
    return { city, region, country, countryCode, postalCode };
  }

  for (const comp of components) {
    if (comp.types.includes('locality') || comp.types.includes('postal_town')) {
      city = comp.long_name;
    } else if (
      !city &&
      comp.types.includes('administrative_area_level_2')
    ) {
      city = comp.long_name;
    }
    if (comp.types.includes('administrative_area_level_1')) {
      region = comp.long_name;
    }
    if (comp.types.includes('country')) {
      country = comp.long_name;
      countryCode = comp.short_name || null;
    }
    if (comp.types.includes('postal_code')) {
      postalCode = comp.long_name;
    }
  }

  return { city, region, country, countryCode, postalCode };
}

export class GoogleMapsProvider
  implements LocationProvider, GeocodingProvider, RoutingProvider
{
  public readonly providerId = 'google' as const;

  private mapModeToGoogleMode(mode: TravelMode): google.maps.TravelMode {
    switch (mode) {
      case 'driving':
        return google.maps.TravelMode.DRIVING;
      case 'walking':
        return google.maps.TravelMode.WALKING;
      case 'bicycling':
        return google.maps.TravelMode.BICYCLING;
      case 'transit':
        return google.maps.TravelMode.TRANSIT;
    }
  }

  async searchPlaces(
    query: string,
    options?: PlaceSearchOptions
  ): Promise<GeoLocation[]> {
    const cleaned = (query || '').trim();
    if (!cleaned || options?.signal?.aborted) {
      return [];
    }

    await ensureGoogleMapsLoaded();

    return new Promise((resolve, reject) => {
      const service = new google.maps.places.AutocompleteService();
      service.getPlacePredictions(
        {
          input: cleaned,
          componentRestrictions: options?.countryCode
            ? { country: options.countryCode.toLowerCase() }
            : undefined,
        },
        (predictions, status) => {
          if (options?.signal?.aborted) {
            return resolve([]);
          }

          if (
            status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS ||
            !predictions
          ) {
            return resolve([]);
          }

          if (status !== google.maps.places.PlacesServiceStatus.OK) {
            return reject(mapProviderErrorToDomainError(String(status), 'location'));
          }

          const limit = options?.limit ?? 6;
          const results: GeoLocation[] = predictions.slice(0, limit).map((p) => {
            const secondary = p.structured_formatting.secondary_text || '';
            const secondaryParts = secondary.split(',').map((s) => s.trim());
            const country =
              secondaryParts.length > 0
                ? secondaryParts[secondaryParts.length - 1]
                : null;
            const region =
              secondaryParts.length > 1
                ? secondaryParts[secondaryParts.length - 2]
                : null;

            return normalizeGeoLocation({
              id: p.place_id,
              name: p.structured_formatting.main_text || p.description,
              latitude: 0,
              longitude: 0,
              address: p.description,
              formattedAddress: p.description,
              city: p.structured_formatting.main_text || null,
              region,
              country,
              provider: 'google',
              providerPlaceId: p.place_id,
              locationType: normalizeLocationType(p.types?.[0]),
              isDemoFixture: false,
              metadata: { needsCoordinateResolution: true },
            });
          });

          resolve(results);
        }
      );
    });
  }

  async getPlaceDetails(placeId: string): Promise<GeoLocation> {
    const cleaned = (placeId || '').trim();
    if (!cleaned) {
      throw new GeoDomainError('LOCATION_NOT_FOUND', 'Place ID is empty.');
    }

    await ensureGoogleMapsLoaded();

    return new Promise((resolve, reject) => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ placeId: cleaned }, (results, status) => {
        if (
          status === google.maps.GeocoderStatus.OK &&
          results &&
          results.length > 0
        ) {
          const res = results[0];
          const parts = extractAddressParts(res.address_components);
          const lat = res.geometry.location.lat();
          const lng = res.geometry.location.lng();

          resolve(
            normalizeGeoLocation({
              id: res.place_id,
              name:
                parts.city ||
                res.address_components?.[0]?.long_name ||
                res.formatted_address,
              latitude: lat,
              longitude: lng,
              address: res.formatted_address,
              formattedAddress: res.formatted_address,
              city: parts.city,
              region: parts.region,
              country: parts.country,
              countryCode: parts.countryCode,
              postalCode: parts.postalCode,
              provider: 'google',
              providerPlaceId: res.place_id,
              locationType: normalizeLocationType(res.types?.[0]),
              isDemoFixture: false,
            })
          );
        } else {
          reject(mapProviderErrorToDomainError(String(status), 'location'));
        }
      });
    });
  }

  async geocode(address: string): Promise<GeoLocation[]> {
    const cleaned = (address || '').trim();
    if (!cleaned) return [];

    await ensureGoogleMapsLoaded();

    return new Promise((resolve, reject) => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: cleaned }, (results, status) => {
        if (
          status === google.maps.GeocoderStatus.ZERO_RESULTS ||
          !results
        ) {
          return resolve([]);
        }
        if (status !== google.maps.GeocoderStatus.OK) {
          return reject(mapProviderErrorToDomainError(String(status), 'location'));
        }

        resolve(
          results.map((res) => {
            const parts = extractAddressParts(res.address_components);
            return normalizeGeoLocation({
              id: res.place_id,
              name:
                parts.city ||
                res.address_components?.[0]?.long_name ||
                res.formatted_address,
              latitude: res.geometry.location.lat(),
              longitude: res.geometry.location.lng(),
              address: res.formatted_address,
              formattedAddress: res.formatted_address,
              city: parts.city,
              region: parts.region,
              country: parts.country,
              countryCode: parts.countryCode,
              postalCode: parts.postalCode,
              provider: 'google',
              providerPlaceId: res.place_id,
              locationType: normalizeLocationType(res.types?.[0]),
              isDemoFixture: false,
            });
          })
        );
      });
    });
  }

  async reverseGeocode(coordinate: GeoCoordinateInput): Promise<GeoLocation[]> {
    const valid = validateCoordinate(coordinate);
    await ensureGoogleMapsLoaded();

    return new Promise((resolve, reject) => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode(
        { location: { lat: valid.lat, lng: valid.lng } },
        (results, status) => {
          if (
            status === google.maps.GeocoderStatus.ZERO_RESULTS ||
            !results
          ) {
            return resolve([]);
          }
          if (status !== google.maps.GeocoderStatus.OK) {
            return reject(mapProviderErrorToDomainError(String(status), 'location'));
          }

          resolve(
            results.map((res) => {
              const parts = extractAddressParts(res.address_components);
              return normalizeGeoLocation({
                id: res.place_id,
                name:
                  parts.city ||
                  res.address_components?.[0]?.long_name ||
                  res.formatted_address,
                latitude: res.geometry.location.lat(),
                longitude: res.geometry.location.lng(),
                address: res.formatted_address,
                formattedAddress: res.formatted_address,
                city: parts.city,
                region: parts.region,
                country: parts.country,
                countryCode: parts.countryCode,
                postalCode: parts.postalCode,
                provider: 'google',
                providerPlaceId: res.place_id,
                locationType: normalizeLocationType(res.types?.[0]),
                isDemoFixture: false,
              });
            })
          );
        }
      );
    });
  }

  async getRoute(request: RouteRequest): Promise<RouteResult> {
    const mode = normalizeTravelMode(
      request.travelMode ?? request.mode ?? 'driving'
    );
    const originCoord = validateCoordinate(request.origin);
    const destCoord = validateCoordinate(request.destination);

    await ensureGoogleMapsLoaded();

    return new Promise((resolve, reject) => {
      const directionsService = new google.maps.DirectionsService();
      const waypoints: google.maps.DirectionsWaypoint[] = (
        request.waypoints || []
      ).map((wp) => {
        const c = validateCoordinate(wp);
        return {
          location: { lat: c.lat, lng: c.lng },
          stopover: true,
        };
      });

      const depDate =
        request.departureTime instanceof Date
          ? request.departureTime
          : typeof request.departureTime === 'string'
          ? new Date(request.departureTime)
          : undefined;

      directionsService.route(
        {
          origin: { lat: originCoord.lat, lng: originCoord.lng },
          destination: { lat: destCoord.lat, lng: destCoord.lng },
          waypoints: waypoints.length > 0 ? waypoints : undefined,
          travelMode: this.mapModeToGoogleMode(mode),
          avoidTolls: request.avoid?.includes('tolls'),
          avoidHighways: request.avoid?.includes('highways'),
          avoidFerries: request.avoid?.includes('ferries'),
          drivingOptions:
            depDate && !Number.isNaN(depDate.getTime())
              ? {
                  departureTime: depDate,
                  trafficModel: google.maps.TrafficModel.BEST_GUESS,
                }
              : undefined,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            const route = result.routes[0];
            const legs: RouteLeg[] = (route.legs || []).map((leg) => ({
              origin: validateCoordinate({
                lat: leg.start_location.lat(),
                lng: leg.start_location.lng(),
              }),
              destination: validateCoordinate({
                lat: leg.end_location.lat(),
                lng: leg.end_location.lng(),
              }),
              originName: leg.start_address,
              destinationName: leg.end_address,
              distanceMeters: leg.distance?.value || 0,
              durationSeconds:
                leg.duration_in_traffic?.value || leg.duration?.value || 0,
              travelMode: mode,
            }));

            const totalDistanceMeters = legs.reduce(
              (sum, l) => sum + l.distanceMeters,
              0
            );
            const totalDurationSeconds = legs.reduce(
              (sum, l) => sum + l.durationSeconds,
              0
            );
            const calculatedAt = new Date().toISOString();

            resolve({
              distanceMeters: totalDistanceMeters,
              durationSeconds: totalDurationSeconds,
              travelMode: mode,
              origin: originCoord,
              destination: destCoord,
              polyline: route.overview_polyline || null,
              legs,
              provider: 'google',
              calculatedAt,
              isDemoData: false,
              status: 'OK',
              request,
              estimate: {
                distanceMeters: totalDistanceMeters,
                durationSeconds: totalDurationSeconds,
                provider: 'google',
                calculatedAt,
                trafficAware: Boolean(depDate && mode === 'driving'),
              },
            });
          } else {
            reject(mapProviderErrorToDomainError(String(status), 'routing'));
          }
        }
      );
    });
  }

  async getRouteMatrix(
    origins: Array<GeoLocation | GeoCoordinateInput>,
    destinations: Array<GeoLocation | GeoCoordinateInput>,
    mode: TravelModeInput
  ): Promise<TravelTimeEstimate[][]> {
    const matrix = await this.getTravelTimeMatrix({
      origins,
      destinations,
      travelMode: mode,
    });

    return matrix.cells.map((row) =>
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
    const originCoords = request.origins.map((o) => validateCoordinate(o));
    const destCoords = request.destinations.map((d) => validateCoordinate(d));

    await ensureGoogleMapsLoaded();

    return new Promise((resolve, reject) => {
      const service = new google.maps.DistanceMatrixService();
      const calculatedAt = new Date().toISOString();

      service.getDistanceMatrix(
        {
          origins: originCoords.map((c) => ({ lat: c.lat, lng: c.lng })),
          destinations: destCoords.map((c) => ({ lat: c.lat, lng: c.lng })),
          travelMode: this.mapModeToGoogleMode(mode),
        },
        (response, status) => {
          if (status === google.maps.DistanceMatrixStatus.OK && response) {
            const cells: RouteMatrixCell[][] = [];
            for (let i = 0; i < response.rows.length; i++) {
              const row: RouteMatrixCell[] = [];
              for (let j = 0; j < response.rows[i].elements.length; j++) {
                const element = response.rows[i].elements[j];
                const ok =
                  element.status === google.maps.DistanceMatrixElementStatus.OK;
                const durationSeconds = ok ? element.duration?.value || 0 : 0;
                const distanceMeters = ok ? element.distance?.value || 0 : 0;

                row.push({
                  originIndex: i,
                  destinationIndex: j,
                  originName: response.originAddresses?.[i],
                  destinationName: response.destinationAddresses?.[j],
                  distanceMeters,
                  durationSeconds,
                  durationMinutes:
                    durationSeconds === 0
                      ? 0
                      : Math.max(1, Math.round(durationSeconds / 60)),
                  travelMode: mode,
                  provider: 'google',
                  calculatedAt,
                  trafficAware: false,
                  status: ok ? 'OK' : 'NOT_FOUND',
                });
              }
              cells.push(row);
            }

            resolve({
              cells,
              travelMode: mode,
              provider: 'google',
              calculatedAt,
              isDemoData: false,
            });
          } else {
            reject(mapProviderErrorToDomainError(String(status), 'routing'));
          }
        }
      );
    });
  }
}
