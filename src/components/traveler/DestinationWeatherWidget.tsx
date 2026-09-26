import React, { useState, useEffect, useCallback } from 'react';
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudLightning,
  CloudFog,
  Wind,
  Snowflake,
  Droplets,
  RefreshCw,
  AlertTriangle,
  Sunrise,
  Sunset,
  ShieldCheck,
  Sparkles,
  Shirt,
  Compass,
} from 'lucide-react';
import { WeatherService } from '@/domains/weather/weather.service';
import type {
  DestinationWeatherReport,
  DailyForecast,
  WeatherCondition,
  TemperatureUnit,
} from '@/domains/weather/weather.types';

interface DestinationWeatherWidgetProps {
  initialDestinationId?: string;
  className?: string;
}

const DESTINATION_TABS = [
  { id: 'dest_goa_01', name: 'Goa', tag: 'Upcoming 12 May', flag: '🌴' },
  { id: 'dest_rajasthan_01', name: 'Rajasthan', tag: 'Planning 10 Jun', flag: '🏜️' },
  { id: 'dest_kerala_01', name: 'Kerala', tag: 'Saved 20 May', flag: '🚣' },
  { id: 'dest_kashmir_01', name: 'Kashmir', tag: 'Himalayas', flag: '🏔️' },
  { id: 'dest_bali_01', name: 'Bali', tag: 'Island Break', flag: '🌺' },
];

export const DestinationWeatherWidget: React.FC<DestinationWeatherWidgetProps> = ({
  initialDestinationId = 'dest_goa_01',
  className = '',
}) => {
  const [activeDestId, setActiveDestId] = useState<string>(initialDestinationId);
  const [weather, setWeather] = useState<DestinationWeatherReport | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [unit, setUnit] = useState<TemperatureUnit>('celsius');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [simulatedRain, setSimulatedRain] = useState<boolean>(false);

  const loadWeather = useCallback(async (destId: string, forceFresh = false) => {
    try {
      setIsRefreshing(true);
      const data = await WeatherService.getWeatherForDestination(destId, forceFresh);
      setWeather(data);
      setSelectedDayIndex(0);
    } catch (err) {
      console.error('Failed to load weather telemetry', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWeather(activeDestId);
  }, [activeDestId, loadWeather]);

  // Handler for simulating sudden weather changes
  const handleToggleSimulation = () => {
    if (!weather) return;
    if (!simulatedRain) {
      const updated = WeatherService.simulateWeatherDisruption(
        activeDestId,
        'rainy',
        'Sudden Coastal Monsoon Squall Detected',
        'Strong crosswinds (38 km/h) & sudden torrential rain registered across Aguada bay. Water activities shifted.'
      );
      setWeather(updated);
      setSimulatedRain(true);
    } else {
      loadWeather(activeDestId, true);
      setSimulatedRain(false);
    }
  };

  const renderWeatherIcon = (
    condition: WeatherCondition,
    sizeClass = 'w-6 h-6',
    animated = false
  ) => {
    switch (condition) {
      case 'sunny':
        return (
          <Sun
            className={`${sizeClass} text-amber-500 ${
              animated ? 'animate-[spin_12s_linear_infinite]' : ''
            }`}
          />
        );
      case 'partly_cloudy':
        return (
          <CloudSun
            className={`${sizeClass} text-amber-500 ${
              animated ? 'animate-pulse duration-1000' : ''
            }`}
          />
        );
      case 'cloudy':
        return <Cloud className={`${sizeClass} text-stone-400`} />;
      case 'rainy':
        return (
          <CloudRain
            className={`${sizeClass} text-sky-600 ${
              animated ? 'animate-bounce duration-700' : ''
            }`}
          />
        );
      case 'thunderstorm':
        return <CloudLightning className={`${sizeClass} text-purple-600 animate-pulse`} />;
      case 'foggy':
        return <CloudFog className={`${sizeClass} text-stone-400`} />;
      case 'windy':
        return <Wind className={`${sizeClass} text-teal-600 animate-pulse`} />;
      case 'snowy':
        return <Snowflake className={`${sizeClass} text-sky-400 animate-spin`} />;
      default:
        return <Sun className={`${sizeClass} text-amber-500`} />;
    }
  };

  const formatTemp = (tempC: number, tempF: number) => {
    return unit === 'celsius' ? `${tempC}°C` : `${tempF}°F`;
  };

  if (isLoading && !weather) {
    return (
      <div className="bg-[#FFF9F3] border border-[#33231E]/15 rounded-2xl p-6 shadow-xs animate-pulse space-y-4">
        <div className="h-5 bg-[#33231E]/10 rounded w-1/3" />
        <div className="h-28 bg-[#33231E]/5 rounded-xl" />
        <div className="grid grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-[#33231E]/5 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!weather) return null;

  const activeDay: DailyForecast = weather.daily[selectedDayIndex] || weather.daily[0];

  return (
    <div
      className={`bg-[#FFF9F3] border border-[#33231E]/15 rounded-2xl shadow-xs overflow-hidden font-body transition-all ${className}`}
    >
      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & TELEMETRY STATUS BAR                         */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="px-5 sm:px-6 py-4 border-b border-[#33231E]/10 bg-gradient-to-r from-[#F7EFE6] via-[#FFF9F3] to-[#F7EFE6] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-terracotta/10 border border-terracotta/20 flex items-center justify-center text-terracotta">
            <Sun className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-base font-semibold text-[#1C1410] leading-none">
                Destination Environmental Telemetry
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-mono font-bold tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                Live API
              </span>
            </div>
            <p className="text-[11px] text-[#8A7B75] mt-0.5 font-mono">
              Synchronized with Living Journey Engine transit & weather models
            </p>
          </div>
        </div>

        {/* Controls: Unit toggle, Refresh, and Simulation Button */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Temperature Unit Toggle */}
          <div className="flex items-center bg-[#EAE2D8] p-0.5 rounded-lg text-[10px] font-mono font-bold">
            <button
              type="button"
              onClick={() => setUnit('celsius')}
              className={`px-2 py-1 rounded transition-colors ${
                unit === 'celsius'
                  ? 'bg-soft-ivory text-terracotta shadow-2xs font-extrabold'
                  : 'text-[#8A7B75] hover:text-[#1C1410]'
              }`}
            >
              °C
            </button>
            <button
              type="button"
              onClick={() => setUnit('fahrenheit')}
              className={`px-2 py-1 rounded transition-colors ${
                unit === 'fahrenheit'
                  ? 'bg-soft-ivory text-terracotta shadow-2xs font-extrabold'
                  : 'text-[#8A7B75] hover:text-[#1C1410]'
              }`}
            >
              °F
            </button>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => loadWeather(activeDestId, true)}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg border border-[#33231E]/15 bg-soft-ivory text-[#8A7B75] hover:text-[#1C1410] hover:bg-[#F4ECE3] transition-colors disabled:opacity-50"
            title="Refresh Real-Time Telemetry"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-terracotta' : ''}`}
            />
          </button>

          {/* Quick Simulation Trigger */}
          <button
            type="button"
            onClick={handleToggleSimulation}
            className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono uppercase tracking-wider flex items-center gap-1 transition-all ${
              simulatedRain
                ? 'bg-sky-100 border-sky-300 text-sky-800 font-bold'
                : 'bg-soft-ivory border-[#33231E]/20 text-[#8A7B75] hover:text-terracotta hover:border-terracotta/40'
            }`}
            title="Simulate sudden weather event to preview Living Journey Engine response"
          >
            <Sparkles className="w-3 h-3 text-terracotta" />
            <span>{simulatedRain ? 'Reset Weather' : 'Simulate Shift'}</span>
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. DESTINATION TABS STRIP                                    */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="px-5 sm:px-6 pt-3 pb-2 border-b border-[#33231E]/10 bg-[#FAF4ED] flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#8A7B75] mr-1 shrink-0">
          Target Region:
        </span>
        {DESTINATION_TABS.map((tab) => {
          const isActive = activeDestId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveDestId(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-soft-ivory text-[#1C1410] font-semibold shadow-2xs border border-terracotta/30 ring-1 ring-terracotta/15'
                  : 'text-[#8A7B75] hover:text-[#1C1410] hover:bg-black/5'
              }`}
            >
              <span>{tab.flag}</span>
              <span>{tab.name}</span>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                  isActive
                    ? 'bg-terracotta/10 text-terracotta font-semibold'
                    : 'text-[#8A7B75]/70'
                }`}
              >
                {tab.tag}
              </span>
            </button>
          );
        })}
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* ──────────────────────────────────────────────────────────── */}
        {/* 3. CURRENT WEATHER HERO TELEMETRY CARD                       */}
        {/* ──────────────────────────────────────────────────────────── */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#2D211C] via-[#3E2D27] to-[#1C1410] text-soft-ivory p-5 sm:p-6 shadow-sm">
          {/* Subtle Background Radial Aura */}
          <div
            className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none opacity-20 filter blur-2xl"
            style={{
              background:
                weather.condition === 'rainy'
                  ? 'radial-gradient(circle, #0284c7 0%, transparent 70%)'
                  : 'radial-gradient(circle, #f59e0b 0%, transparent 70%)',
            }}
          />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Left: Weather Condition & Main Temperature */}
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center shrink-0 shadow-inner">
                {renderWeatherIcon(weather.condition, 'w-10 h-10 sm:w-12 sm:h-12', true)}
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-4xl sm:text-5xl font-medium tracking-tight text-white">
                    {formatTemp(weather.currentTempC, weather.currentTempF)}
                  </span>
                  <span className="text-xs font-mono text-soft-ivory/70">
                    Feels like {formatTemp(weather.feelsLikeC, weather.feelsLikeF)}
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-semibold text-soft-ivory mt-0.5">
                  {weather.conditionText}
                </h4>
                <div className="flex items-center gap-2 text-[11px] font-mono text-soft-ivory/60 mt-1">
                  <span>
                    {weather.destinationName} • {weather.region}, {weather.country}
                  </span>
                  <span>•</span>
                  <span>Updated {weather.lastUpdated}</span>
                </div>
              </div>
            </div>

            {/* Right: 4 Environmental Metric Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 bg-white/5 backdrop-blur-sm border border-white/10 p-3 rounded-xl shrink-0">
              {/* Metric: Humidity */}
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[10px] font-mono text-soft-ivory/70">
                  <Droplets className="w-3 h-3 text-sky-300" />
                  <span>HUMIDITY</span>
                </div>
                <div className="font-mono text-sm sm:text-base font-bold text-white">
                  {weather.humidity}%
                </div>
                <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-400 h-full rounded-full"
                    style={{ width: `${weather.humidity}%` }}
                  />
                </div>
              </div>

              {/* Metric: Wind */}
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[10px] font-mono text-soft-ivory/70">
                  <Wind className="w-3 h-3 text-teal-300" />
                  <span>WIND</span>
                </div>
                <div className="font-mono text-sm sm:text-base font-bold text-white truncate">
                  {weather.windSpeedKmH} km/h
                </div>
                <span className="text-[9px] font-mono text-soft-ivory/60 block truncate">
                  {weather.windDirection} Breeze
                </span>
              </div>

              {/* Metric: UV Index */}
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[10px] font-mono text-soft-ivory/70">
                  <Sun className="w-3 h-3 text-amber-300" />
                  <span>UV INDEX</span>
                </div>
                <div className="font-mono text-sm sm:text-base font-bold text-white">
                  {weather.uvIndex} / 11
                </div>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded inline-block ${
                    weather.uvIndex >= 8
                      ? 'bg-rose-500/30 text-rose-200'
                      : weather.uvIndex >= 5
                      ? 'bg-amber-500/30 text-amber-200'
                      : 'bg-emerald-500/30 text-emerald-200'
                  }`}
                >
                  {weather.uvIndex >= 8 ? 'Very High' : weather.uvIndex >= 5 ? 'Moderate' : 'Low'}
                </span>
              </div>

              {/* Metric: Air Quality */}
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[10px] font-mono text-soft-ivory/70">
                  <ShieldCheck className="w-3 h-3 text-emerald-300" />
                  <span>AIR QUALITY</span>
                </div>
                <div className="font-mono text-sm sm:text-base font-bold text-white">
                  {weather.airQualityIndex} AQI
                </div>
                <span className="text-[9px] font-mono text-emerald-300 block truncate">
                  {weather.airQualityLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* 4. DISRUPTION ADVISORY BANNER (If Active Alert Exists)        */}
        {/* ──────────────────────────────────────────────────────────── */}
        {weather.disruptionAlert && (
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
              weather.disruptionAlert.severity === 'severe'
                ? 'bg-rose-50/90 border-rose-300 text-rose-950'
                : 'bg-amber-50/90 border-amber-300 text-amber-950'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  weather.disruptionAlert.severity === 'severe'
                    ? 'bg-rose-200 text-rose-700'
                    : 'bg-amber-200 text-amber-700'
                }`}
              >
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      weather.disruptionAlert.severity === 'severe'
                        ? 'bg-rose-200 text-rose-800'
                        : 'bg-amber-200 text-amber-800'
                    }`}
                  >
                    Living Engine Advisory • {weather.disruptionAlert.validUntil}
                  </span>
                </div>
                <h5 className="font-display text-sm font-semibold">
                  {weather.disruptionAlert.title}
                </h5>
                <p className="text-xs text-[#554742] leading-relaxed">
                  {weather.disruptionAlert.description}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-mono text-[#8A7B75] uppercase">
                    Affected Nodes:
                  </span>
                  {weather.disruptionAlert.affectedActivities.map((act, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/5 border border-black/10 font-medium"
                    >
                      {act}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="shrink-0 w-full sm:w-auto text-right">
              <span className="text-[11px] font-mono text-terracotta block sm:text-right font-medium">
                {weather.disruptionAlert.recommendedAction}
              </span>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────── */}
        {/* 5. 5-DAY INTERACTIVE FORECAST STRIP                          */}
        {/* ──────────────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#1C1410] tracking-wide block uppercase font-mono">
              5-Day Itinerary Weather Horizon
            </span>
            <span className="text-[11px] text-[#8A7B75] font-mono">
              Click day to inspect schedule feasibility & packing advice
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {weather.daily.map((day, idx) => {
              const isSelected = selectedDayIndex === idx;
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDayIndex(idx)}
                  className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-soft-ivory border-terracotta shadow-xs ring-2 ring-terracotta/20 scale-[1.02]'
                      : 'bg-[#FAF4ED] border-[#33231E]/10 hover:border-[#33231E]/25 hover:bg-[#F5EDE3]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-xs font-bold font-mono ${
                        isSelected ? 'text-terracotta' : 'text-[#1C1410]'
                      }`}
                    >
                      {day.dayName}
                    </span>
                    <span className="text-[9px] font-mono text-[#8A7B75]">
                      {day.date.slice(5)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 my-2">
                    {renderWeatherIcon(day.condition, 'w-6 h-6')}
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[#1C1410] block truncate">
                        {formatTemp(day.tempHighC, day.tempHighF)}
                      </span>
                      <span className="text-[10px] text-[#8A7B75] font-mono block">
                        Low {formatTemp(day.tempLowC, day.tempLowF)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#33231E]/10 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-[#8A7B75] flex items-center gap-0.5">
                      <Droplets className="w-2.5 h-2.5 text-sky-600" />
                      {day.precipitationProbability}%
                    </span>
                    <span
                      className={`font-semibold uppercase text-[9px] ${
                        day.precipitationProbability > 40
                          ? 'text-sky-700'
                          : 'text-[#8A7B75]'
                      }`}
                    >
                      {day.conditionText.split(' ')[0]}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* 6. DAY DETAIL BREAKDOWN: HOURLY & SMART TRAVELER GUIDANCE    */}
        {/* ──────────────────────────────────────────────────────────── */}
        <div className="p-5 rounded-2xl bg-[#FAF4ED] border border-[#33231E]/15 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#33231E]/10">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-terracotta">
                {activeDay.dayName}
              </span>
              <span className="text-xs text-[#8A7B75]">({activeDay.date})</span>
              <span className="text-xs font-semibold text-[#1C1410]">• {activeDay.conditionText}</span>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-[#8A7B75]">
              <span className="flex items-center gap-1">
                <Sunrise className="w-3.5 h-3.5 text-amber-600" />
                {activeDay.sunrise}
              </span>
              <span className="flex items-center gap-1">
                <Sunset className="w-3.5 h-3.5 text-orange-600" />
                {activeDay.sunset}
              </span>
            </div>
          </div>

          {/* Hourly Timeline */}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#8A7B75] block mb-2 font-medium">
              Intraday Temperature & Rain Probability
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {weather.hourly.map((h, i) => (
                <div
                  key={i}
                  className="bg-soft-ivory border border-[#33231E]/10 rounded-xl p-2.5 text-center shadow-2xs"
                >
                  <span className="text-[10px] font-mono text-[#8A7B75] block">{h.time}</span>
                  <div className="my-1.5 flex justify-center">
                    {renderWeatherIcon(h.condition, 'w-5 h-5')}
                  </div>
                  <span className="text-xs font-bold text-[#1C1410] block">
                    {formatTemp(h.tempC, h.tempF)}
                  </span>
                  <span className="text-[9px] font-mono text-sky-700 flex items-center justify-center gap-0.5 mt-0.5">
                    <Droplets className="w-2.5 h-2.5" />
                    {h.precipitationProbability}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Smart Packing & Travel Guidance Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
            {/* Box 1: Activity Recommendation & Packing */}
            <div className="p-4 rounded-xl bg-soft-ivory border border-[#33231E]/10 space-y-2">
              <div className="flex items-center gap-1.5 text-terracotta">
                <Shirt className="w-4 h-4 shrink-0" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider">
                  Smart Packing & Gear
                </span>
              </div>
              <p className="text-xs text-[#1C1410] leading-relaxed">
                {activeDay.packingAdvisory}
              </p>
              <div className="pt-1.5 border-t border-[#33231E]/10 text-[11px] text-[#8A7B75]">
                <strong className="text-[#1C1410]">Best window:</strong>{' '}
                {weather.travelInsights.bestTimeToStepOut}
              </div>
            </div>

            {/* Box 2: Itinerary Guidance & Indoor Backup */}
            <div className="p-4 rounded-xl bg-soft-ivory border border-[#33231E]/10 space-y-2">
              <div className="flex items-center gap-1.5 text-antique-brass">
                <Compass className="w-4 h-4 shrink-0" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider">
                  Itinerary Adaptation Advice
                </span>
              </div>
              <p className="text-xs text-[#1C1410] leading-relaxed">
                {activeDay.activityRecommendation}
              </p>
              <div className="pt-1.5 border-t border-[#33231E]/10 text-[11px] text-[#8A7B75]">
                <strong className="text-[#1C1410]">Backup venue:</strong>{' '}
                {weather.travelInsights.indoorBackupOption}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
