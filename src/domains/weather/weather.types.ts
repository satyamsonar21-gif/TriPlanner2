export type WeatherCondition =
  | 'sunny'
  | 'partly_cloudy'
  | 'cloudy'
  | 'rainy'
  | 'thunderstorm'
  | 'foggy'
  | 'windy'
  | 'snowy';

export type TemperatureUnit = 'celsius' | 'fahrenheit';

export interface HourlyForecast {
  time: string;
  tempC: number;
  tempF: number;
  condition: WeatherCondition;
  conditionText: string;
  precipitationProbability: number;
  humidity: number;
  windSpeedKmH: number;
}

export interface DailyForecast {
  date: string;
  dayName: string;
  condition: WeatherCondition;
  conditionText: string;
  tempHighC: number;
  tempLowC: number;
  tempHighF: number;
  tempLowF: number;
  precipitationProbability: number;
  humidity: number;
  windSpeedKmH: number;
  uvIndex: number;
  sunrise: string;
  sunset: string;
  packingAdvisory: string;
  activityRecommendation: string;
}

export interface WeatherDisruptionAlert {
  id: string;
  severity: 'advisory' | 'moderate' | 'severe';
  title: string;
  description: string;
  affectedActivities: string[];
  recommendedAction: string;
  validUntil: string;
}

export interface TravelWeatherInsights {
  bestTimeToStepOut: string;
  clothingRecommendation: string;
  indoorBackupOption: string;
  transitCaution: string;
}

export interface DestinationWeatherReport {
  destinationId: string;
  destinationName: string;
  region: string;
  country: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  currentTempC: number;
  currentTempF: number;
  feelsLikeC: number;
  feelsLikeF: number;
  condition: WeatherCondition;
  conditionText: string;
  humidity: number;
  windSpeedKmH: number;
  windDirection: string;
  visibilityKm: number;
  uvIndex: number;
  airQualityIndex: number;
  airQualityLabel: 'Good' | 'Moderate' | 'Unhealthy for Sensitive' | 'Unhealthy';
  lastUpdated: string;
  disruptionAlert?: WeatherDisruptionAlert | null;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  travelInsights: TravelWeatherInsights;
}
