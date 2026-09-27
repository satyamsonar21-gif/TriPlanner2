import { calculateHaversineDistanceMeters } from '@/domains/geo/normalization';
import type { JourneySnapshot, JourneySnapshotItem } from '@/domains/journey-engine/types';
import type {
  ActivityWeatherSensitivity,
  ExternalEvent,
  ExternalEventJourneyImpact,
  WeatherImpactClassification,
} from './types';

/**
 * PHASE 06 — DETERMINISTIC JOURNEY RELEVANCE & SENSITIVITY ENGINE
 *
 * Evaluates whether an external event affects an active journey without
 * using AI, eliminating false positives via exact spatial, temporal,
 * and deterministic activity sensitivity rules.
 */

export class JourneyRelevanceEngine {
  /**
   * Deterministically classifies an activity's sensitivity to atmospheric/marine conditions.
   */
  public static classifyActivitySensitivity(
    item: JourneySnapshotItem
  ): ActivityWeatherSensitivity {
    const tags = (item.categoryTags || []).map((t: string) => t.toLowerCase());
    const title = item.title.toLowerCase();
    const type = item.type;

    if (
      type === 'transfer' ||
      title.includes('airport') ||
      title.includes('flight') ||
      title.includes('ferry')
    ) {
      return 'TRANSPORT_SENSITIVE';
    }

    if (
      tags.some((t: string) =>
        ['water sports', 'diving', 'scuba', 'kayaking', 'sailing', 'boat', 'marine', 'cruise'].includes(t)
      ) ||
      title.includes('scuba') ||
      title.includes('kayak') ||
      title.includes('dive') ||
      title.includes('sailing') ||
      title.includes('boat') ||
      title.includes('catamaran')
    ) {
      return 'HIGH_WATER_OR_MARINE';
    }

    if (
      tags.some((t: string) =>
        ['beaches', 'adventure', 'hiking', 'trekking', 'cycling', 'outdoor'].includes(t)
      ) ||
      title.includes('beach') ||
      title.includes('trek') ||
      title.includes('hike')
    ) {
      return 'HIGH_OUTDOOR_EXPOSURE';
    }

    if (
      tags.some((t: string) =>
        ['heritage', 'sightseeing', 'monument', 'fort', 'market', 'walking tour'].includes(t)
      ) ||
      title.includes('fort') ||
      title.includes('walk') ||
      title.includes('monument')
    ) {
      return 'MEDIUM_OUTDOOR_HERITAGE';
    }

    // Default: food, dining, museums, spa, indoor masterclasses
    return 'LOW_INDOOR';
  }

  /**
   * Evaluates spatial overlap using Phase 03 Haversine distance.
   */
  public static evaluateSpatialOverlap(
    event: ExternalEvent,
    item: JourneySnapshotItem
  ): { overlap: boolean; distanceMeters: number } {
    const itemLat = item.location?.coordinate
      ? item.location.coordinate.lat
      : item.location?.latitude;
    const itemLng = item.location?.coordinate
      ? item.location.coordinate.lng
      : item.location?.longitude;

    if (typeof itemLat !== 'number' || typeof itemLng !== 'number') {
      return { overlap: false, distanceMeters: Infinity };
    }

    const eventLat = event.latitude ?? event.coordinates?.latitude ?? 0;
    const eventLng = event.longitude ?? event.coordinates?.longitude ?? 0;

    const distanceMeters = calculateHaversineDistanceMeters(
      { latitude: eventLat, longitude: eventLng },
      { latitude: itemLat, longitude: itemLng, lat: itemLat, lng: itemLng }
    );

    const radius = event.radiusMeters || 25000;
    const overlap = distanceMeters <= radius;
    return { overlap, distanceMeters };
  }

  /**
   * Evaluates temporal overlap between event effective window and activity display window.
   */
  public static evaluateTemporalOverlap(
    event: ExternalEvent,
    item: JourneySnapshotItem
  ): boolean {
    if (!item.startTimeIso || !item.endTimeIso) {
      return false;
    }

    const effFrom = event.effectiveFrom || event.validFrom || '';
    const effUntil = event.effectiveUntil || event.validTo || '';
    const eventStart = Date.parse(effFrom);
    const eventEnd = Date.parse(effUntil);
    const itemStart = Date.parse(item.startTimeIso);
    const itemEnd = Date.parse(item.endTimeIso);

    if (isNaN(eventStart) || isNaN(eventEnd) || isNaN(itemStart) || isNaN(itemEnd)) {
      return false;
    }

    // Two intervals [A, B] and [C, D] overlap if max(A, C) < min(B, D)
    return Math.max(eventStart, itemStart) < Math.min(eventEnd, itemEnd);
  }

  /**
   * Deterministic Weather Impact Matrix:
   * Maps Category + Severity + ActivitySensitivity to Disruption Risk.
   */
  public static classifyWeatherImpact(params: {
    event: ExternalEvent;
    sensitivity: ActivityWeatherSensitivity;
    spatialOverlap: boolean;
    temporalOverlap: boolean;
  }): WeatherImpactClassification {
    const { event, sensitivity, spatialOverlap, temporalOverlap } = params;

    // Invariant: If either spatial or temporal overlap is missing, risk is strictly INFORMATIONAL
    if (!spatialOverlap || !temporalOverlap) {
      return {
        disruptionRisk: 'INFORMATIONAL',
        operationalActionRecommended: false,
        requiresApproval: false,
        reason: !spatialOverlap
          ? 'Event occurs outside activity geographic boundary.'
          : 'Event occurs outside activity scheduled time window.',
        recommendedTrigger: 'TIME_SHIFTED',
      };
    }

    const sev = (event.severity || '').toString().toUpperCase();
    const isSevere =
      sev === 'HIGH' ||
      sev === 'CRITICAL' ||
      sev === 'WARNING' ||
      sev === 'SEVERE' ||
      sev === 'EMERGENCY' ||
      sev === 'EXTREME';
    const isModerate =
      sev === 'MEDIUM' ||
      sev === 'MODERATE' ||
      sev === 'ADVISORY';

    // 1. Marine / High-Wind / Swell on Marine activities
    if (
      (event.category === 'HIGH_WIND' ||
        event.category === 'MARINE_CONDITION' ||
        event.category === 'CYCLONE' ||
        event.category === 'SEVERE_WEATHER') &&
      sensitivity === 'HIGH_WATER_OR_MARINE'
    ) {
      if (isSevere) {
        return {
          disruptionRisk: 'CRITICAL',
          operationalActionRecommended: true,
          requiresApproval: true,
          reason: `High marine/wind hazard (${event.title}) makes coastal/marine activity unsafe during active window.`,
          recommendedTrigger: 'ITEM_CANCELLED',
        };
      }
      if (isModerate) {
        return {
          disruptionRisk: 'HIGH',
          operationalActionRecommended: true,
          requiresApproval: true,
          reason: `Advisory swell or wind gust conditions (${event.title}) exceed safe marine activity thresholds.`,
          recommendedTrigger: 'ITEM_CANCELLED',
        };
      }
    }

    // 2. Heavy Rain / Thunderstorm on High Outdoor Exposure
    if (
      (event.category === 'RAIN' ||
        event.category === 'THUNDERSTORM' ||
        event.category === 'SEVERE_WEATHER' ||
        event.category === 'FLOOD') &&
      sensitivity === 'HIGH_OUTDOOR_EXPOSURE'
    ) {
      return {
        disruptionRisk: isSevere ? 'HIGH' : isModerate ? 'MEDIUM' : 'LOW',
        operationalActionRecommended: isSevere,
        requiresApproval: isSevere,
        reason: `Adverse precipitation/lightning conditions (${event.title}) disrupt unsheltered outdoor exposure.`,
        recommendedTrigger: isSevere ? 'ITEM_CANCELLED' : 'TIME_SHIFTED',
      };
    }

    // 3. Road / Transport Disruption on Transport Sensitive
    if (
      (event.category === 'ROAD_DISRUPTION' ||
        event.category === 'TRANSPORT_DISRUPTION' ||
        event.category === 'AIRPORT_DISRUPTION') &&
      sensitivity === 'TRANSPORT_SENSITIVE'
    ) {
      return {
        disruptionRisk: 'HIGH',
        operationalActionRecommended: true,
        requiresApproval: true,
        reason: `Transit infrastructure disruption (${event.title}) directly impacts transfer arrival buffer.`,
        recommendedTrigger: 'TIME_SHIFTED',
      };
    }

    // 4. Heritage / Sightseeing outdoors during rain/wind
    if (sensitivity === 'MEDIUM_OUTDOOR_HERITAGE') {
      if (isSevere) {
        return {
          disruptionRisk: 'HIGH',
          operationalActionRecommended: true,
          requiresApproval: true,
          reason: `Severe atmospheric conditions (${event.title}) make outdoor monument/fort visitation unfeasible.`,
          recommendedTrigger: 'TIME_SHIFTED',
        };
      }
      return {
        disruptionRisk: 'LOW',
        operationalActionRecommended: false,
        requiresApproval: false,
        reason: `Light or moderate conditions (${event.title}) allow outdoor visitation with rain gear.`,
        recommendedTrigger: 'TIME_SHIFTED',
      };
    }

    // 5. Indoor dining, museums, spa (LOW_INDOOR)
    if (sensitivity === 'LOW_INDOOR') {
      return {
        disruptionRisk: 'INFORMATIONAL',
        operationalActionRecommended: false,
        requiresApproval: false,
        reason: `Activity is indoor-sheltered. Atmospheric conditions (${event.title}) do not affect experience.`,
        recommendedTrigger: 'TIME_SHIFTED',
      };
    }

    return {
      disruptionRisk: 'INFORMATIONAL',
      operationalActionRecommended: false,
      requiresApproval: false,
      reason: `Condition monitored (${event.title}). No operational action required.`,
      recommendedTrigger: 'TIME_SHIFTED',
    };
  }

  /**
   * Evaluates all items in a journey against an external event and returns
   * impact records for every affected item.
   */
  public static evaluateJourneyEventImpacts(params: {
    event: ExternalEvent;
    snapshot: JourneySnapshot;
  }): ExternalEventJourneyImpact[] {
    const { event, snapshot } = params;
    const impacts: ExternalEventJourneyImpact[] = [];

    const activeItems = snapshot.items.filter((i) => i.status !== 'cancelled');

    for (const item of activeItems) {
      const spatial = this.evaluateSpatialOverlap(event, item);
      const temporal = this.evaluateTemporalOverlap(event, item);
      const sensitivity = this.classifyActivitySensitivity(item);

      const impactClass = this.classifyWeatherImpact({
        event,
        sensitivity,
        spatialOverlap: spatial.overlap,
        temporalOverlap: temporal,
      });

      // We record impact if there is spatial and temporal overlap, or if disruption risk > INFORMATIONAL
      if ((spatial.overlap && temporal) || impactClass.disruptionRisk !== 'INFORMATIONAL') {
        impacts.push({
          id: `imp_${event.id}_${item.id}`,
          eventId: event.id,
          event,
          journeyId: snapshot.journeyId,
          journeyVersion: snapshot.version,
          affectedItemIds: [item.id],
          affectedItemTitles: [item.title],
          severity: event.severity,
          spatialOverlap: spatial.overlap,
          temporalOverlap: temporal,
          distanceMeters: spatial.distanceMeters,
          activitySensitivity: sensitivity,
          disruptionRisk: impactClass.disruptionRisk,
          recommendedTrigger: impactClass.recommendedTrigger,
          requiresHumanApproval: impactClass.requiresApproval,
          proposalGenerated: false,
          assessedAt: new Date().toISOString(),
          activityId: item.id,
          activityTitle: item.title,
          eventTitle: event.title,
          eventSeverity: event.severity,
          impactReason: impactClass.reason,
          recommendedAction:
            impactClass.recommendedTrigger === 'ITEM_CANCELLED'
              ? 'CANCEL_OR_REPLACE'
              : 'ADAPT_TIME',
          evaluatedAt: new Date().toISOString(),
        });
      }
    }

    return impacts;
  }
}
