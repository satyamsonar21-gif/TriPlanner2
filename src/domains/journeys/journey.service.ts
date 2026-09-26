import type { TripJourney } from '@/types/database.types';
import { supabase } from '@/config/supabase';
import { env } from '@/config/env';

export const MOCK_JOURNEYS: TripJourney[] = [
  {
    id: 'jrn_goa_01',
    traveler_id: 'usr_traveler_01',
    operator_id: 'usr_operator_01',
    coordinator_id: 'usr_coord_01',
    title: 'Goa Getaway',
    destination_ids: ['dest_goa_01'],
    start_date: '12 May 2026',
    end_date: '16 May 2026',
    duration_days: 5,
    duration_nights: 4,
    travelers_count: 2,
    total_budget: 40000,
    currency: 'INR',
    status: 'active',
    current_location: 'Candolim & Panjim, North Goa',
    passport_reference_code: 'GOA260512<<5D4N<<ADVENTURE<<<<<<<<<<<<<',
    hero_image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&q=80&w=1200',
    travel_styles: ['Adventure', 'Beaches', 'Food'],
    progress_percentage: 80,
    bookings_count: 8,
    next_activity: '12 May • 14:00 Check-in at Seashell Resort',
    last_updated: '10 mins ago',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'jrn_kashmir_01',
    traveler_id: 'usr_traveler_01',
    operator_id: 'usr_operator_01',
    title: 'Kashmir Escape',
    destination_ids: ['dest_kashmir_01'],
    start_date: '20 May 2026',
    end_date: '26 May 2026',
    duration_days: 7,
    duration_nights: 6,
    travelers_count: 2,
    total_budget: 68000,
    currency: 'INR',
    status: 'planning',
    current_location: 'Dal Lake & Gulmarg',
    passport_reference_code: 'KSH260520<<7D6N<<NATURE<<<<<<<<<<<<<<<',
    hero_image: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&q=80&w=800',
    travel_styles: ['Nature', 'Mountains', 'Culture'],
    progress_percentage: 45,
    bookings_count: 5,
    next_activity: '20 May • 11:30 Shikara Cruise Arrival',
    last_updated: '2 hours ago',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'jrn_rajasthan_01',
    traveler_id: 'usr_traveler_01',
    operator_id: 'usr_operator_01',
    title: 'Rajasthan Heritage Tour',
    destination_ids: ['dest_rajasthan_01'],
    start_date: '10 Jun 2026',
    end_date: '15 Jun 2026',
    duration_days: 6,
    duration_nights: 5,
    travelers_count: 4,
    total_budget: 92000,
    currency: 'INR',
    status: 'planning',
    current_location: 'Jaipur & Udaipur',
    passport_reference_code: 'RAJ260610<<6D5N<<HERITAGE<<<<<<<<<<<<<',
    hero_image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&q=80&w=800',
    travel_styles: ['Heritage', 'Culture', 'Architecture'],
    progress_percentage: 30,
    bookings_count: 6,
    next_activity: '10 Jun • City Palace Private Entry',
    last_updated: '1 day ago',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'jrn_dubai_01',
    traveler_id: 'usr_traveler_01',
    operator_id: 'usr_operator_01',
    title: 'Dubai Break',
    destination_ids: ['dest_dubai_01'],
    start_date: '5 Jul 2026',
    end_date: '8 Jul 2026',
    duration_days: 4,
    duration_nights: 3,
    travelers_count: 2,
    total_budget: 110000,
    currency: 'INR',
    status: 'planning',
    current_location: 'Downtown Dubai & Marina',
    passport_reference_code: 'DXB260705<<4D3N<<LUXURY<<<<<<<<<<<<<<<',
    hero_image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=800',
    travel_styles: ['Luxury', 'Shopping', 'City'],
    progress_percentage: 20,
    bookings_count: 3,
    next_activity: 'Desert Safari Voucher Booking',
    last_updated: '3 days ago',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'jrn_kerala_01',
    traveler_id: 'usr_traveler_01',
    operator_id: 'usr_operator_01',
    title: 'Kerala Serenity Voyage',
    destination_ids: ['dest_kerala_01'],
    start_date: '14 Aug 2026',
    end_date: '19 Aug 2026',
    duration_days: 6,
    duration_nights: 5,
    travelers_count: 2,
    total_budget: 54000,
    currency: 'INR',
    status: 'planning',
    current_location: 'Alleppey & Munnar Hills',
    passport_reference_code: 'KER260814<<6D5N<<BACKWATERS<<<<<<<<<<<',
    hero_image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&q=80&w=800',
    travel_styles: ['Backwaters', 'Wellness', 'Nature'],
    progress_percentage: 35,
    bookings_count: 4,
    next_activity: 'Confirm Houseboat Upgrade',
    last_updated: '5 days ago',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

import {
  type GeoLocation,
  DEMO_LOCATION_FIXTURES,
  normalizeGeoLocation,
} from '@/domains/geo';

export interface JourneyItineraryStop {
  id: string;
  journeyId: string;
  dayNumber: number;
  sequenceOrder: number;
  itemType: 'accommodation' | 'activity' | 'transport' | 'meal' | 'free_time';
  title: string;
  subtitle: string;
  startTimeIso: string;
  endTimeIso: string;
  displayWindow: string;
  price: number;
  currency: string;
  status: 'confirmed' | 'pending' | 'disrupted' | 'modifying';
  disruptionNote?: string;
  safetyBufferMinutes: number;
  location: GeoLocation;
}

const findFixture = (id: string, fallbackName: string, lat: number, lng: number): GeoLocation => {
  const found = DEMO_LOCATION_FIXTURES.find((f) => f.id === id);
  if (found) return found;
  return normalizeGeoLocation({
    id,
    name: fallbackName,
    latitude: lat,
    longitude: lng,
    formattedAddress: `${fallbackName}, India`,
    provider: 'mock',
    locationType: 'attraction',
    isDemoFixture: true,
  });
};

export const GOA_JOURNEY_ITINERARY_STOPS: JourneyItineraryStop[] = [
  {
    id: 'itm_goa_01_hotel',
    journeyId: 'jrn_goa_01',
    dayNumber: 2,
    sequenceOrder: 1,
    itemType: 'accommodation',
    title: 'Seashell Beach Resort & Spa',
    subtitle: 'Candolim Morning Departure',
    startTimeIso: '2026-05-13T09:00:00Z',
    endTimeIso: '2026-05-13T10:30:00Z',
    displayWindow: '09:00 – 10:30',
    price: 12280,
    currency: 'INR',
    status: 'confirmed',
    safetyBufferMinutes: 15,
    location: findFixture(
      'loc_goa_hotel_candolim',
      'Seashell Beach Resort & Spa',
      15.5181,
      73.7626
    ),
  },
  {
    id: 'itm_goa_02_fort',
    journeyId: 'jrn_goa_01',
    dayNumber: 2,
    sequenceOrder: 2,
    itemType: 'activity',
    title: 'Fort Aguada Heritage Ramparts',
    subtitle: '17th-Century Portuguese Lighthouse & Bastion',
    startTimeIso: '2026-05-13T11:00:00Z',
    endTimeIso: '2026-05-13T13:15:00Z',
    displayWindow: '11:00 – 13:15',
    price: 1200,
    currency: 'INR',
    status: 'confirmed',
    safetyBufferMinutes: 15,
    location: findFixture(
      'loc_goa_fort_aguada',
      'Fort Aguada',
      15.4924,
      73.7737
    ),
  },
  {
    id: 'itm_goa_03_scuba',
    journeyId: 'jrn_goa_01',
    dayNumber: 2,
    sequenceOrder: 3,
    itemType: 'activity',
    title: 'Baga Reef Coastal Scuba Diving',
    subtitle: 'Guided Coral Sanctuary Dive',
    startTimeIso: '2026-05-13T14:00:00Z',
    endTimeIso: '2026-05-13T16:15:00Z',
    displayWindow: '14:00 – 16:15',
    price: 4200,
    currency: 'INR',
    status: 'disrupted',
    disruptionNote: '2.8m swell advisory at Baga Reef. Candidate alternatives ready for evaluation.',
    safetyBufferMinutes: 15,
    location: findFixture(
      'loc_goa_baga_scuba',
      'Baga Reef Scuba Diving Center',
      15.5553,
      73.7517
    ),
  },
  {
    id: 'itm_goa_04_cafe',
    journeyId: 'jrn_goa_01',
    dayNumber: 2,
    sequenceOrder: 4,
    itemType: 'meal',
    title: 'Fontainhas Heritage Café Bodega',
    subtitle: 'Artisan Bakery & Courtyard Espresso',
    startTimeIso: '2026-05-13T17:00:00Z',
    endTimeIso: '2026-05-13T18:45:00Z',
    displayWindow: '17:00 – 18:45',
    price: 1600,
    currency: 'INR',
    status: 'confirmed',
    safetyBufferMinutes: 15,
    location: findFixture(
      'loc_goa_fontainhas_cafe',
      'Fontainhas Heritage Quarter & Café Bodega',
      15.4961,
      73.8313
    ),
  },
  {
    id: 'itm_goa_05_dinner',
    journeyId: 'jrn_goa_01',
    dayNumber: 2,
    sequenceOrder: 5,
    itemType: 'meal',
    title: "Mum's Kitchen Portuguese Supper",
    subtitle: '7-Course Coastal Tasting Menu',
    startTimeIso: '2026-05-13T19:30:00Z',
    endTimeIso: '2026-05-13T21:30:00Z',
    displayWindow: '19:30 – 21:30',
    price: 4800,
    currency: 'INR',
    status: 'confirmed',
    safetyBufferMinutes: 15,
    location: findFixture(
      'loc_goa_dinner_panjim',
      "Mum's Kitchen Portuguese Supper Club",
      15.4909,
      73.8278
    ),
  },
];

const customPlannedStopsByJourneyId = new Map<string, JourneyItineraryStop[]>();

export class JourneyService {
  public static async getAll(): Promise<TripJourney[]> {
    if (supabase && env.isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('journeys')
          .select('*')
          .order('start_date', { ascending: true });
        if (data && !error && data.length > 0) {
          return data as unknown as TripJourney[];
        }
      } catch (err) {
        console.warn('[JourneyService] Supabase getAll error:', err);
      }
    }
    return MOCK_JOURNEYS;
  }

  public static async getActiveJourney(): Promise<TripJourney | null> {
    if (supabase && env.isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('journeys')
          .select('*')
          .eq('status', 'active')
          .limit(1)
          .single();
        if (data && !error) {
          return data as unknown as TripJourney;
        }
      } catch (err) {
        console.warn('[JourneyService] Supabase getActiveJourney error:', err);
      }
    }
    return MOCK_JOURNEYS[0] || null;
  }

  /**
   * Authoritative lookup: Returns null if ID is not found. Never falls back to arbitrary record.
   */
  public static async getById(id: string): Promise<TripJourney | null> {
    if (supabase && env.isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('journeys')
          .select('*')
          .eq('id', id)
          .single();
        if (data && !error) {
          return data as unknown as TripJourney;
        }
      } catch (err) {
        console.warn('[JourneyService] Supabase getById error:', err);
      }
    }
    const match = MOCK_JOURNEYS.find((j) => j.id === id);
    return match || null;
  }

  /**
   * Returns ordered geographic itinerary stops for a given journey ID.
   * Automatically reflects any applied LivingJourneyEngine changes on the live snapshot.
   */
  public static getItineraryStopsForJourney(
    journeyId: string
  ): JourneyItineraryStop[] {
    if (customPlannedStopsByJourneyId.has(journeyId)) {
      return customPlannedStopsByJourneyId.get(journeyId)!;
    }

    if (journeyId === 'jrn_goa_01') {
      return GOA_JOURNEY_ITINERARY_STOPS;
    }

    const journey = MOCK_JOURNEYS.find((j) => j.id === journeyId);
    const destId = journey?.destination_ids?.[0] || 'dest_goa_01';
    const baseFixture =
      DEMO_LOCATION_FIXTURES.find((f) => f.id === destId) ||
      DEMO_LOCATION_FIXTURES[0];

    return [
      {
        id: `${journeyId}_stop_1`,
        journeyId,
        dayNumber: 1,
        sequenceOrder: 1,
        itemType: 'accommodation',
        title: `${baseFixture.name} Heritage Sanctuary Hotel`,
        subtitle: 'Check-in & Welcome Briefing',
        startTimeIso: '2026-05-20T09:00:00Z',
        endTimeIso: '2026-05-20T11:00:00Z',
        displayWindow: '09:00 – 11:00',
        price: 8500,
        currency: 'INR',
        status: 'confirmed',
        safetyBufferMinutes: 15,
        location: normalizeGeoLocation({
          id: `${journeyId}_loc_1`,
          name: `${baseFixture.name} Heritage Sanctuary Hotel`,
          latitude: baseFixture.latitude,
          longitude: baseFixture.longitude,
          formattedAddress: baseFixture.formattedAddress,
          city: baseFixture.city,
          region: baseFixture.region,
          country: baseFixture.country,
          provider: 'mock',
          locationType: 'accommodation',
          isDemoFixture: true,
        }),
      },
      {
        id: `${journeyId}_stop_2`,
        journeyId,
        dayNumber: 1,
        sequenceOrder: 2,
        itemType: 'activity',
        title: `${baseFixture.name} Cultural Landmark Walk`,
        subtitle: 'Guided Historian Exploration',
        startTimeIso: '2026-05-20T12:00:00Z',
        endTimeIso: '2026-05-20T14:30:00Z',
        displayWindow: '12:00 – 14:30',
        price: 2400,
        currency: 'INR',
        status: 'confirmed',
        safetyBufferMinutes: 15,
        location: normalizeGeoLocation({
          id: `${journeyId}_loc_2`,
          name: `${baseFixture.name} Old Quarter Landmark`,
          latitude: Number((baseFixture.latitude + 0.022).toFixed(6)),
          longitude: Number((baseFixture.longitude + 0.018).toFixed(6)),
          formattedAddress: `Old Quarter, ${baseFixture.formattedAddress}`,
          city: baseFixture.city,
          region: baseFixture.region,
          country: baseFixture.country,
          provider: 'mock',
          locationType: 'attraction',
          isDemoFixture: true,
        }),
      },
      {
        id: `${journeyId}_stop_3`,
        journeyId,
        dayNumber: 1,
        sequenceOrder: 3,
        itemType: 'meal',
        title: `${baseFixture.name} Sunset Courtyard Supper`,
        subtitle: 'Regional Culinary Tasting',
        startTimeIso: '2026-05-20T15:30:00Z',
        endTimeIso: '2026-05-20T17:30:00Z',
        displayWindow: '15:30 – 17:30',
        price: 3200,
        currency: 'INR',
        status: 'confirmed',
        safetyBufferMinutes: 15,
        location: normalizeGeoLocation({
          id: `${journeyId}_loc_3`,
          name: `${baseFixture.name} Panoramic Supper Club`,
          latitude: Number((baseFixture.latitude + 0.009).toFixed(6)),
          longitude: Number((baseFixture.longitude - 0.015).toFixed(6)),
          formattedAddress: `Promenade, ${baseFixture.formattedAddress}`,
          city: baseFixture.city,
          region: baseFixture.region,
          country: baseFixture.country,
          provider: 'mock',
          locationType: 'restaurant',
          isDemoFixture: true,
        }),
      },
    ];
  }

  /**
   * Returns candidate alternative locations for route-matrix & insertion feasibility checks.
   */
  public static getCandidateLocationsForJourney(
    _journeyId: string
  ): GeoLocation[] {
    return [
      findFixture(
        'loc_goa_mandovi_kayak',
        'Mandovi Backwater Kayaking Sanctuary',
        15.5256,
        73.8389
      ),
      findFixture(
        'loc_goa_chapora_cafe',
        'Chapora Cliffside Sunset Café',
        15.6062,
        73.7364
      ),
      findFixture(
        'loc_goa_spice_plantation',
        'Sahakari Organic Spice Plantation',
        15.4021,
        74.0182
      ),
    ];
  }

  /**
   * Persists a newly configured journey and its normalized location from Journey Builder.
   */
  public static createPlannedJourney(params: {
    destinationLocation: GeoLocation;
    durationDays: number;
    budgetPerDay: number;
    styles: string[];
    pace: 'relaxed' | 'balanced' | 'fast-paced';
    heroImage?: string;
  }): TripJourney {
    const id = `jrn_${params.destinationLocation.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now().toString().slice(-4)}`;
    const safetyBuffer =
      params.pace === 'relaxed' ? 25 : params.pace === 'fast-paced' ? 10 : 15;

    const newJourney: TripJourney = {
      id,
      traveler_id: 'usr_traveler_01',
      title: `${params.destinationLocation.name} Living Expedition`,
      destination_ids: [params.destinationLocation.id],
      start_date: '18 Oct 2026',
      end_date: `${18 + params.durationDays - 1} Oct 2026`,
      duration_days: params.durationDays,
      duration_nights: Math.max(1, params.durationDays - 1),
      travelers_count: 2,
      total_budget: params.durationDays * params.budgetPerDay,
      currency: 'INR',
      status: 'planning',
      current_location: params.destinationLocation.formattedAddress,
      passport_reference_code: `TP<<${params.destinationLocation.name.toUpperCase().slice(0, 6)}<<${params.durationDays}D<<LIVING`,
      hero_image:
        params.heroImage ||
        'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&q=80&w=1200',
      travel_styles: params.styles,
      progress_percentage: 25,
      bookings_count: 3,
      next_activity: `Arrival at ${params.destinationLocation.name} Sanctuary`,
      last_updated: 'Just now',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    MOCK_JOURNEYS.unshift(newJourney);

    if (
      params.destinationLocation.name.toLowerCase().includes('goa') ||
      params.destinationLocation.id === 'dest_goa_01'
    ) {
      customPlannedStopsByJourneyId.set(
        id,
        GOA_JOURNEY_ITINERARY_STOPS.map((stop) => ({
          ...stop,
          journeyId: id,
          safetyBufferMinutes: safetyBuffer,
        }))
      );
    }

    return newJourney;
  }

  /**
   * Synchronizes JourneyService stops and metadata when a LivingJourneyEngine
   * change is applied, ensuring JourneyDetailPage and TravelerDashboardPage stay in sync.
   */
  public static syncFromEngineSnapshot(params: {
    journeyId: string;
    version: number;
    allocatedCost: number;
    stops: JourneyItineraryStop[];
  }): void {
    customPlannedStopsByJourneyId.set(params.journeyId, params.stops);
    const match = MOCK_JOURNEYS.find((j) => j.id === params.journeyId);
    if (match) {
      match.version = params.version;
      match.allocated_cost = params.allocatedCost;
      match.status = 'booked';
      match.last_updated = 'Just now (v' + params.version + ')';
    }
  }
}


