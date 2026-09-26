/**
 * Triplanner Core Domain & Database Schema Definitions
 * Provides strong typing across the entire Living Journey Engine™ ecosystem.
 */

export type UserRole = 'traveler' | 'operator' | 'coordinator' | 'vendor' | 'admin';

export type JourneyStatus = 'draft' | 'planning' | 'booked' | 'active' | 'disrupted' | 'modifying' | 'completed' | 'cancelled';

export type BookingStatus = 'pending' | 'confirmed' | 'rejected' | 'modified' | 'cancelled';

export type ItemType = 'activity' | 'accommodation' | 'transport' | 'custom';

export type ChangeStatus = 'detected' | 'analyzed' | 'proposed' | 'approved' | 'rejected' | 'propagated' | 'failed';

export type DisruptionSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AccountStatus = 'active' | 'pending_verification' | 'suspended' | 'deactivated';

export interface Profile {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string;
  display_name?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  role: UserRole;
  status: AccountStatus;
  organization_id?: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  display_name?: string;
  avatar_url?: string;
  role: UserRole;
  status?: AccountStatus;
  organization_id?: string;
  created_at: string;
  updated_at: string;
}


export interface Organization {
  id: string;
  name: string;
  type: 'operator' | 'agency' | 'vendor';
  slug: string;
  created_at: string;
}

export interface TravelerProfile {
  id: string;
  user_id: string;
  preferred_currency: string;
  travel_style: string[]; // e.g. ['luxury', 'culture', 'slow-travel']
  dietary_requirements: string[];
  accessibility_needs: string[];
  passport_nationality?: string;
  emergency_contact?: { name: string; phone: string; relation: string };
  created_at: string;
  updated_at: string;
}

export interface OperatorProfile {
  id: string;
  user_id: string;
  organization_id: string;
  company_name: string;
  license_number?: string;
  support_email: string;
  support_phone: string;
  rating: number;
  created_at: string;
}

export interface Vendor {
  id: string;
  user_id?: string;
  organization_id?: string;
  name: string;
  category: 'hotel' | 'activity_provider' | 'transport_provider' | 'guide' | 'restaurant';
  destination_id: string;
  contact_email: string;
  contact_phone: string;
  verification_status: 'verified' | 'pending' | 'unverified';
  rating: number;
  created_at: string;
}

export interface Destination {
  id: string;
  name: string;
  slug: string;
  country: string;
  region: string;
  hero_image: string;
  description: string;
  curated_highlights: string[];
  climate_summary: string;
  average_daily_budget: number;
  coordinates: { lat: number; lng: number }; // Legacy/convenience
  geo_lat?: number;
  geo_lng?: number;
  geo_place_id?: string;
  geo_provider?: string;
  created_at: string;
  styles?: string[];
  experiences?: string[];
  starting_price?: number;
  duration_days?: number;
  currency?: string;
  best_season?: string;
  sample_itinerary?: Array<{
    day: number;
    title: string;
    items: string[];
  }>;
}

export interface Activity {
  id: string;
  destination_id: string;
  vendor_id?: string;
  title: string;
  description: string;
  category: string;
  duration_minutes: number;
  price_amount: number;
  currency: string;
  image_url: string;
  location_name: string;
  coordinates?: { lat: number; lng: number }; // Legacy
  geo_lat?: number;
  geo_lng?: number;
  geo_place_id?: string;
  geo_provider?: string;
  max_capacity?: number;
  created_at: string;
}

export interface Accommodation {
  id: string;
  destination_id: string;
  vendor_id?: string;
  name: string;
  type: 'hotel' | 'resort' | 'villa' | 'boutique' | 'apartment';
  star_rating: number;
  address: string;
  geo_lat?: number;
  geo_lng?: number;
  geo_place_id?: string;
  geo_provider?: string;
  price_per_night: number;
  currency: string;
  hero_image: string;
  created_at: string;
}

export interface TransportProvider {
  id: string;
  vendor_id?: string;
  name: string;
  type: 'flight' | 'train' | 'private_car' | 'ferry' | 'bus';
  contact_phone: string;
  created_at: string;
}

export interface TripJourney {
  id: string;
  traveler_id: string;
  operator_id?: string;
  coordinator_id?: string;
  title: string;
  destination_ids: string[];
  start_date: string;
  end_date: string;
  total_budget: number;
  allocated_cost?: number;
  hard_budget_constraint?: boolean;
  soft_budget_tolerance_pct?: number;
  version?: number;
  currency: string;
  status: JourneyStatus;
  current_location?: string;
  passport_reference_code: string;
  hero_image?: string;
  duration_nights?: number;
  duration_days?: number;
  travelers_count?: number;
  travel_styles?: string[];
  progress_percentage?: number;
  bookings_count?: number;
  next_activity?: string;
  last_updated?: string;
  created_at: string;
  updated_at: string;
}

export interface TripTraveler {
  id: string;
  journey_id: string;
  user_id: string;
  is_lead: boolean;
}

export interface TripPreference {
  id: string;
  journey_id: string;
  pace: 'relaxed' | 'balanced' | 'fast-paced';
  interests: string[];
  budget_flexibility_percentage: number;
}

export interface ItineraryDay {
  id: string;
  journey_id: string;
  day_number: number;
  date: string;
  title: string;
  summary?: string;
}

export interface ItineraryItem {
  id: string;
  journey_id: string;
  day_id: string;
  sequence_order: number;
  item_type: ItemType;
  title: string;
  description?: string;
  start_time: string; // ISO or HH:mm
  end_time: string;
  location_name: string;
  geo_lat?: number;
  geo_lng?: number;
  geo_place_id?: string;
  geo_provider?: string;
  price: number;
  currency: string;
  booking_id?: string;
  booking_state?: 'NONE' | 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'NON_REFUNDABLE' | 'MODIFIABLE' | 'CANCELLED';
  is_locked?: boolean;
  party_size?: number;
  category_tags?: string[];
  status: 'confirmed' | 'pending' | 'disrupted' | 'modifying' | 'cancelled';
  disruption_flag?: boolean;
}

export interface ItineraryDependency {
  id: string;
  journey_id: string;
  preceding_item_id: string; // e.g. Flight arrival
  dependent_item_id: string; // e.g. Hotel check-in or Tour start
  min_buffer_minutes: number;
  dependency_type: 'time_buffer' | 'location_match' | 'prerequisite';
}

export interface Booking {
  id: string;
  journey_id: string;
  itinerary_item_id: string;
  vendor_id?: string;
  operator_id?: string;
  booking_code: string;
  status: BookingStatus;
  total_price: number;
  currency: string;
  confirmed_at?: string;
  created_at: string;
}

export interface BookingItem {
  id: string;
  booking_id: string;
  title: string;
  unit_price: number;
  quantity: number;
}

export interface Payment {
  id: string;
  journey_id: string;
  booking_id?: string;
  amount: number;
  currency: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  provider: 'stripe' | 'bank_transfer' | 'mock';
  transaction_ref?: string;
  created_at: string;
}

export interface Tour {
  id: string;
  operator_id: string;
  title: string;
  slug: string;
  description: string;
  destination_id: string;
  duration_days: number;
  base_price: number;
  currency: string;
  is_published: boolean;
  created_at: string;
}

export interface Coordinator {
  id: string;
  user_id: string;
  operator_id: string;
  assigned_journey_ids: string[];
  status: 'available' | 'busy' | 'offline';
}

export interface ChangeRequest {
  id: string;
  journey_id: string;
  triggered_by_item_id: string;
  trigger_reason: string; // e.g. "Flight delay of 120 minutes"
  severity: DisruptionSeverity;
  status: ChangeStatus;
  impact_summary: string;
  created_at: string;
  updated_at: string;
}

export interface ChangeImpact {
  id: string;
  change_request_id: string;
  affected_item_id: string;
  impact_type: 'time_overlap' | 'missed_connection' | 'venue_closed' | 'budget_overflow';
  description: string;
  severity: DisruptionSeverity;
}

export interface AlternativeOption {
  id: string;
  change_request_id: string;
  option_title: string;
  description: string;
  score: number; // 0 to 100 compatibility score
  price_difference: number;
  schedule_shift_minutes: number;
  is_recommended: boolean;
  proposed_items: Partial<ItineraryItem>[];
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'disruption' | 'change_proposal' | 'booking_update' | 'system';
  is_read: boolean;
  related_journey_id?: string;
  related_change_id?: string;
  created_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  journey_id?: string;
  operator_id?: string;
  rating: number; // 1-5
  comment: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string;
  actor_role: UserRole;
  details: Record<string, unknown>;
  timestamp: string;
}
