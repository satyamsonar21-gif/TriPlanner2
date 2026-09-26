import type {
  DestinationWeatherReport,
  WeatherCondition,
} from './weather.types';
import { fetchWeatherApi } from 'openmeteo';

function toFahrenheit(celsius: number): number {
  return Math.round((celsius * 9) / 5 + 32);
}

function mapWMOToCondition(code: number): WeatherCondition {
  if (code === 0) return 'sunny';
  if (code >= 1 && code <= 3) return 'partly_cloudy';
  if (code >= 45 && code <= 48) return 'foggy';
  if (code >= 51 && code <= 67) return 'rainy';
  if (code >= 80 && code <= 82) return 'rainy';
  if (code >= 95 && code <= 99) return 'thunderstorm';
  if (code >= 71 && code <= 77) return 'snowy';
  return 'sunny';
}

function mapWMOToText(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code >= 45 && code <= 48) return 'Fog';
  if (code >= 51 && code <= 55) return 'Drizzle';
  if (code >= 61 && code <= 65) return 'Rain';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Unknown';
}

const DESTINATION_WEATHER_FIXTURES: Record<string, DestinationWeatherReport> = {
  dest_goa_01: {
    destinationId: 'dest_goa_01',
    destinationName: 'Goa',
    region: 'Konkan Coast',
    country: 'India',
    coordinates: { lat: 15.2993, lng: 74.124 },
    currentTempC: 31,
    currentTempF: toFahrenheit(31),
    feelsLikeC: 34,
    feelsLikeF: toFahrenheit(34),
    condition: 'partly_cloudy',
    conditionText: 'Partly Cloudy with Coastal Breeze',
    humidity: 78,
    windSpeedKmH: 18,
    windDirection: 'WSW',
    visibilityKm: 9.5,
    uvIndex: 8,
    airQualityIndex: 42,
    airQualityLabel: 'Good',
    lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    disruptionAlert: {
      id: 'alert_goa_tide_01',
      severity: 'moderate',
      title: 'High Tide & Swell Advisory (Aguada & Mandovi)',
      description:
        'Swell height reaching 2.4m along northern sandbanks between 14:00 and 17:30. Estuary waters remain calm for inland kayaking.',
      affectedActivities: ['Baga Coastal Scuba Diving', 'Sunset Sailing Charter'],
      recommendedAction:
        'Prioritize morning backwater kayaking at 09:30; postpone open-sea catamaran to Day 3 morning.',
      validUntil: 'Today, 18:00 IST',
    },
    travelInsights: {
      bestTimeToStepOut: '07:30 – 10:30 & 16:30 – 19:30 IST',
      clothingRecommendation: 'Light linen shirt, boardshorts, wide-brim hat & sunglasses',
      indoorBackupOption: 'Fontainhas Portuguese Heritage Art Gallery & Portuguese Supper Club',
      transitCaution: 'Coastal roads near Candolim experience peak ferry crossing queues around 18:00',
    },
    hourly: [
      {
        time: '08:00',
        tempC: 28,
        tempF: toFahrenheit(28),
        condition: 'sunny',
        conditionText: 'Sunny',
        precipitationProbability: 10,
        humidity: 82,
        windSpeedKmH: 12,
      },
      {
        time: '11:00',
        tempC: 31,
        tempF: toFahrenheit(31),
        condition: 'partly_cloudy',
        conditionText: 'Partly Cloudy',
        precipitationProbability: 15,
        humidity: 76,
        windSpeedKmH: 16,
      },
      {
        time: '14:00',
        tempC: 33,
        tempF: toFahrenheit(33),
        condition: 'partly_cloudy',
        conditionText: 'Warm with Sea Gusts',
        precipitationProbability: 25,
        humidity: 74,
        windSpeedKmH: 22,
      },
      {
        time: '17:00',
        tempC: 30,
        tempF: toFahrenheit(30),
        condition: 'sunny',
        conditionText: 'Golden Hour Clear',
        precipitationProbability: 10,
        humidity: 79,
        windSpeedKmH: 17,
      },
      {
        time: '20:00',
        tempC: 28,
        tempF: toFahrenheit(28),
        condition: 'partly_cloudy',
        conditionText: 'Pleasant Tropical Night',
        precipitationProbability: 10,
        humidity: 84,
        windSpeedKmH: 14,
      },
      {
        time: '23:00',
        tempC: 27,
        tempF: toFahrenheit(27),
        condition: 'partly_cloudy',
        conditionText: 'Balmy Night Breeze',
        precipitationProbability: 5,
        humidity: 86,
        windSpeedKmH: 11,
      },
    ],
    daily: [
      {
        date: '2026-05-12',
        dayName: 'Tue (Arrival)',
        condition: 'sunny',
        conditionText: 'Sunny with Mild Mist',
        tempHighC: 32,
        tempLowC: 26,
        tempHighF: toFahrenheit(32),
        tempLowF: toFahrenheit(26),
        precipitationProbability: 10,
        humidity: 75,
        windSpeedKmH: 15,
        uvIndex: 8,
        sunrise: '06:05 AM',
        sunset: '06:58 PM',
        packingAdvisory: 'Comfortable sandals & light breathable cottons',
        activityRecommendation: 'Ideal for Latin Quarter Fontainhas walking tour & café stops',
      },
      {
        date: '2026-05-13',
        dayName: 'Wed (Water)',
        condition: 'partly_cloudy',
        conditionText: 'Partly Cloudy & Breezy',
        tempHighC: 33,
        tempLowC: 26,
        tempHighF: toFahrenheit(33),
        tempLowF: toFahrenheit(26),
        precipitationProbability: 20,
        humidity: 78,
        windSpeedKmH: 21,
        uvIndex: 9,
        sunrise: '06:04 AM',
        sunset: '06:59 PM',
        packingAdvisory: 'Dry-bag for phones & waterproof sandals',
        activityRecommendation: 'Mandovi backwater kayak is safe; scuba charter shifts to morning slot',
      },
      {
        date: '2026-05-14',
        dayName: 'Thu (Hills)',
        condition: 'rainy',
        conditionText: 'Afternoon Tropical Shower',
        tempHighC: 30,
        tempLowC: 25,
        tempHighF: toFahrenheit(30),
        tempLowF: toFahrenheit(25),
        precipitationProbability: 65,
        humidity: 86,
        windSpeedKmH: 24,
        uvIndex: 6,
        sunrise: '06:04 AM',
        sunset: '06:59 PM',
        packingAdvisory: 'Compact umbrella & water-resistant light jacket',
        activityRecommendation: 'Lush greenery at Ponda Spice Plantation shines in light rain',
      },
      {
        date: '2026-05-15',
        dayName: 'Fri (Coastal)',
        condition: 'sunny',
        conditionText: 'Crystal Blue Skies',
        tempHighC: 32,
        tempLowC: 26,
        tempHighF: toFahrenheit(32),
        tempLowF: toFahrenheit(26),
        precipitationProbability: 15,
        humidity: 74,
        windSpeedKmH: 16,
        uvIndex: 9,
        sunrise: '06:03 AM',
        sunset: '07:00 PM',
        packingAdvisory: 'Reef-safe sunscreen & beachwear',
        activityRecommendation: 'Optimal conditions for Chapora sunset cliffside visit',
      },
      {
        date: '2026-05-16',
        dayName: 'Sat (Departure)',
        condition: 'partly_cloudy',
        conditionText: 'Calm Tropical Morning',
        tempHighC: 31,
        tempLowC: 26,
        tempHighF: toFahrenheit(31),
        tempLowF: toFahrenheit(26),
        precipitationProbability: 10,
        humidity: 77,
        windSpeedKmH: 14,
        uvIndex: 8,
        sunrise: '06:03 AM',
        sunset: '07:00 PM',
        packingAdvisory: 'Travel layers for AC airport transitions',
        activityRecommendation: 'Morning souvenir shopping in Panjim flea markets before airport',
      },
    ],
  },

  dest_rajasthan_01: {
    destinationId: 'dest_rajasthan_01',
    destinationName: 'Rajasthan',
    region: 'Thar Desert & Aravalli',
    country: 'India',
    coordinates: { lat: 26.9124, lng: 75.7873 },
    currentTempC: 36,
    currentTempF: toFahrenheit(36),
    feelsLikeC: 38,
    feelsLikeF: toFahrenheit(38),
    condition: 'sunny',
    conditionText: 'Dry Desert Sunshine & Clear Horizons',
    humidity: 28,
    windSpeedKmH: 14,
    windDirection: 'NW',
    visibilityKm: 12.0,
    uvIndex: 10,
    airQualityIndex: 68,
    airQualityLabel: 'Moderate',
    lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    disruptionAlert: {
      id: 'alert_raj_heat_01',
      severity: 'advisory',
      title: 'High Midday UV & Surface Heat Notice',
      description:
        'Fort ramparts at Amber & Mehrangarh absorb extreme heat between 12:30 and 15:30. Stone surfaces exceed 45°C.',
      affectedActivities: ['Open-air Fort Rampart Walks', 'Camel Dune Safaris'],
      recommendedAction:
        'Schedule palace ramparts before 11:00 AM or after 16:30 PM. Carry electrolyte hydration.',
      validUntil: 'Valid this week',
    },
    travelInsights: {
      bestTimeToStepOut: '06:30 – 10:30 & 17:00 – 21:00 IST',
      clothingRecommendation: 'Breathable linen garments, uv-blocking sunglasses & cotton scarf (gamcha)',
      indoorBackupOption: 'City Palace archival museum & Johari Bazaar covered jeweler arcades',
      transitCaution: 'Desert highway between Jodhpur and Jaisalmer has limited fuel & shaded stops',
    },
    hourly: [
      {
        time: '08:00',
        tempC: 29,
        tempF: toFahrenheit(29),
        condition: 'sunny',
        conditionText: 'Mild Crisp Morning',
        precipitationProbability: 0,
        humidity: 34,
        windSpeedKmH: 10,
      },
      {
        time: '11:00',
        tempC: 35,
        tempF: toFahrenheit(35),
        condition: 'sunny',
        conditionText: 'Intense Sun',
        precipitationProbability: 0,
        humidity: 26,
        windSpeedKmH: 13,
      },
      {
        time: '14:00',
        tempC: 38,
        tempF: toFahrenheit(38),
        condition: 'sunny',
        conditionText: 'Desert Heat Peak',
        precipitationProbability: 0,
        humidity: 22,
        windSpeedKmH: 16,
      },
      {
        time: '17:00',
        tempC: 34,
        tempF: toFahrenheit(34),
        condition: 'sunny',
        conditionText: 'Golden Hour Warmth',
        precipitationProbability: 0,
        humidity: 25,
        windSpeedKmH: 15,
      },
      {
        time: '20:00',
        tempC: 30,
        tempF: toFahrenheit(30),
        condition: 'sunny',
        conditionText: 'Cooling Desert Evening',
        precipitationProbability: 0,
        humidity: 32,
        windSpeedKmH: 12,
      },
      {
        time: '23:00',
        tempC: 26,
        tempF: toFahrenheit(26),
        condition: 'sunny',
        conditionText: 'Clear Starlit Night',
        precipitationProbability: 0,
        humidity: 38,
        windSpeedKmH: 9,
      },
    ],
    daily: [
      {
        date: '2026-06-10',
        dayName: 'Day 1 (Jaipur)',
        condition: 'sunny',
        conditionText: 'Pure Sun',
        tempHighC: 38,
        tempLowC: 26,
        tempHighF: toFahrenheit(38),
        tempLowF: toFahrenheit(26),
        precipitationProbability: 0,
        humidity: 25,
        windSpeedKmH: 12,
        uvIndex: 10,
        sunrise: '05:32 AM',
        sunset: '07:18 PM',
        packingAdvisory: 'UPF 50+ clothing and hydration pack',
        activityRecommendation: 'Sunrise at Amber Fort followed by air-conditioned Haveli museums',
      },
      {
        date: '2026-06-11',
        dayName: 'Day 2 (Jodhpur)',
        condition: 'sunny',
        conditionText: 'Clear Blue Skies',
        tempHighC: 39,
        tempLowC: 27,
        tempHighF: toFahrenheit(39),
        tempLowF: toFahrenheit(27),
        precipitationProbability: 0,
        humidity: 23,
        windSpeedKmH: 14,
        uvIndex: 10,
        sunrise: '05:33 AM',
        sunset: '07:19 PM',
        packingAdvisory: 'Cushioned footwear for stone steps',
        activityRecommendation: 'Explore shaded blue alleyways in the early morning hours',
      },
      {
        date: '2026-06-12',
        dayName: 'Day 3 (Thar Dunes)',
        condition: 'windy',
        conditionText: 'Dry Breeze with Fine Dust',
        tempHighC: 37,
        tempLowC: 24,
        tempHighF: toFahrenheit(37),
        tempLowF: toFahrenheit(24),
        precipitationProbability: 0,
        humidity: 20,
        windSpeedKmH: 26,
        uvIndex: 9,
        sunrise: '05:35 AM',
        sunset: '07:22 PM',
        packingAdvisory: 'Goggles/scarf for dune sand protection',
        activityRecommendation: 'Sunset camel safari starts at 17:30 as wind subsides',
      },
      {
        date: '2026-06-13',
        dayName: 'Day 4 (Udaipur)',
        condition: 'partly_cloudy',
        conditionText: 'Lakeside Pleasant Breeze',
        tempHighC: 34,
        tempLowC: 24,
        tempHighF: toFahrenheit(34),
        tempLowF: toFahrenheit(24),
        precipitationProbability: 10,
        humidity: 45,
        windSpeedKmH: 14,
        uvIndex: 8,
        sunrise: '05:36 AM',
        sunset: '07:20 PM',
        packingAdvisory: 'Casual evening smart dress for lake dining',
        activityRecommendation: 'Sunset solar boat ride on Lake Pichola has optimal lighting',
      },
      {
        date: '2026-06-14',
        dayName: 'Day 5 (Heritage)',
        condition: 'sunny',
        conditionText: 'Sunny & Warm',
        tempHighC: 36,
        tempLowC: 25,
        tempHighF: toFahrenheit(36),
        tempLowF: toFahrenheit(25),
        precipitationProbability: 0,
        humidity: 35,
        windSpeedKmH: 11,
        uvIndex: 9,
        sunrise: '05:36 AM',
        sunset: '07:21 PM',
        packingAdvisory: 'Sun hat & portable hand fan',
        activityRecommendation: 'Artisan textile block-printing workshop in cool shaded courtyard',
      },
    ],
  },

  dest_kerala_01: {
    destinationId: 'dest_kerala_01',
    destinationName: 'Kerala',
    region: 'Malabar Coast & Western Ghats',
    country: 'India',
    coordinates: { lat: 9.9312, lng: 76.2673 },
    currentTempC: 29,
    currentTempF: toFahrenheit(29),
    feelsLikeC: 32,
    feelsLikeF: toFahrenheit(32),
    condition: 'rainy',
    conditionText: 'Light Tropical Drizzle with Fresh Earth Aroma',
    humidity: 88,
    windSpeedKmH: 15,
    windDirection: 'SW',
    visibilityKm: 8.0,
    uvIndex: 5,
    airQualityIndex: 28,
    airQualityLabel: 'Good',
    lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    disruptionAlert: null,
    travelInsights: {
      bestTimeToStepOut: 'Morning mist hours (06:30 – 10:00) & late afternoon (15:30 – 18:30)',
      clothingRecommendation: 'Quick-dry outdoor wear, rain poncho & water-resistant boots',
      indoorBackupOption: 'Ayurvedic traditional oil therapy retreat & spice museum visit',
      transitCaution: 'Munnar mountain hairpin curves can have reduced visibility under mist',
    },
    hourly: [
      {
        time: '08:00',
        tempC: 26,
        tempF: toFahrenheit(26),
        condition: 'foggy',
        conditionText: 'Misty Hills',
        precipitationProbability: 20,
        humidity: 92,
        windSpeedKmH: 8,
      },
      {
        time: '11:00',
        tempC: 29,
        tempF: toFahrenheit(29),
        condition: 'partly_cloudy',
        conditionText: 'Overcast & Warm',
        precipitationProbability: 35,
        humidity: 84,
        windSpeedKmH: 14,
      },
      {
        time: '14:00',
        tempC: 30,
        tempF: toFahrenheit(30),
        condition: 'rainy',
        conditionText: 'Passing Rain',
        precipitationProbability: 60,
        humidity: 89,
        windSpeedKmH: 18,
      },
      {
        time: '17:00',
        tempC: 28,
        tempF: toFahrenheit(28),
        condition: 'partly_cloudy',
        conditionText: 'Fresh Breezes',
        precipitationProbability: 25,
        humidity: 86,
        windSpeedKmH: 12,
      },
      {
        time: '20:00',
        tempC: 26,
        tempF: toFahrenheit(26),
        condition: 'cloudy',
        conditionText: 'Peaceful Night Waters',
        precipitationProbability: 15,
        humidity: 90,
        windSpeedKmH: 10,
      },
      {
        time: '23:00',
        tempC: 25,
        tempF: toFahrenheit(25),
        condition: 'cloudy',
        conditionText: 'Cool River Breeze',
        precipitationProbability: 10,
        humidity: 94,
        windSpeedKmH: 7,
      },
    ],
    daily: [
      {
        date: '2026-05-20',
        dayName: 'Day 1 (Kochi)',
        condition: 'partly_cloudy',
        conditionText: 'Partly Cloudy & Warm',
        tempHighC: 31,
        tempLowC: 25,
        tempHighF: toFahrenheit(31),
        tempLowF: toFahrenheit(25),
        precipitationProbability: 30,
        humidity: 82,
        windSpeedKmH: 14,
        uvIndex: 7,
        sunrise: '06:02 AM',
        sunset: '06:44 PM',
        packingAdvisory: 'Breathable linens & umbrella',
        activityRecommendation: 'Heritage walk by Chinese fishing nets in Fort Kochi',
      },
      {
        date: '2026-05-21',
        dayName: 'Day 2 (Alleppey)',
        condition: 'rainy',
        conditionText: 'Afternoon Rain Showers',
        tempHighC: 30,
        tempLowC: 25,
        tempHighF: toFahrenheit(30),
        tempLowF: toFahrenheit(25),
        precipitationProbability: 70,
        humidity: 88,
        windSpeedKmH: 16,
        uvIndex: 5,
        sunrise: '06:02 AM',
        sunset: '06:44 PM',
        packingAdvisory: 'Waterproof phone casing & mosquito repeller',
        activityRecommendation: 'Houseboat cruising is magnificent as rain taps on thatched bamboo roof',
      },
      {
        date: '2026-05-22',
        dayName: 'Day 3 (Munnar)',
        condition: 'cloudy',
        conditionText: 'Misty Tea Hills',
        tempHighC: 24,
        tempLowC: 16,
        tempHighF: toFahrenheit(24),
        tempLowF: toFahrenheit(16),
        precipitationProbability: 40,
        humidity: 85,
        windSpeedKmH: 12,
        uvIndex: 6,
        sunrise: '06:01 AM',
        sunset: '06:45 PM',
        packingAdvisory: 'Light cardigan or sweater for evening hill chill',
        activityRecommendation: 'Walk through Kolukkumalai tea estate early morning',
      },
      {
        date: '2026-05-23',
        dayName: 'Day 4 (Periyar)',
        condition: 'partly_cloudy',
        conditionText: 'Sunny Intervals',
        tempHighC: 28,
        tempLowC: 20,
        tempHighF: toFahrenheit(28),
        tempLowF: toFahrenheit(20),
        precipitationProbability: 25,
        humidity: 80,
        windSpeedKmH: 11,
        uvIndex: 7,
        sunrise: '06:01 AM',
        sunset: '06:45 PM',
        packingAdvisory: 'Sturdy hiking trainers for jungle trails',
        activityRecommendation: 'Lake boat safari for wild elephant sightings at the water bank',
      },
      {
        date: '2026-05-24',
        dayName: 'Day 5 (Coast)',
        condition: 'sunny',
        conditionText: 'Warm Coastal Sun',
        tempHighC: 31,
        tempLowC: 25,
        tempHighF: toFahrenheit(31),
        tempLowF: toFahrenheit(25),
        precipitationProbability: 15,
        humidity: 78,
        windSpeedKmH: 15,
        uvIndex: 8,
        sunrise: '06:01 AM',
        sunset: '06:45 PM',
        packingAdvisory: 'Swimwear and beach towel',
        activityRecommendation: 'Sunset cliff view at Marari or Varkala Beach',
      },
    ],
  },

  dest_kashmir_01: {
    destinationId: 'dest_kashmir_01',
    destinationName: 'Kashmir',
    region: 'Western Himalayas',
    country: 'India',
    coordinates: { lat: 34.0837, lng: 74.7973 },
    currentTempC: 19,
    currentTempF: toFahrenheit(19),
    feelsLikeC: 19,
    feelsLikeF: toFahrenheit(19),
    condition: 'sunny',
    conditionText: 'Crisp Alpine Sunshine & Mountain Air',
    humidity: 48,
    windSpeedKmH: 11,
    windDirection: 'NNE',
    visibilityKm: 15.0,
    uvIndex: 7,
    airQualityIndex: 18,
    airQualityLabel: 'Good',
    lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    disruptionAlert: null,
    travelInsights: {
      bestTimeToStepOut: 'All day (08:00 – 17:30); temperatures drop quickly after sunset',
      clothingRecommendation: 'Fleece pullover, windbreaker jacket, comfortable walking boots',
      indoorBackupOption: 'Traditional Kashmiri cedar wood carving workshop & Wazwan feast',
      transitCaution: 'Gulmarg Gondola Phase 2 is sensitive to high wind speeds above 45 km/h',
    },
    hourly: [
      {
        time: '08:00',
        tempC: 14,
        tempF: toFahrenheit(14),
        condition: 'sunny',
        conditionText: 'Crisp Morning',
        precipitationProbability: 0,
        humidity: 62,
        windSpeedKmH: 6,
      },
      {
        time: '11:00',
        tempC: 18,
        tempF: toFahrenheit(18),
        condition: 'sunny',
        conditionText: 'Pleasant Sun',
        precipitationProbability: 0,
        humidity: 50,
        windSpeedKmH: 10,
      },
      {
        time: '14:00',
        tempC: 21,
        tempF: toFahrenheit(21),
        condition: 'partly_cloudy',
        conditionText: 'Scattered High Clouds',
        precipitationProbability: 5,
        humidity: 44,
        windSpeedKmH: 13,
      },
      {
        time: '17:00',
        tempC: 19,
        tempF: toFahrenheit(19),
        condition: 'sunny',
        conditionText: 'Golden Pine Shadows',
        precipitationProbability: 0,
        humidity: 52,
        windSpeedKmH: 12,
      },
      {
        time: '20:00',
        tempC: 15,
        tempF: toFahrenheit(15),
        condition: 'sunny',
        conditionText: 'Chilly Alpine Evening',
        precipitationProbability: 0,
        humidity: 65,
        windSpeedKmH: 8,
      },
      {
        time: '23:00',
        tempC: 12,
        tempF: toFahrenheit(12),
        condition: 'sunny',
        conditionText: 'Starry Mountain Night',
        precipitationProbability: 0,
        humidity: 70,
        windSpeedKmH: 5,
      },
    ],
    daily: [
      {
        date: '2026-06-01',
        dayName: 'Day 1 (Dal Lake)',
        condition: 'sunny',
        conditionText: 'Crystal Skies',
        tempHighC: 22,
        tempLowC: 11,
        tempHighF: toFahrenheit(22),
        tempLowF: toFahrenheit(11),
        precipitationProbability: 0,
        humidity: 50,
        windSpeedKmH: 9,
        uvIndex: 7,
        sunrise: '05:22 AM',
        sunset: '07:35 PM',
        packingAdvisory: 'Pashmina or shawl for evening lake breeze',
        activityRecommendation: 'Sunrise shikara to floating vegetable market on Dal Lake',
      },
      {
        date: '2026-06-02',
        dayName: 'Day 2 (Gulmarg)',
        condition: 'partly_cloudy',
        conditionText: 'Breezy at High Altitudes',
        tempHighC: 16,
        tempLowC: 6,
        tempHighF: toFahrenheit(16),
        tempLowF: toFahrenheit(6),
        precipitationProbability: 10,
        humidity: 55,
        windSpeedKmH: 19,
        uvIndex: 8,
        sunrise: '05:22 AM',
        sunset: '07:36 PM',
        packingAdvisory: 'Thermal layers and winter gloves for Apharwat Peak',
        activityRecommendation: 'Gondola ride to 3,980m summit; pristine snow line conditions',
      },
      {
        date: '2026-06-03',
        dayName: 'Day 3 (Pahalgam)',
        condition: 'sunny',
        conditionText: 'Warm Pine Valley',
        tempHighC: 21,
        tempLowC: 9,
        tempHighF: toFahrenheit(21),
        tempLowF: toFahrenheit(9),
        precipitationProbability: 5,
        humidity: 52,
        windSpeedKmH: 10,
        uvIndex: 7,
        sunrise: '05:21 AM',
        sunset: '07:36 PM',
        packingAdvisory: 'Sturdy trekking boots and sunscreen',
        activityRecommendation: 'Lidder river walk and Betaab Valley meadow picnic',
      },
      {
        date: '2026-06-04',
        dayName: 'Day 4 (Sonamarg)',
        condition: 'partly_cloudy',
        conditionText: 'Glacier Winds',
        tempHighC: 17,
        tempLowC: 7,
        tempHighF: toFahrenheit(17),
        tempLowF: toFahrenheit(7),
        precipitationProbability: 15,
        humidity: 58,
        windSpeedKmH: 16,
        uvIndex: 8,
        sunrise: '05:21 AM',
        sunset: '07:37 PM',
        packingAdvisory: 'Waterproof jacket & wool socks',
        activityRecommendation: 'Pony ride or trek toward Thajiwas Glacier',
      },
      {
        date: '2026-06-05',
        dayName: 'Day 5 (Gardens)',
        condition: 'sunny',
        conditionText: 'Blooming Sun',
        tempHighC: 23,
        tempLowC: 12,
        tempHighF: toFahrenheit(23),
        tempLowF: toFahrenheit(12),
        precipitationProbability: 0,
        humidity: 48,
        windSpeedKmH: 8,
        uvIndex: 7,
        sunrise: '05:21 AM',
        sunset: '07:37 PM',
        packingAdvisory: 'Light cardigan & sunglasses',
        activityRecommendation: 'Mughal terraced gardens at Shalimar & Nishat Bagh in full bloom',
      },
    ],
  },

  dest_bali_01: {
    destinationId: 'dest_bali_01',
    destinationName: 'Bali',
    region: 'Lesser Sunda Islands',
    country: 'Indonesia',
    coordinates: { lat: -8.3405, lng: 115.092 },
    currentTempC: 28,
    currentTempF: toFahrenheit(28),
    feelsLikeC: 31,
    feelsLikeF: toFahrenheit(31),
    condition: 'partly_cloudy',
    conditionText: 'Warm Island Breeze & Scattered Clouds',
    humidity: 76,
    windSpeedKmH: 16,
    windDirection: 'ESE',
    visibilityKm: 10.0,
    uvIndex: 9,
    airQualityIndex: 32,
    airQualityLabel: 'Good',
    lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    disruptionAlert: null,
    travelInsights: {
      bestTimeToStepOut: '06:00 – 11:00 & 16:00 – 19:30 WITA',
      clothingRecommendation: 'Light tropical resort wear, temple sarong & sandals',
      indoorBackupOption: 'Ubud artisan silver jewelry making & cacao cooking masterclass',
      transitCaution: 'Ubud to Canggu transit times double between 17:00 and 19:30',
    },
    hourly: [
      {
        time: '08:00',
        tempC: 26,
        tempF: toFahrenheit(26),
        condition: 'sunny',
        conditionText: 'Sunny Morning',
        precipitationProbability: 10,
        humidity: 80,
        windSpeedKmH: 12,
      },
      {
        time: '11:00',
        tempC: 30,
        tempF: toFahrenheit(30),
        condition: 'partly_cloudy',
        conditionText: 'Warm Tropical Sun',
        precipitationProbability: 15,
        humidity: 72,
        windSpeedKmH: 17,
      },
      {
        time: '14:00',
        tempC: 31,
        tempF: toFahrenheit(31),
        condition: 'partly_cloudy',
        conditionText: 'Humid & Bright',
        precipitationProbability: 20,
        humidity: 70,
        windSpeedKmH: 18,
      },
      {
        time: '17:00',
        tempC: 29,
        tempF: toFahrenheit(29),
        condition: 'sunny',
        conditionText: 'Sunset Glow',
        precipitationProbability: 10,
        humidity: 75,
        windSpeedKmH: 15,
      },
      {
        time: '20:00',
        tempC: 27,
        tempF: toFahrenheit(27),
        condition: 'partly_cloudy',
        conditionText: 'Warm Starry Night',
        precipitationProbability: 10,
        humidity: 82,
        windSpeedKmH: 12,
      },
      {
        time: '23:00',
        tempC: 26,
        tempF: toFahrenheit(26),
        condition: 'partly_cloudy',
        conditionText: 'Gentle Ocean Air',
        precipitationProbability: 5,
        humidity: 84,
        windSpeedKmH: 10,
      },
    ],
    daily: [
      {
        date: '2026-07-01',
        dayName: 'Day 1 (Ubud)',
        condition: 'partly_cloudy',
        conditionText: 'Tropical Canopy Sun',
        tempHighC: 30,
        tempLowC: 23,
        tempHighF: toFahrenheit(30),
        tempLowF: toFahrenheit(23),
        precipitationProbability: 15,
        humidity: 75,
        windSpeedKmH: 14,
        uvIndex: 9,
        sunrise: '06:30 AM',
        sunset: '06:12 PM',
        packingAdvisory: 'Insect repeller & breathable cotton shirts',
        activityRecommendation: 'Tegallalang rice terrace walk at first light',
      },
      {
        date: '2026-07-02',
        dayName: 'Day 2 (Batur)',
        condition: 'sunny',
        conditionText: 'Crisp Crater Dawn',
        tempHighC: 28,
        tempLowC: 18,
        tempHighF: toFahrenheit(28),
        tempLowF: toFahrenheit(18),
        precipitationProbability: 5,
        humidity: 68,
        windSpeedKmH: 16,
        uvIndex: 9,
        sunrise: '06:30 AM',
        sunset: '06:12 PM',
        packingAdvisory: 'Light jacket for early mountain climb',
        activityRecommendation: 'Mount Batur sunrise volcano trek and natural thermal springs',
      },
      {
        date: '2026-07-03',
        dayName: 'Day 3 (Uluwatu)',
        condition: 'sunny',
        conditionText: 'Clear Ocean Horizon',
        tempHighC: 31,
        tempLowC: 24,
        tempHighF: toFahrenheit(31),
        tempLowF: toFahrenheit(24),
        precipitationProbability: 10,
        humidity: 72,
        windSpeedKmH: 20,
        uvIndex: 10,
        sunrise: '06:31 AM',
        sunset: '06:13 PM',
        packingAdvisory: 'High-factor sunscreen & sunglasses',
        activityRecommendation: 'Cliffside Kecak fire dance overlooking breaking Indian Ocean waves',
      },
      {
        date: '2026-07-04',
        dayName: 'Day 4 (Nusa Penida)',
        condition: 'windy',
        conditionText: 'Coastal Breezes',
        tempHighC: 29,
        tempLowC: 23,
        tempHighF: toFahrenheit(29),
        tempLowF: toFahrenheit(23),
        precipitationProbability: 20,
        humidity: 76,
        windSpeedKmH: 25,
        uvIndex: 9,
        sunrise: '06:31 AM',
        sunset: '06:13 PM',
        packingAdvisory: 'Motion sickness tablets if taking speedboat',
        activityRecommendation: 'Kelingking T-Rex cliff viewpoint & manta ray snorkeling',
      },
      {
        date: '2026-07-05',
        dayName: 'Day 5 (Seminyak)',
        condition: 'sunny',
        conditionText: 'Golden Beach Sun',
        tempHighC: 30,
        tempLowC: 24,
        tempHighF: toFahrenheit(30),
        tempLowF: toFahrenheit(24),
        precipitationProbability: 10,
        humidity: 74,
        windSpeedKmH: 16,
        uvIndex: 9,
        sunrise: '06:31 AM',
        sunset: '06:13 PM',
        packingAdvisory: 'Beachwear & twilight dinner attire',
        activityRecommendation: 'Relaxing beach club daybed and seafood dinner on the sand',
      },
    ],
  },
};

export class WeatherService {
  private static cache: Map<string, { report: DestinationWeatherReport; timestamp: number }> =
    new Map();

  /**
   * Fetches real-time weather telemetry for a specific destination.
   * Simulates network latency (250-450ms) to provide a realistic API experience.
   */
  public static async getWeatherForDestination(
    destinationId: string,
    forceFresh = false
  ): Promise<DestinationWeatherReport> {
    const cached = this.cache.get(destinationId);
    const now = Date.now();

    if (!forceFresh && cached && now - cached.timestamp < 1000 * 60 * 3) {
      return cached.report;
    }

    const fixture =
      DESTINATION_WEATHER_FIXTURES[destinationId] ||
      DESTINATION_WEATHER_FIXTURES['dest_goa_01'];

    try {
      const params = {
        latitude: fixture.coordinates.lat,
        longitude: fixture.coordinates.lng,
        daily: ["weather_code", "temperature_2m_max", "temperature_2m_min", "sunset", "sunrise", "precipitation_probability_max", "uv_index_max"],
        hourly: ["temperature_2m", "weather_code", "precipitation_probability", "relative_humidity_2m", "wind_speed_10m"],
        current: ["temperature_2m", "apparent_temperature", "weather_code", "relative_humidity_2m", "wind_speed_10m", "wind_direction_10m", "is_day"],
        timezone: "auto",
        past_days: 0,
        forecast_days: 7,
      };
      const url = "https://api.open-meteo.com/v1/forecast";
      const responses = await fetchWeatherApi(url, params);
      
      const response = responses[0];
      const current = response.current()!;
      const hourly = response.hourly()!;
      const daily = response.daily()!;
      const utcOffsetSeconds = response.utcOffsetSeconds();

      const currentTemp = Math.round(current.variables(0)!.value());
      const feelsLike = Math.round(current.variables(1)!.value());
      const weatherCode = current.variables(2)!.value();
      const humidity = Math.round(current.variables(3)!.value());
      const windSpeed = Math.round(current.variables(4)!.value());
      
      const condition = mapWMOToCondition(weatherCode);
      const conditionText = mapWMOToText(weatherCode);

      const hourlyTemps = hourly.variables(0)!.valuesArray()!;
      const hourlyCodes = hourly.variables(1)!.valuesArray()!;
      const hourlyPrecip = hourly.variables(2)!.valuesArray()!;
      const hourlyHumidity = hourly.variables(3)!.valuesArray()!;
      const hourlyWind = hourly.variables(4)!.valuesArray()!;

      const parsedHourly = [];
      const hourOffset = new Date().getHours();
      for (let i = 0; i < 6; i++) {
         const idx = hourOffset + (i * 3);
         parsedHourly.push({
           time: `${(hourOffset + i * 3) % 24}:00`.padStart(5, '0'),
           tempC: Math.round(hourlyTemps[idx]),
           tempF: toFahrenheit(Math.round(hourlyTemps[idx])),
           condition: mapWMOToCondition(hourlyCodes[idx]),
           conditionText: mapWMOToText(hourlyCodes[idx]),
           precipitationProbability: Math.round(hourlyPrecip[idx]),
           humidity: Math.round(hourlyHumidity[idx]),
           windSpeedKmH: Math.round(hourlyWind[idx]),
         });
      }

      const dailyCodes = daily.variables(0)!.valuesArray()!;
      const dailyMax = daily.variables(1)!.valuesArray()!;
      const dailyMin = daily.variables(2)!.valuesArray()!;
      const dailyPrecip = daily.variables(5)!.valuesArray()!;
      const dailyUv = daily.variables(6)!.valuesArray()!;
      const sunset = daily.variables(3)!;
      const sunrise = daily.variables(4)!;

      const parsedDaily = [];
      for (let i = 0; i < 5; i++) {
         const srDate = new Date((Number(sunrise.valuesInt64(i)) + utcOffsetSeconds) * 1000);
         const ssDate = new Date((Number(sunset.valuesInt64(i)) + utcOffsetSeconds) * 1000);
         const dateObj = new Date();
         dateObj.setDate(dateObj.getDate() + i);

         parsedDaily.push({
           date: dateObj.toISOString().split('T')[0],
           dayName: i === 0 ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
           condition: mapWMOToCondition(dailyCodes[i]),
           conditionText: mapWMOToText(dailyCodes[i]),
           tempHighC: Math.round(dailyMax[i]),
           tempLowC: Math.round(dailyMin[i]),
           tempHighF: toFahrenheit(Math.round(dailyMax[i])),
           tempLowF: toFahrenheit(Math.round(dailyMin[i])),
           precipitationProbability: Math.round(dailyPrecip[i] || 0),
           humidity: fixture.daily[i]?.humidity || 75,
           windSpeedKmH: fixture.daily[i]?.windSpeedKmH || 15,
           uvIndex: Math.round(dailyUv[i] || 8),
           sunrise: srDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
           sunset: ssDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
           packingAdvisory: fixture.daily[i]?.packingAdvisory || 'Weather appropriate clothing',
           activityRecommendation: fixture.daily[i]?.activityRecommendation || 'Adjust plans to weather',
         });
      }

      const report: DestinationWeatherReport = {
        ...fixture,
        currentTempC: currentTemp,
        currentTempF: toFahrenheit(currentTemp),
        feelsLikeC: feelsLike,
        feelsLikeF: toFahrenheit(feelsLike),
        condition: condition,
        conditionText: conditionText,
        humidity: humidity,
        windSpeedKmH: windSpeed,
        hourly: parsedHourly,
        daily: parsedDaily,
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };

      this.cache.set(destinationId, { report, timestamp: now });
      return report;
    } catch (error) {
      console.warn("Failed to fetch from open-meteo, falling back to mock", error);
      const minuteJitter = Math.floor(Math.random() * 2) - 1;
      const report: DestinationWeatherReport = {
        ...fixture,
        currentTempC: fixture.currentTempC + (minuteJitter !== 0 ? minuteJitter : 0),
        currentTempF: toFahrenheit(fixture.currentTempC + (minuteJitter !== 0 ? minuteJitter : 0)),
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
      this.cache.set(destinationId, { report, timestamp: now });
      return report;
    }
  }

  /**
   * Retrieves all available destination weather reports for upcoming trips.
   */
  public static async getAllUpcomingWeather(): Promise<DestinationWeatherReport[]> {
    const ids = Object.keys(DESTINATION_WEATHER_FIXTURES);
    const results = await Promise.all(
      ids.map((id) => this.getWeatherForDestination(id))
    );
    return results;
  }

  /**
   * Simulates triggering a weather event change (e.g. sudden monsoon rain or clear skies)
   * to showcase the Living Journey Engine reactive model.
   */
  public static simulateWeatherDisruption(
    destinationId: string,
    condition: WeatherCondition,
    alertTitle: string,
    alertDesc: string
  ): DestinationWeatherReport {
    const base = DESTINATION_WEATHER_FIXTURES[destinationId] || DESTINATION_WEATHER_FIXTURES['dest_goa_01'];
    const updated: DestinationWeatherReport = {
      ...base,
      condition,
      conditionText: condition === 'rainy' ? 'Heavy Tropical Downpour & Squall' : 'High Wind Squall',
      disruptionAlert: {
        id: `alert_${Date.now()}`,
        severity: 'severe',
        title: alertTitle,
        description: alertDesc,
        affectedActivities: ['Outdoor Kayaking', 'Open Sea Ferry', 'Cliffside Hiking'],
        recommendedAction: 'Living Journey Engine triggered automatic alternative proposal.',
        validUntil: 'Next 4 hours',
      },
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    this.cache.set(destinationId, { report: updated, timestamp: Date.now() });
    return updated;
  }
}
