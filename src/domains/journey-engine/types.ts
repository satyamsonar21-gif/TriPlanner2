import type { ItineraryItem, DisruptionSeverity } from '@/types/database.types';

export interface DisruptionEvent {
  id: string;
  journey_id: string;
  affected_item_id: string;
  source: 'flight_delay' | 'weather_alert' | 'vendor_cancellation' | 'traveler_request' | 'traffic_delay';
  time_delta_minutes?: number;
  new_location_name?: string;
  description: string;
  timestamp: string;
}

export interface DependencyNode {
  itemId: string;
  item: ItineraryItem;
  dependents: DependencyNode[];
  prerequisites: DependencyNode[];
  bufferMinutes: number;
}

export interface ImpactReport {
  change_request_id: string;
  journey_id: string;
  disruption: DisruptionEvent;
  affected_items_count: number;
  cascading_item_ids: string[];
  has_critical_conflict: boolean;
  impact_details: Array<{
    item_id: string;
    item_title: string;
    type: 'time_overlap' | 'missed_connection' | 'venue_closed' | 'budget_overflow';
    severity: DisruptionSeverity;
    explanation: string;
  }>;
}

export interface AlternativeProposal {
  id: string;
  option_title: string;
  description: string;
  compatibility_score: number; // 0 to 100
  price_delta: number;
  time_shift_minutes: number;
  is_recommended: boolean;
  explanation: string;
  replacement_items: ItineraryItem[];
}

export interface SimulationResult {
  journey_id: string;
  proposal_id: string;
  original_itinerary: ItineraryItem[];
  proposed_itinerary: ItineraryItem[];
  budget_before: number;
  budget_after: number;
  resolved_conflicts_count: number;
  remaining_unresolved_count: number;
}
