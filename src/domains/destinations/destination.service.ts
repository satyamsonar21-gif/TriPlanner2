import type { Destination } from '@/types/database.types';

export const MOCK_DESTINATIONS: Destination[] = [
  {
    id: 'dest_goa_01',
    name: 'Goa',
    slug: 'goa',
    country: 'India',
    region: 'Konkan Coast',
    hero_image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&q=80&w=1200',
    description: 'Portuguese colonial architecture meets tranquil golden bays, spice plantations, and slow coastal living.',
    curated_highlights: [
      'Panjim Fontainhas Heritage Walk',
      'Grande Island Coastal Scuba & Marine Sanctuary',
      'Mandovi Backwater Kayaking Trail',
      'Private Goan Portuguese Supper Club',
    ],
    climate_summary: 'Tropical maritime. November through February brings dry, balmy 28°C breezes ideal for coastal exploration.',
    average_daily_budget: 3500,
    starting_price: 18500,
    duration_days: 5,
    currency: 'INR',
    best_season: 'Nov — Mar',
    styles: ['Adventure', 'Food', 'Beaches', 'Relaxed'],
    experiences: ['Backwater Kayaking', 'Scuba Diving', 'Heritage Walk', 'Spice Plantation', 'Sunset Cruise'],
    coordinates: { lat: 15.2993, lng: 74.124 },
    created_at: new Date().toISOString(),
    sample_itinerary: [
      {
        day: 1,
        title: 'Arrival & Old Latin Quarter',
        items: ['Private airport transfer to Panjim', 'Check-in at Heritage Quinta', 'Fontainhas walking tour & café tasting'],
      },
      {
        day: 2,
        title: 'Coastal Marine & Mangroves',
        items: ['Baga marine dive or backwater kayak', 'Chapora cliffside sunset café', 'Portuguese seafood feast'],
      },
      {
        day: 3,
        title: 'Spice Foothills & Secret Waterfalls',
        items: ['Ponda organic spice trail', 'Dudhsagar natural spring swim', 'Sunset sailing on Mandovi River'],
      },
    ],
  },
  {
    id: 'dest_jaipur_01',
    name: 'Jaipur',
    slug: 'jaipur',
    country: 'India',
    region: 'Rajasthan',
    hero_image: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&q=80&w=1200',
    description: 'The Pink City of Maharajas, where terracotta sandstone palaces, astronomical observatories, and artisan bazaars come alive.',
    curated_highlights: [
      'Amber Fort Sunrise Elephant & Palace Tour',
      'Private City Palace Royal Quarters Access',
      'Hand-block Textile Workshop in Sanganer',
      'Starlit Dinner at Nahargarh Fort overlooking Jaipur',
    ],
    climate_summary: 'Semi-arid continental. October to March offers crisp sunny days around 22°C and cool atmospheric evenings.',
    average_daily_budget: 4200,
    starting_price: 24000,
    duration_days: 4,
    currency: 'INR',
    best_season: 'Oct — Mar',
    styles: ['Culture', 'Heritage', 'Luxury', 'Architecture'],
    experiences: ['Palace Archival Tour', 'Artisan Gem Cutting', 'Nahargarh Sunset', 'Royal High Tea'],
    coordinates: { lat: 26.9124, lng: 75.7873 },
    created_at: new Date().toISOString(),
    sample_itinerary: [
      {
        day: 1,
        title: 'Sandstone Royalty',
        items: ['Chauffeured arrival at Haveli', 'Hawa Mahal exterior study at sunrise', 'City Palace private chambers'],
      },
      {
        day: 2,
        title: 'Fortress Horizons',
        items: ['Amber Fort mirror palace tour', 'Panna Meena ka Kund stepwell visit', 'Nahargarh fort ramparts sunset dinner'],
      },
      {
        day: 3,
        title: 'Living Crafts & Spice Markets',
        items: ['Johari Bazaar jewelry walk', 'Traditional indigo block printing', 'Rooftop Rajasthani thali banquet'],
      },
    ],
  },
  {
    id: 'dest_kerala_01',
    name: 'Kerala',
    slug: 'kerala',
    country: 'India',
    region: 'Malabar Coast',
    hero_image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&q=80&w=1200',
    description: 'A serene tapestry of palm-fringed backwaters, emerald tea estates in Munnar, and ancient Ayurvedic healing traditions.',
    curated_highlights: [
      'Electric Eco-Kettuvallam Houseboat Cruise',
      'Munnar High-Altitude Tea Harvest Walk',
      'Kathakali Classical Drama Behind-the-Scenes',
      'Organic Ayurvedic Wellness Immersion',
    ],
    climate_summary: 'Tropical equatorial. September through March features pleasant temperate weather with lush post-monsoon foliage.',
    average_daily_budget: 3800,
    starting_price: 28500,
    duration_days: 6,
    currency: 'INR',
    best_season: 'Sep — Mar',
    styles: ['Nature', 'Relaxed', 'Food', 'Culture'],
    experiences: ['Backwater Navigation', 'Tea Tasting Munnar', 'Ayurvedic Therapy', 'Periyar Wildlife Watch'],
    coordinates: { lat: 9.9312, lng: 76.2673 },
    created_at: new Date().toISOString(),
    sample_itinerary: [
      {
        day: 1,
        title: 'Fort Kochi Colonial Crossroads',
        items: ['Chinese fishing nets visit', 'Spice warehouse gallery tour', 'Malabar coast seafood tasting'],
      },
      {
        day: 2,
        title: 'Silent Lagoon Houseboat',
        items: ['Board private wooden houseboat in Alleppey', 'Canal village slow voyage', 'Candlelit lake dining'],
      },
      {
        day: 3,
        title: 'Misty Cardamom Hills',
        items: ['Scenic drive to Munnar tea plantations', 'Private estate tea curation', 'Campfire amidst eucalyptus trees'],
      },
    ],
  },
  {
    id: 'dest_kashmir_01',
    name: 'Kashmir',
    slug: 'kashmir',
    country: 'India',
    region: 'Himalayas',
    hero_image: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&q=80&w=1200',
    description: 'Paradise in the valley: carved cedar houseboats on Dal Lake, saffron fields of Pampore, and alpine meadows of Gulmarg.',
    curated_highlights: [
      'Sunrise Shikara Floating Flower Market',
      'Gulmarg Gondola to Apharwat Peak (3,980m)',
      'Betaab Valley Pine Forest Trek in Pahalgam',
      'Traditional Wazwan 36-Course Banquet in Srinagar',
    ],
    climate_summary: 'Alpine mountain climate. April to June offers blooming gardens; December to February is a snow-covered wonderland.',
    average_daily_budget: 4500,
    starting_price: 34000,
    duration_days: 6,
    currency: 'INR',
    best_season: 'Apr — Oct / Dec — Feb',
    styles: ['Nature', 'Adventure', 'Culture', 'Relaxed'],
    experiences: ['Shikara Photography', 'Gulmarg Skiing', 'Saffron Harvest', 'Pashmina Weaving'],
    coordinates: { lat: 34.0837, lng: 74.7973 },
    created_at: new Date().toISOString(),
    sample_itinerary: [
      {
        day: 1,
        title: 'Dal Lake & Floating Whispers',
        items: ['Check-in at heritage cedar houseboat', 'Sunset shikara circuit through lotus gardens', 'Kashmiri Kahwa welcome ceremony'],
      },
      {
        day: 2,
        title: 'Heights of Gulmarg',
        items: ['Scenic drive to Gulmarg bowl', 'Phase 2 Gondola ascent to snow line', 'High altitude pine forest walk'],
      },
      {
        day: 3,
        title: 'Pahalgam Rivers & Saffron Soil',
        items: ['Lidder river trout valley', 'Pampore saffron farms exploration', 'Old wooden town craft bazaar'],
      },
    ],
  },
  {
    id: 'dest_rajasthan_01',
    name: 'Rajasthan',
    slug: 'rajasthan',
    country: 'India',
    region: 'Thar Desert',
    hero_image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&q=80&w=1200',
    description: 'The golden expanse of the Thar, fairy-tale lake palaces of Udaipur, and the blue labyrinth beneath Mehrangarh Fort.',
    curated_highlights: [
      'Lake Pichola Private Solar Boat at Sunset',
      'Mehrangarh Fort Hidden Ramparts & Musket Vaults',
      'Jodhpur Blue City Spice & Textile Heritage Walk',
      'Dune Stargazing Camp in Jaisalmer',
    ],
    climate_summary: 'Desert dry. November to March provides crisp sunny days (24°C) and clear desert night skies perfect for fireside camps.',
    average_daily_budget: 4800,
    starting_price: 38000,
    duration_days: 7,
    currency: 'INR',
    best_season: 'Oct — Mar',
    styles: ['Heritage', 'Culture', 'Luxury', 'Adventure'],
    experiences: ['Dune Glamping', 'Lake Pichola Boating', 'Fortress Exploration', 'Folk Musical Evenings'],
    coordinates: { lat: 26.2389, lng: 73.0243 },
    created_at: new Date().toISOString(),
    sample_itinerary: [
      {
        day: 1,
        title: 'The Blue City Arrival',
        items: ['Jodhpur airport arrival', 'Stepwell reservoir cafe lunch', 'Mehrangarh twilight ramparts walk'],
      },
      {
        day: 2,
        title: 'Golden Sands of Thar',
        items: ['Chauffeured drive to Jaisalmer', 'Desert camel trail into the dunes', 'Stargazing campfire with Manganiyar musicians'],
      },
      {
        day: 3,
        title: 'Lakes of Udaipur',
        items: ['Private transfer to Udaipur', 'Lake Pichola sunset boat charter', 'Mewar palace rooftop dinner'],
      },
    ],
  },
  {
    id: 'dest_mumbai_01',
    name: 'Mumbai',
    slug: 'mumbai',
    country: 'India',
    region: 'Maharashtra Coast',
    hero_image: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&q=80&w=1200',
    description: 'The electric metropolis of Victorian Gothic marvels, Arabian Sea sea-faces, vibrant art districts, and culinary mastery.',
    curated_highlights: [
      'Kala Ghoda Art & Art-Deco Architectural Walking Tour',
      'Dawn Marine Drive & Sassoon Docks Fish Auction',
      'Elephanta Caves UNESCO Rock-Cut Temple Ferry',
      'Chef-led Bombay Coastal Flavors Tasting',
    ],
    climate_summary: 'Coastal tropical. December to February gives comfortable 24°C days with refreshing sea breezes along the promenade.',
    average_daily_budget: 5200,
    starting_price: 21000,
    duration_days: 3,
    currency: 'INR',
    best_season: 'Nov — Feb',
    styles: ['Culture', 'Food', 'Architecture', 'Relaxed'],
    experiences: ['Art Deco Safari', 'Sassoon Docks at Dawn', 'Bandra Street Art', 'Arabian Sea Sunset Sail'],
    coordinates: { lat: 18.922, lng: 72.8347 },
    created_at: new Date().toISOString(),
    sample_itinerary: [
      {
        day: 1,
        title: 'Colonial Splendor & The Gateway',
        items: ['Colaba heritage hotel check-in', 'Gateway of India maritime view', 'Kala Ghoda galleries & Iranian cafés'],
      },
      {
        day: 2,
        title: 'Bays & Sea Bridges',
        items: ['Chhatrapati Shivaji Maharaj Terminus architecture study', 'Bandra promenade & heritage villas', 'Dinner at coastal Konkan seafood kitchen'],
      },
      {
        day: 3,
        title: 'Islands & Marine Horizons',
        items: ['Ferry to Elephanta caves', 'Sunset drinks overlooking Marine Drive', 'Departure transfer'],
      },
    ],
  },
  {
    id: 'dest_istanbul_01',
    name: 'Istanbul',
    slug: 'istanbul',
    country: 'Turkey',
    region: 'Eurasia',
    hero_image: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&q=80&w=1200',
    description: 'The eternal crossroads of East and West, where Byzantine domes and Ottoman minarets mirror across the blue Bosphorus.',
    curated_highlights: [
      'Hagia Sophia & Basilica Cistern Private Guided Access',
      'Bosphorus Sunset Wooden Yacht Cruise with Historian',
      'Grand Bazaar Antiquities & Spice Alchemist Discovery',
      'Historic Çukurcuma Antique Quarter Culinary Walk',
    ],
    climate_summary: 'Mediterranean & Oceanic mix. April-May and September-November offer clear 21°C days perfect for walking stone avenues.',
    average_daily_budget: 6800,
    starting_price: 52000,
    duration_days: 5,
    currency: 'INR',
    best_season: 'Apr — May / Sep — Nov',
    styles: ['Culture', 'Heritage', 'Food', 'Architecture'],
    experiences: ['Bosphorus Yacht', 'Hagia Sophia Private Access', 'Turkish Bath Hammam', 'Spice Market Alchemy'],
    coordinates: { lat: 41.0082, lng: 28.9784 },
    created_at: new Date().toISOString(),
    sample_itinerary: [
      {
        day: 1,
        title: 'Sultanahmet Foundations',
        items: ['Check-in at Pera boutique hotel', 'Hagia Sophia & Blue Mosque private walk', 'Historic Ottoman courtyard dinner'],
      },
      {
        day: 2,
        title: 'Two Continents on Water',
        items: ['Private wooden yacht along Bosphorus', 'Ortaköy waterside tea & pastry', 'Galata Tower rooftop twilight observation'],
      },
      {
        day: 3,
        title: 'Bazaars & Modern Art',
        items: ['Grand Bazaar antique alleys', 'Istanbul Modern waterfront gallery', 'Traditional hammam recovery ritual'],
      },
    ],
  },
  {
    id: 'dest_bali_01',
    name: 'Bali',
    slug: 'bali',
    country: 'Indonesia',
    region: 'Lesser Sunda',
    hero_image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=1200',
    description: 'Island of the Gods: emerald rice terraces carved into volcanic valleys, sacred water temples, and reef-lined beaches.',
    curated_highlights: [
      'Jatiluwih UNESCO Rice Terrace Eco-Walk with Farmer',
      'Tirta Empul Holy Water Temple Purification Blessing',
      'Mount Batur Sunrise Volcanic Trek & Lake Hot Springs',
      'Private Cliffside Dining in Uluwatu overlooking the Indian Ocean',
    ],
    climate_summary: 'Tropical wet-and-dry. April to October is the dry season with sunny 27°C days and gentle trade winds.',
    average_daily_budget: 5500,
    starting_price: 46000,
    duration_days: 6,
    currency: 'INR',
    best_season: 'Apr — Oct',
    styles: ['Nature', 'Relaxed', 'Adventure', 'Culture'],
    experiences: ['Rice Terrace Walk', 'Water Temple Blessing', 'Volcano Sunrise', 'Uluwatu Sunset Dance'],
    coordinates: { lat: -8.3405, lng: 115.092 },
    created_at: new Date().toISOString(),
    sample_itinerary: [
      {
        day: 1,
        title: 'Heartland of Ubud',
        items: ['Private rainforest villa check-in', 'Monkey forest nature sanctuary', 'Balinese farm-to-table organic feast'],
      },
      {
        day: 2,
        title: 'Temples & Terraces',
        items: ['Tegallalang rice terrace walk', 'Tirta Empul spring water blessing', 'Sound healing session at Pyramids of Chi'],
      },
      {
        day: 3,
        title: 'Volcanic Horizons',
        items: ['Batur sunrise panorama', 'Natural geothermal thermal baths', 'Uluwatu cliffside kecak fire dance'],
      },
    ],
  },
];

export class DestinationService {
  public static async getAll(): Promise<Destination[]> {
    return MOCK_DESTINATIONS;
  }

  public static async getBySlug(slug: string): Promise<Destination | null> {
    return MOCK_DESTINATIONS.find((d) => d.slug === slug || d.id === slug) || null;
  }

  public static async filter(options: {
    query?: string;
    style?: string;
    maxBudget?: number;
  }): Promise<Destination[]> {
    let results = MOCK_DESTINATIONS;

    if (options.query && options.query.trim() !== '') {
      const q = options.query.toLowerCase().trim();
      results = results.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.country.toLowerCase().includes(q) ||
          d.region.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q)
      );
    }

    if (options.style && options.style !== 'all') {
      results = results.filter((d) =>
        d.styles?.some((s) => s.toLowerCase() === options.style?.toLowerCase())
      );
    }

    if (options.maxBudget && options.maxBudget > 0) {
      results = results.filter((d) => (d.starting_price || 0) <= options.maxBudget!);
    }

    return results;
  }
}
