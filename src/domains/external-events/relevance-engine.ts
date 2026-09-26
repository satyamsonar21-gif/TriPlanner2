import { calculateHaversineDistanceMeters } from '@/domains/geo/normalization';
import type { ItineraryItem, JourneySnapshot } from '@/domains/journey-engine/types';
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
    item: ItineraryItem
  ): ActivityWeatherSensitivity {
    const tags = (item.categoryTags || []).map((t) => t.toLowerCase());
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
      tags.some((t) =>
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
      tags.some((t) =>
        ['beaches', 'adventure', 'hiking', 'trekking', 'cycling', 'outdoor'].includes(t)
      ) ||
      title.includes('beach') ||
      title.includes('trek') ||
      title.includes('hike')
    ) {
      return 'HIGH_OUTDOOR_EXPOSURE';
    }

    if (
      tags.some((t) =>
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
    item: ItineraryItem
  ): { overlap: boolean; distanceMeters: number } {
    if (!item.location || !item.location.coordinate) {
      return { overlap: false, distanceMeters: Infinity };
    }

    const distanceMeters = calculateHaversineDistanceMeters(
      { latitude: event.latitude, longitude: event.longitude },
      item.location.coordinate
    );

    const overlap = distanceMeters <= event.radiusMeters;
    return { overlap, distanceMeters };
  }

  /**
   * Evaluates temporal overlap between event effective window and activity display window.
   */
  public static evaluateTemporalOverlap(
    event: ExternalEvent,
    item: ItineraryItem
  ): boolean {
    if (!item.startTimeIso || !item.endTimeIso) {
      return false;
    }

    const eventStart = Date.parse(event.effectiveFrom);
    const eventEnd = Date.parse(event.effectiveUntil);
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

    const isSevere = event.severity === 'HIGH' || event.severity === 'CRITICAL';
    const isModerate = event.severity === 'MEDIUM';

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
        });
      }
    }

    return impacts;
  }
}
