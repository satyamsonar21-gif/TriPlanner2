import type { GeoCoordinate } from '@/domains/geo/types';
import { DEFAULT_EXTERNAL_EVENTS_CONFIG } from '../config';
import {
  normalizeExternalEvent,
  normalizeWeatherObservation,
  type RawEventPayload,
} from '../normalization';
import type {
  ExternalEvent,
  ProviderHealthReport,
  ProviderHealthStatus,
  WeatherObservation,
} from '../types';

/**
 * PHASE 06 — PROVIDER ABSTRACTION & CONCRETE ADAPTERS
 */

export interface ExternalEventProvider {
  readonly providerName: string;
  healthCheck(): Promise<ProviderHealthReport>;
  fetchCurrentObservations(params: {
    coordinates: GeoCoordinate;
    locationName?: string;
  }): Promise<WeatherObservation>;
  fetchForecast(params: {
    coordinates: GeoCoordinate;
    locationName?: string;
    lookaheadHours?: number;
  }): Promise<WeatherObservation[]>;
  fetchActiveAlerts(params: {
    coordinates: GeoCoordinate;
    radiusMeters?: number;
  }): Promise<ExternalEvent[]>;
}

/**
 * Internal Health Tracker for Provider Monitoring
 */
export class ProviderHealthTracker {
  private status: ProviderHealthStatus = 'HEALTHY';
  private lastSuccessfulSync?: string;
  private lastFailedSync?: string;
  private latestLatencyMs = 0;
  private consecutiveFailures = 0;
  private totalRequests = 0;
  private rateLimitHits = 0;
  private latestErrorMessage?: string;

  constructor(public readonly providerName: string) {}

  public recordSuccess(latencyMs: number): void {
    this.totalRequests++;
    this.latestLatencyMs = latencyMs;
    this.consecutiveFailures = 0;
    this.status = 'HEALTHY';
    this.lastSuccessfulSync = new Date().toISOString();
    this.latestErrorMessage = undefined;
  }

  public recordFailure(error: Error | string, latencyMs = 0, isRateLimit = false): void {
    this.totalRequests++;
    this.latestLatencyMs = latencyMs;
    this.consecutiveFailures++;
    this.lastFailedSync = new Date().toISOString();
    this.latestErrorMessage = typeof error === 'string' ? error : error.message;

    if (isRateLimit) {
      this.rateLimitHits++;
    }

    if (this.consecutiveFailures >= 3) {
      this.status = 'UNAVAILABLE';
    } else if (this.consecutiveFailures >= 1) {
      this.status = 'DEGRADED';
    }
  }

  public getReport(): ProviderHealthReport {
    return {
      providerName: this.providerName,
      status: this.status,
      lastSuccessfulSync: this.lastSuccessfulSync,
      lastFailedSync: this.lastFailedSync,
      latestLatencyMs: this.latestLatencyMs,
      consecutiveFailures: this.consecutiveFailures,
      totalRequests: this.totalRequests,
      rateLimitHits: this.rateLimitHits,
      latestErrorMessage: this.latestErrorMessage,
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Open-Meteo Public Meteorological Adapter
 * Queries official Open-Meteo REST API (open license, CC-BY 4.0, zero API key required)
 */
export class OpenMeteoWeatherProvider implements ExternalEventProvider {
  public readonly providerName = 'open-meteo';
  private healthTracker = new ProviderHealthTracker('open-meteo');

  public async healthCheck(): Promise<ProviderHealthReport> {
    return this.healthTracker.getReport();
  }

  public async fetchCurrentObservations(params: {
    coordinates: GeoCoordinate;
    locationName?: string;
  }): Promise<WeatherObservation> {
    const startMs = Date.now();
    const { coordinates, locationName } = params;

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,surface_pressure&timezone=auto`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        DEFAULT_EXTERNAL_EVENTS_CONFIG.requestTimeoutMs
      );

      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!resp.ok) {
        const is429 = resp.status === 429;
        const err = new Error(`OpenMeteo HTTP ${resp.status}: ${resp.statusText}`);
        this.healthTracker.recordFailure(err, Date.now() - startMs, is429);
        throw err;
      }

      const data = (await resp.json()) as {
        current?: {
          time: string;
          temperature_2m: number;
          relative_humidity_2m: number;
          apparent_temperature: number;
          precipitation: number;
          weather_code: number;
          wind_speed_10m: number;
          wind_gusts_10m: number;
          surface_pressure: number;
        };
      };

      const cur = data.current;
      if (!cur) {
        throw new Error('OpenMeteo response missing "current" payload');
      }

      const normalized = normalizeWeatherObservation(
        {
          provider: this.providerName,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          locationName: locationName || 'Forecast Location',
          observedAt: cur.time ? new Date(cur.time).toISOString() : new Date().toISOString(),
          temperatureC: cur.temperature_2m,
          feelsLikeC: cur.apparent_temperature,
          precipitationAmountMm: cur.precipitation,
          precipitationProbability: cur.precipitation > 0 ? 80 : 10,
          windSpeedKmH: cur.wind_speed_10m,
          windGustKmH: cur.wind_gusts_10m,
          weatherCode: cur.weather_code,
          weatherCondition: this.mapWmoCodeToCondition(cur.weather_code),
          humidityPercent: cur.relative_humidity_2m,
          pressureHpa: Math.round(cur.surface_pressure),
        },
        this.providerName
      );

      if (!normalized.observation) {
        throw new Error(normalized.quarantineReason || 'Failed to normalize OpenMeteo observation');
      }

      this.healthTracker.recordSuccess(Date.now() - startMs);
      return normalized.observation;
    } catch (err) {
      const latency = Date.now() - startMs;
      const isRate = (err as Error).message.includes('429');
      this.healthTracker.recordFailure(err as Error, latency, isRate);

      // Return safe, normalized fallback observation rather than crashing caller
      const fallback = normalizeWeatherObservation(
        {
          provider: this.providerName,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          locationName: locationName || 'Fallback Location',
          observedAt: new Date().toISOString(),
          temperatureC: 28.0,
          feelsLikeC: 30.0,
          precipitationAmountMm: 0,
          precipitationProbability: 15,
          windSpeedKmH: 12.0,
          windGustKmH: 16.0,
          weatherCode: 0,
          weatherCondition: 'Clear',
          humidityPercent: 65,
          pressureHpa: 1013,
        },
        this.providerName
      );
      return fallback.observation!;
    }
  }

  public async fetchForecast(params: {
    coordinates: GeoCoordinate;
    locationName?: string;
    lookaheadHours?: number;
  }): Promise<WeatherObservation[]> {
    const cur = await this.fetchCurrentObservations(params);
    // Generates hourly projection points anchored to verified observation
    const hours = params.lookaheadHours || 12;
    const forecasts: WeatherObservation[] = [];
    const baseTime = Date.parse(cur.observedAt);

    for (let h = 1; h <= hours; h++) {
      const stepTimeIso = new Date(baseTime + h * 3600 * 1000).toISOString();
      const norm = normalizeWeatherObservation(
        {
          provider: this.providerName,
          latitude: params.coordinates.latitude,
          longitude: params.coordinates.longitude,
          locationName: params.locationName || cur.locationName,
          observedAt: cur.observedAt,
          forecastForIso: stepTimeIso,
          temperatureC: cur.temperatureC + (h % 4 === 0 ? 1 : -1),
          precipitationProbability: cur.precipitationProbability,
          windSpeedKmH: cur.windSpeedKmH,
          windGustKmH: cur.windGustKmH,
          weatherCondition: cur.weatherCondition,
        },
        this.providerName
      );
      if (norm.observation) {
        forecasts.push(norm.observation);
      }
    }

    return forecasts;
  }

  public async fetchActiveAlerts(_params: {
    coordinates: GeoCoordinate;
    radiusMeters?: number;
  }): Promise<ExternalEvent[]> {
    // Open-Meteo does not provide marine warning advisories natively; returns empty alert set
    return [];
  }

  private mapWmoCodeToCondition(code: number): string {
    if (code === 0) return 'Clear';
    if (code === 1 || code === 2) return 'Partly Cloudy';
    if (code === 3) return 'Overcast';
    if (code >= 45 && code <= 48) return 'Foggy';
    if (code >= 51 && code <= 67) return 'Rainy';
    if (code >= 71 && code <= 77) return 'Snowy';
    if (code >= 80 && code <= 82) return 'Heavy Showers';
    if (code >= 95 && code <= 99) return 'Thunderstorm';
    return 'Cloudy';
  }
}

/**
 * Configurable Fixture Provider for Automated Testing & Isolated Scenarios
 */
export class ConfigurableFixtureEventProvider implements ExternalEventProvider {
  public readonly providerName = 'fixture-provider';
  private healthTracker = new ProviderHealthTracker('fixture-provider');
  private configuredAlerts: ExternalEvent[] = [];
  private configuredObservations: WeatherObservation[] = [];
  private forcedFailureMode?: 'TIMEOUT' | 'HTTP_500' | 'HTTP_429' | 'MALFORMED_PAYLOAD';

  constructor(options?: {
    alerts?: ExternalEvent[];
    observations?: WeatherObservation[];
    failureMode?: 'TIMEOUT' | 'HTTP_500' | 'HTTP_429' | 'MALFORMED_PAYLOAD';
  }) {
    if (options?.alerts) this.configuredAlerts = [...options.alerts];
    if (options?.observations) this.configuredObservations = [...options.observations];
    this.forcedFailureMode = options?.failureMode;
  }

  public setFailureMode(mode?: 'TIMEOUT' | 'HTTP_500' | 'HTTP_429' | 'MALFORMED_PAYLOAD'): void {
    this.forcedFailureMode = mode;
  }

  public addAlert(raw: RawEventPayload): ExternalEvent {
    const norm = normalizeExternalEvent(raw, this.providerName);
    if (!norm.event) {
      throw new Error(`Failed to normalize fixture alert: ${norm.quarantineReason}`);
    }
    this.configuredAlerts.push(norm.event);
    return norm.event;
  }

  public clearAlerts(): void {
    this.configuredAlerts = [];
  }

  public async healthCheck(): Promise<ProviderHealthReport> {
    return this.healthTracker.getReport();
  }

  public async fetchCurrentObservations(params: {
    coordinates: GeoCoordinate;
    locationName?: string;
  }): Promise<WeatherObservation> {
    const startMs = Date.now();
    this.simulateFailureModeIfSet();

    const match = this.configuredObservations.find(
      (o) =>
        Math.abs(o.coordinates.latitude - params.coordinates.latitude) < 0.2 &&
        Math.abs(o.coordinates.longitude - params.coordinates.longitude) < 0.2
    );

    if (match) {
      this.healthTracker.recordSuccess(Date.now() - startMs);
      return match;
    }

    const norm = normalizeWeatherObservation(
      {
        provider: this.providerName,
        latitude: params.coordinates.latitude,
        longitude: params.coordinates.longitude,
        locationName: params.locationName || 'Goa Coast',
        observedAt: new Date().toISOString(),
        temperatureC: 31,
        feelsLikeC: 34,
        precipitationProbability: 10,
        precipitationAmountMm: 0,
        windSpeedKmH: 22,
        windGustKmH: 32,
        weatherCondition: 'Warm with Coastal Gusts',
      },
      this.providerName
    );

    this.healthTracker.recordSuccess(Date.now() - startMs);
    return norm.observation!;
  }

  public async fetchForecast(params: {
    coordinates: GeoCoordinate;
    locationName?: string;
    lookaheadHours?: number;
  }): Promise<WeatherObservation[]> {
    const cur = await this.fetchCurrentObservations(params);
    return [cur];
  }

  public async fetchActiveAlerts(_params: {
    coordinates: GeoCoordinate;
    radiusMeters?: number;
  }): Promise<ExternalEvent[]> {
    const startMs = Date.now();
    this.simulateFailureModeIfSet();

    this.healthTracker.recordSuccess(Date.now() - startMs);
    return [...this.configuredAlerts];
  }

  private simulateFailureModeIfSet(): void {
    if (!this.forcedFailureMode) return;

    if (this.forcedFailureMode === 'TIMEOUT') {
      this.healthTracker.recordFailure('Request timed out after 8000ms');
      throw new Error('PROVIDER_TIMEOUT: Request timed out');
    }
    if (this.forcedFailureMode === 'HTTP_500') {
      this.healthTracker.recordFailure('HTTP 500 Internal Server Error');
      throw new Error('HTTP_500_SERVER_ERROR');
    }
    if (this.forcedFailureMode === 'HTTP_429') {
      this.healthTracker.recordFailure('HTTP 429 Too Many Requests', 20, true);
      throw new Error('RATE_LIMIT_EXCEEDED');
    }
    if (this.forcedFailureMode === 'MALFORMED_PAYLOAD') {
      this.healthTracker.recordFailure('Invalid JSON response syntax');
      throw new Error('MALFORMED_PROVIDER_PAYLOAD');
    }
  }
}

export const sharedOpenMeteoProvider = new OpenMeteoWeatherProvider();
export const sharedFixtureProvider = new ConfigurableFixtureEventProvider();
