import React, { useEffect, useState } from 'react';
import Map, { Marker, NavigationControl, Source, Layer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { WeatherService } from '@/domains/weather/weather.service';
import { MapPin, Navigation } from 'lucide-react';

interface DestinationMapProps {
  destinationId: string;
  originCity?: string;
}

export const DestinationMap: React.FC<DestinationMapProps> = ({ destinationId, originCity }) => {
  const [viewState, setViewState] = useState({
    longitude: 74.124,
    latitude: 15.2993,
    zoom: 10,
  });

  const [destCoords, setDestCoords] = useState<{lat: number, lng: number} | null>(null);
  const [originCoords, setOriginCoords] = useState<{lat: number, lng: number} | null>(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);

  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  const routingToken = import.meta.env.VITE_ROUTING_API_KEY;

  // 1. Fetch Destination Coordinates
  useEffect(() => {
    async function loadDest() {
      try {
        const report = await WeatherService.getWeatherForDestination(destinationId);
        if (report && report.coordinates) {
          setDestCoords(report.coordinates);
          setViewState(prev => ({
            ...prev,
            longitude: report.coordinates.lng,
            latitude: report.coordinates.lat,
          }));
        }
      } catch (err) {
        console.warn('Failed to load dest coords', err);
      }
    }
    loadDest();
  }, [destinationId]);

  // 2. Fetch Origin Coordinates if originCity is provided
  useEffect(() => {
    async function loadOrigin() {
      if (!originCity || !mapboxToken) return;
      try {
        const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(originCity)}.json?access_token=${mapboxToken}`);
        const data = await res.json();
        if (data.features && data.features.length > 0) {
          const [lng, lat] = data.features[0].center;
          setOriginCoords({ lat, lng });
        }
      } catch (err) {
        console.warn('Failed to geocode origin', err);
      }
    }
    loadOrigin();
  }, [originCity, mapboxToken]);

  // 3. Fetch Route from Origin to Destination
  useEffect(() => {
    async function loadRoute() {
      if (!originCoords || !destCoords || !routingToken) return;
      try {
        const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${routingToken}&start=${originCoords.lng},${originCoords.lat}&end=${destCoords.lng},${destCoords.lat}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          // openrouteservice GET /v2/directions/ returns a FeatureCollection
          if (data.features && data.features.length > 0) {
            setRouteGeoJSON(data);
            
            // Adjust viewState to zoom out and fit the route approximately
            setViewState({
              longitude: (originCoords.lng + destCoords.lng) / 2,
              latitude: (originCoords.lat + destCoords.lat) / 2,
              zoom: 4, // zoom out to see both if they are far apart
            });
          }
        } else {
          console.warn('Routing API error', await res.text());
        }
      } catch (err) {
        console.warn('Failed to load route', err);
      }
    }
    loadRoute();
  }, [originCoords, destCoords, routingToken]);


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
        {routeGeoJSON ? <Navigation className="w-4 h-4 text-emerald-600" /> : <MapPin className="w-4 h-4 text-terracotta" />}
        <span className="text-xs font-semibold text-[#1C1410]">
          {routeGeoJSON ? 'Live Route Map' : 'Destination Map'}
        </span>
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
        
        {/* Destination Marker */}
        {destCoords && (
          <Marker longitude={destCoords.lng} latitude={destCoords.lat} anchor="bottom">
            <div className="w-8 h-8 flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-110">
              <span className="bg-terracotta text-white text-[9px] px-1.5 py-0.5 rounded shadow-sm mb-1 font-mono font-bold">DEST</span>
              <MapPin className="w-7 h-7 text-terracotta fill-terracotta/20 drop-shadow-md" />
            </div>
          </Marker>
        )}

        {/* Origin Marker */}
        {originCoords && (
          <Marker longitude={originCoords.lng} latitude={originCoords.lat} anchor="bottom">
            <div className="w-8 h-8 flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-110">
              <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded shadow-sm mb-1 font-mono font-bold">ORIGIN</span>
              <MapPin className="w-7 h-7 text-emerald-600 fill-emerald-600/20 drop-shadow-md" />
            </div>
          </Marker>
        )}

        {/* Route Line */}
        {routeGeoJSON && (
          <Source id="route" type="geojson" data={routeGeoJSON}>
            <Layer
              id="route-line"
              type="line"
              layout={{
                'line-join': 'round',
                'line-cap': 'round'
              }}
              paint={{
                'line-color': '#3b82f6', // blue-500
                'line-width': 4,
                'line-opacity': 0.8
              }}
            />
          </Source>
        )}
      </Map>
    </div>
  );
};
