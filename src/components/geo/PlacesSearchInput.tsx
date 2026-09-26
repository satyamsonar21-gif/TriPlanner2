import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, AlertCircle, RefreshCw } from 'lucide-react';
import type { GeoLocation } from '../../domains/geo/types';
import { GeoServiceFactory } from '../../domains/geo/providers';
import { mapProviderErrorToDomainError } from '../../domains/geo/geo-error';

export interface PlacesSearchInputProps {
  onPlaceSelected: (place: GeoLocation) => void;
  placeholder?: string;
  initialValue?: string;
  className?: string;
}

export const PlacesSearchInput: React.FC<PlacesSearchInputProps> = ({
  onPlaceSelected,
  placeholder = 'Search destination, city, or landmark (e.g., Goa, Jaipur, Kerala)...',
  initialValue = '',
  className = '',
}) => {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<GeoLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [searchTrigger, setSearchTrigger] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setErrorMessage(null);
      setIsOpen(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const provider = GeoServiceFactory.getLocationProvider();
        const matches = await provider.searchPlaces(trimmed, {
          signal: controller.signal,
          limit: 6,
        });
        if (!controller.signal.aborted) {
          setResults(matches);
          setHighlightedIndex(matches.length > 0 ? 0 : -1);
          setIsOpen(true);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          const domainErr = mapProviderErrorToDomainError(err, 'location');
          setErrorMessage(domainErr.userMessage);
          setResults([]);
          setIsOpen(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 320);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [query, searchTrigger]);

  const handleSelect = async (place: GeoLocation) => {
    setQuery(place.name);
    setIsOpen(false);
    setErrorMessage(null);

    const needsResolution =
      Boolean(place.metadata?.needsCoordinateResolution) ||
      (place.latitude === 0 && place.longitude === 0 && Boolean(place.providerPlaceId));

    if (!needsResolution) {
      onPlaceSelected(place);
      return;
    }

    setIsLoading(true);
    try {
      const provider = GeoServiceFactory.getLocationProvider();
      const fullDetails = await provider.getPlaceDetails(
        place.providerPlaceId || place.id
      );
      onPlaceSelected(fullDetails);
    } catch (err) {
      const domainErr = mapProviderErrorToDomainError(err, 'location');
      setErrorMessage(domainErr.userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        results.length > 0 ? (prev + 1) % results.length : -1
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        results.length > 0 ? (prev - 1 + results.length) % results.length : -1
      );
    } else if (e.key === 'Enter' && highlightedIndex >= 0 && results[highlightedIndex]) {
      e.preventDefault();
      handleSelect(results[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-[#8A7B75] absolute left-3.5 pointer-events-none" />
        <input
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="places-search-listbox"
          aria-autocomplete="list"
          aria-label="Search destination or place"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim().length >= 2) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-[#FFF9F3] border border-[#33231E]/20 rounded-lg text-[#1C1410] placeholder:text-[#8A7B75] focus:outline-none focus:ring-2 focus:ring-terracotta/40 focus:border-terracotta transition-all"
        />

        {isLoading && (
          <div
            className="absolute right-3"
            role="status"
            aria-label="Searching places"
          >
            <div className="w-4 h-4 border-2 border-[#33231E]/20 border-t-terracotta rounded-full animate-spin" />
          </div>
        )}
      </div>

      {isOpen && (
        <div
          id="places-search-listbox"
          role="listbox"
          className="absolute z-30 w-full mt-1.5 bg-[#FFF9F3] border border-[#33231E]/20 rounded-xl shadow-lg max-h-64 overflow-auto divide-y divide-[#33231E]/10"
        >
          {errorMessage ? (
            <div
              role="alert"
              className="p-3.5 text-xs text-burnt-clay flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setSearchTrigger((n) => n + 1)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-terracotta text-white font-mono text-[10px] uppercase tracking-wider"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
          ) : results.length > 0 ? (
            results.map((place, idx) => {
              const isHighlighted = idx === highlightedIndex;
              return (
                <button
                  key={place.id || place.providerPlaceId || idx}
                  type="button"
                  role="option"
                  aria-selected={isHighlighted}
                  onClick={() => handleSelect(place)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`w-full px-3.5 py-2.5 text-left flex items-start justify-between gap-2 transition-colors ${
                    isHighlighted ? 'bg-[#F4E8DC]' : 'hover:bg-[#F7EFE6]'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <MapPin className="w-4 h-4 text-terracotta shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="font-display text-sm font-medium text-[#1C1410] block truncate">
                        {place.name}
                      </span>
                      <span className="text-[11px] text-[#8A7B75] block truncate">
                        {place.formattedAddress}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 font-mono text-[9px] text-[#8A7B75] uppercase">
                    <span className="block text-terracotta font-semibold">
                      {place.locationType}
                    </span>
                    {place.latitude !== 0 && (
                      <span>
                        {place.latitude.toFixed(2)}°, {place.longitude.toFixed(2)}°
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          ) : !isLoading ? (
            <div className="p-4 text-center text-xs text-[#8A7B75] font-mono">
              No matching places found for &ldquo;{query.trim()}&rdquo;
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
