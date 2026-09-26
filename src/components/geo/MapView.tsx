/// <reference types="google.maps" />
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import {
  Compass,
  Navigation,
  AlertTriangle,
  RefreshCw,
  MapPin,
} from 'lucide-react';
import { env } from '../../config/env';

export interface MapMarkerItem {
  id: string;
  position: { lat: number; lng: number };
  title: string;
  subtitle?: string;
  sequenceNumber?: number;
  status?: 'confirmed' | 'disrupted' | 'candidate' | 'default';
  onClick?: () => void;
}

export interface MapViewProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarkerItem[];
  selectedMarkerId?: string | null;
  onSelectMarker?: (markerId: string) => void;
  showRoutePolyline?: boolean;
  isDemoData?: boolean;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  ariaLabel?: string;
  className?: string;
  onMapLoad?: (map: google.maps.Map) => void;
}

const TRIP_PLANNER_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#f5f0e6' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f0e6' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5c4a3d' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#c85a38' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#e6dec8' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#f0d4b5' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#cad8d8' }],
  },
];

export const MapView: React.FC<MapViewProps> = ({
  center,
  zoom = 12,
  markers = [],
  selectedMarkerId = null,
  onSelectMarker,
  showRoutePolyline = true,
  isDemoData = !env.isGoogleMapsConfigured,
  loading = false,
  error = null,
  onRetry,
  ariaLabel = 'Interactive Journey Route & Location Map',
  className = 'w-full h-80 sm:h-96 rounded-xl',
  onMapLoad,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [sdkLoadFailed, setSdkLoadFailed] = useState(false);
  const markersRef = useRef<Record<string, google.maps.Marker>>({});
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!env.isGoogleMapsConfigured || !env.googleMapsBrowserKey || sdkLoadFailed) {
      return;
    }

    let cancelled = false;
    setOptions({
      key: env.googleMapsBrowserKey,
      v: 'weekly',
    });

    importLibrary('maps')
      .then(() => {
        if (cancelled || !mapRef.current || mapInstance) return;

        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom,
          styles: TRIP_PLANNER_MAP_STYLES,
          disableDefaultUI: true,
          zoomControl: true,
        });

        setMapInstance(map);
        if (onMapLoad) onMapLoad(map);
      })
      .catch(() => {
        if (!cancelled) {
          setSdkLoadFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [center, zoom, mapInstance, onMapLoad, sdkLoadFailed]);

  // Sync center and bounds when markers or selection change on live Google Map
  useEffect(() => {
    if (!mapInstance) return;

    Object.values(markersRef.current).forEach((m) => m.setMap(null));
    markersRef.current = {};

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    const bounds = new google.maps.LatLngBounds();

    markers.forEach((m, index) => {
      const isSelected = m.id === selectedMarkerId;
      bounds.extend(m.position);

      const marker = new google.maps.Marker({
        position: m.position,
        map: mapInstance,
        title: m.title,
        label: m.sequenceNumber
          ? {
              text: String(m.sequenceNumber),
              color: '#FFF9F3',
              fontSize: '11px',
              fontWeight: 'bold',
            }
          : undefined,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor:
            m.status === 'disrupted'
              ? '#b91c1c'
              : isSelected
              ? '#1C1410'
              : '#C85A38',
          fillOpacity: 1,
          strokeColor: '#FFF9F3',
          strokeWeight: isSelected ? 3 : 2,
          scale: isSelected ? 13 : 10,
        },
        zIndex: isSelected ? 100 : index + 1,
      });

      marker.addListener('click', () => {
        if (m.onClick) m.onClick();
        if (onSelectMarker) onSelectMarker(m.id);
      });

      markersRef.current[m.id] = marker;
    });

    if (showRoutePolyline && markers.length > 1) {
      polylineRef.current = new google.maps.Polyline({
        path: markers.map((m) => m.position),
        geodesic: true,
        strokeColor: '#C85A38',
        strokeOpacity: 0.85,
        strokeWeight: 3,
        map: mapInstance,
      });
    }

    if (selectedMarkerId) {
      const selected = markers.find((m) => m.id === selectedMarkerId);
      if (selected) {
        mapInstance.panTo(selected.position);
      }
    } else if (markers.length > 1) {
      mapInstance.fitBounds(bounds, 48);
    } else {
      mapInstance.setCenter(center);
    }
  }, [markers, selectedMarkerId, showRoutePolyline, mapInstance, center, onSelectMarker]);

  // Compute normalized 2D SVG projection coordinates for the editorial cartographic canvas
  const projectedMarkers = useMemo(() => {
    if (markers.length === 0) {
      return [
        {
          id: 'center_pin',
          title: 'Selected Location',
          position: center,
          sequenceNumber: 1,
          status: 'default' as const,
          x: 50,
          y: 50,
        },
      ];
    }

    if (markers.length === 1) {
      return [
        {
          ...markers[0],
          x: 50,
          y: 50,
        },
      ];
    }

    const lats = markers.map((m) => m.position.lat);
    const lngs = markers.map((m) => m.position.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latSpan = Math.max(0.005, maxLat - minLat);
    const lngSpan = Math.max(0.005, maxLng - minLng);

    return markers.map((m) => {
      // Pad 18% on each edge so pins never clip
      const normX = 18 + ((m.position.lng - minLng) / lngSpan) * 64;
      const normY = 82 - ((m.position.lat - minLat) / latSpan) * 64;
      return {
        ...m,
        x: Number(normX.toFixed(2)),
        y: Number(normY.toFixed(2)),
      };
    });
  }, [markers, center]);

  const activeMarker = useMemo(
    () =>
      projectedMarkers.find((m) => m.id === selectedMarkerId) ||
      projectedMarkers[0],
    [projectedMarkers, selectedMarkerId]
  );

  if (loading) {
    return (
      <div
        role="status"
        aria-label="Loading map view"
        className={`${className} bg-[#F5EFE6] border border-[#33231E]/20 flex flex-col items-center justify-center p-6 text-center space-y-2`}
      >
        <div className="w-6 h-6 border-2 border-terracotta border-t-transparent rounded-full animate-spin" />
        <p className="font-mono text-xs text-[#554742] uppercase tracking-wider">
          Synchronizing Spatial Coordinates...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className={`${className} bg-[#FFF9F3] border border-burnt-clay/40 flex flex-col items-center justify-center p-6 text-center space-y-3`}
      >
        <AlertTriangle className="w-6 h-6 text-burnt-clay" />
        <div className="space-y-1 max-w-sm">
          <p className="font-display text-base font-medium text-[#1C1410]">
            Map View Temporarily Unavailable
          </p>
          <p className="text-xs text-[#8A7B75]">{error}</p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-terracotta text-white font-mono text-xs uppercase tracking-wider hover:bg-terracotta-hover transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Map</span>
          </button>
        )}
      </div>
    );
  }

  const useEditorialCartographicCanvas =
    !env.isGoogleMapsConfigured || sdkLoadFailed;

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      className={`relative overflow-hidden border border-[#33231E]/20 bg-[#F2E9DC] flex flex-col justify-between ${className}`}
    >
      {/* Top Status & Attribution Header Overlay */}
      <div className="relative z-10 flex items-center justify-between px-3.5 py-2 bg-[#FFF9F3]/90 backdrop-blur-xs border-b border-[#33231E]/15 text-[10px] font-mono">
        <div className="flex items-center gap-1.5 text-[#1C1410] font-semibold">
          <Compass className="w-3.5 h-3.5 text-terracotta" />
          <span>
            {center.lat.toFixed(4)}° N, {center.lng.toFixed(4)}° E
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isDemoData && (
            <span
              data-testid="demo-route-badge"
              className="px-2 py-0.5 rounded bg-[#F4E8DC] text-terracotta border border-terracotta/30 font-semibold uppercase tracking-wider"
            >
              Demo route data
            </span>
          )}
          <span className="text-[#8A7B75] hidden sm:inline">
            {markers.length} {markers.length === 1 ? 'Stop' : 'Stops'} Mapped
          </span>
        </div>
      </div>

      {/* Main Map Surface */}
      <div className="relative flex-1 min-h-[220px]">
        {!useEditorialCartographicCanvas ? (
          <div ref={mapRef} className="w-full h-full min-h-[220px]" />
        ) : (
          /* Editorial Cartographic Vector Map Surface (Interactive & Keyboard Accessible) */
          <div
            className="relative w-full h-full min-h-[220px] select-none overflow-hidden"
            style={{
              backgroundColor: '#EFE6D5',
              backgroundImage:
                'radial-gradient(rgba(51, 35, 30, 0.12) 1px, transparent 1px), linear-gradient(to right, rgba(51, 35, 30, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(51, 35, 30, 0.04) 1px, transparent 1px)',
              backgroundSize: '20px 20px, 40px 40px, 40px 40px',
            }}
          >
            {/* Decorative Coastal / Topographic Contours */}
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full pointer-events-none"
              aria-hidden="true"
            >
              <path
                d="M 0,25 Q 28,15 45,48 T 95,85 L 0,100 Z"
                fill="#CAD8D8"
                fillOpacity="0.42"
              />
              <path
                d="M 0,25 Q 28,15 45,48 T 95,85"
                fill="none"
                stroke="#9AB3B5"
                strokeWidth="0.6"
                strokeDasharray="1.5 1.5"
              />

              {/* Route Polyline Connecting Ordered Stops */}
              {showRoutePolyline && projectedMarkers.length > 1 && (
                <>
                  <polyline
                    points={projectedMarkers
                      .map((m) => `${m.x},${m.y}`)
                      .join(' ')}
                    fill="none"
                    stroke="#33231E"
                    strokeOpacity="0.18"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polyline
                    points={projectedMarkers
                      .map((m) => `${m.x},${m.y}`)
                      .join(' ')}
                    fill="none"
                    stroke="#C85A38"
                    strokeWidth="1.2"
                    strokeDasharray="2.5 1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              )}
            </svg>

            {/* Interactive Marker Pins */}
            {projectedMarkers.map((m, idx) => {
              const isSelected = m.id === activeMarker?.id;
              const isDisrupted = m.status === 'disrupted';
              const seq = m.sequenceNumber ?? idx + 1;

              return (
                <button
                  key={m.id}
                  type="button"
                  data-testid={`map-marker-${m.id}`}
                  aria-label={`Stop ${seq}: ${m.title}`}
                  aria-pressed={isSelected}
                  onClick={() => {
                    if ('onClick' in m && m.onClick) m.onClick();
                    if (onSelectMarker) onSelectMarker(m.id);
                  }}
                  style={{ left: `${m.x}%`, top: `${m.y}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta transition-transform ${
                    isSelected ? 'z-30 scale-115' : 'z-20 hover:scale-110'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-[11px] font-bold shadow-md border-2 transition-colors ${
                      isDisrupted
                        ? 'bg-red-700 text-white border-[#FFF9F3]'
                        : isSelected
                        ? 'bg-[#1C1410] text-[#FFF9F3] border-terracotta'
                        : 'bg-terracotta text-[#FFF9F3] border-[#FFF9F3]'
                    }`}
                  >
                    {seq}
                  </span>
                  <span
                    className={`mt-1 px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap block shadow-2xs border transition-all ${
                      isSelected
                        ? 'bg-[#1C1410] text-[#FFF9F3] border-[#1C1410] font-semibold'
                        : 'bg-[#FFF9F3]/95 text-[#1C1410] border-[#33231E]/20 opacity-90 group-hover:opacity-100'
                    }`}
                  >
                    {m.title}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Accessible Selected Stop & Attribution Footer */}
      <div className="relative z-10 px-3.5 py-2 bg-[#FFF9F3] border-t border-[#33231E]/15 flex flex-wrap items-center justify-between gap-2 text-xs">
        {activeMarker ? (
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-terracotta shrink-0" />
            <span className="font-medium text-[#1C1410] truncate">
              {activeMarker.title}
            </span>
            <span className="font-mono text-[10px] text-[#8A7B75] shrink-0">
              ({activeMarker.position.lat.toFixed(3)},{' '}
              {activeMarker.position.lng.toFixed(3)})
            </span>
          </div>
        ) : (
          <span className="text-[#8A7B75] text-[11px]">
            Select a stop to inspect coordinates
          </span>
        )}

        <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#8A7B75]">
          <Navigation className="w-3 h-3 text-terracotta" />
          <span>
            {useEditorialCartographicCanvas
              ? 'TripPlanner Cartographic Projection'
              : 'Map data © Google'}
          </span>
        </div>
      </div>
    </div>
  );
};
