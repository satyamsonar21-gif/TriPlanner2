import React, { useEffect, useState } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { WeatherService } from '@/domains/weather/weather.service';
import { MapPin } from 'lucide-react';

interface DestinationMapProps {
  destinationId: string;
}

export const DestinationMap: React.FC<DestinationMapProps> = ({ destinationId }) => {
  const [viewState, setViewState] = useState({
    longitude: 74.124, // Default to Goa
    latitude: 15.2993,
    zoom: 10,
  });

  useEffect(() => {
    async function loadCoordinates() {
      try {
        const report = await WeatherService.getWeatherForDestination(destinationId);
        if (report && report.coordinates) {
          setViewState(prev => ({
            ...prev,
            longitude: report.coordinates.lng,
            latitude: report.coordinates.lat,
          }));
        }
      } catch (err) {
        console.warn('Failed to load coordinates for map', err);
      }
    }
    loadCoordinates();
  }, [destinationId]);

  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  if (!mapboxToken) {
    return (
      <div className="bg-[#FFF9F3] border border-[#33231E]/15 rounded-2xl shadow-xs p-6 flex flex-col items-center justify-center text-center h-64">
        <MapPin className="w-8 h-8 text-stone-gray mb-3 opacity-50" />
        <h4 className="font-display text-sm font-semibold text-[#1C1410]">Map Integration Required</h4>
        <p className="text-[11px] text-[#8A7B75] mt-1 max-w-[200px]">
          Please configure VITE_MAPBOX_ACCESS_TOKEN in your environment variables.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#FFF9F3] border border-[#33231E]/15 rounded-2xl shadow-xs overflow-hidden h-64 sm:h-80 relative group">
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-[#33231E]/10 shadow-sm flex items-center gap-2">
        <MapPin className="w-4 h-4 text-terracotta" />
        <span className="text-xs font-semibold text-[#1C1410]">Live Map</span>
      </div>
      
      <Map
        {...viewState}
        onMove={(evt: any) => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={mapboxToken}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
      >
        <NavigationControl position="bottom-right" />
        <Marker longitude={viewState.longitude} latitude={viewState.latitude} anchor="bottom">
          <div className="w-8 h-8 flex items-center justify-center cursor-pointer transition-transform hover:scale-110">
            <MapPin className="w-8 h-8 text-terracotta fill-terracotta/20 drop-shadow-md" />
          </div>
        </Marker>
      </Map>
    </div>
  );
};
