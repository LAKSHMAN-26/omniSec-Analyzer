import { useEffect, useMemo, useRef } from 'react';
import { Circle, MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Crosshair, Expand, LoaderCircle, MapPin } from 'lucide-react';
import type { GeolocationData } from '../../types';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER: [number, number] = [20, 0];
const CITY_ZOOM = 11;
const TILE_URL = import.meta.env.VITE_GEO_TILE_URL ||
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

interface CityLocationMapProps {
  result: GeolocationData | null;
  loading: boolean;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

function hasValidCoordinates(result: GeolocationData | null): result is GeolocationData & { lat: number; lon: number } {
  return Boolean(
    result &&
    result.source === 'live_provider' &&
    result.isValid &&
    typeof result.lat === 'number' &&
    Number.isFinite(result.lat) &&
    result.lat >= -90 &&
    result.lat <= 90 &&
    typeof result.lon === 'number' &&
    Number.isFinite(result.lon) &&
    result.lon >= -180 &&
    result.lon <= 180
  );
}

function createLocationIcon() {
  return L.divIcon({
    className: 'geo-location-icon',
    html: '<span class="geo-location-pulse"></span><span class="geo-location-dot"></span>',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -17]
  });
}

function MapBehavior({ result }: { result: GeolocationData | null }) {
  const map = useMap();

  useEffect(() => {
    if (hasValidCoordinates(result)) {
      map.flyTo([result.lat, result.lon], CITY_ZOOM, { duration: 1.15 });
    } else {
      map.flyTo(DEFAULT_CENTER, 2, { duration: 0.65 });
    }
  }, [map, result]);

  useEffect(() => {
    const container = map.getContainer();
    const resizeObserver = new ResizeObserver(() => map.invalidateSize({ debounceMoveend: true }));
    resizeObserver.observe(container);
    const onFullscreenChange = () => {
      window.setTimeout(() => map.invalidateSize({ debounceMoveend: true }), 100);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      resizeObserver.disconnect();
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [map]);

  return null;
}

export function CityLocationMap({ result, loading, onFullscreenChange }: CityLocationMapProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const liveLocation = hasValidCoordinates(result) ? result : null;
  const center: [number, number] = liveLocation ? [liveLocation.lat, liveLocation.lon] : DEFAULT_CENTER;
  const locationIcon = useMemo(() => createLocationIcon(), []);
  const cityLabel = [result?.city, result?.region, result?.country].filter(Boolean).join(', ');

  const resetView = () => {
    const map = mapRef.current;
    if (map) {
      if (liveLocation) map.flyTo(center, CITY_ZOOM, { duration: 0.8 });
      else map.flyTo(DEFAULT_CENTER, 2, { duration: 0.8 });
    }
  };

  const toggleFullscreen = async () => {
    const element = wrapperRef.current;
    if (!element) return;
    try {
      if (document.fullscreenElement === element) await document.exitFullscreen();
      else await element.requestFullscreen();
      onFullscreenChange?.(document.fullscreenElement === element);
    } catch (error) {
      console.error('Could not toggle fullscreen map mode.', error);
    }
  };

  return (
    <div
      ref={wrapperRef}
      className="geo-map-shell relative h-full min-h-[360px] overflow-hidden rounded-2xl border border-slate-700/80 bg-[#08111e]"
      aria-label="IP city-level location map"
    >
      <MapContainer
        center={center}
        zoom={liveLocation ? CITY_ZOOM : 2}
        minZoom={2}
        maxZoom={18}
        zoomControl={false}
        ref={mapRef}
        scrollWheelZoom
        className="geo-leaflet-map h-full min-h-[360px] w-full"
      >
        <TileLayer
          attribution={TILE_ATTRIBUTION}
          url={TILE_URL}
          maxZoom={19}
        />
        <ZoomControl position="topright" />
        <MapBehavior result={result} />
        {liveLocation && (
          <>
            <Circle
              center={center}
              radius={15000}
              pathOptions={{ color: '#22d3ee', fillColor: '#06b6d4', fillOpacity: 0.12, weight: 1.5 }}
            />
            <Marker key={`${liveLocation.ip}-${liveLocation.lat}-${liveLocation.lon}`} position={center} icon={locationIcon}>
              <Popup>
                <div className="geo-popup">
                  <strong>{liveLocation.city || 'Estimated city region'}</strong>
                  <span>{[liveLocation.region, liveLocation.country].filter(Boolean).join(', ')}</span>
                </div>
              </Popup>
            </Marker>
          </>
        )}
      </MapContainer>

      <div className="pointer-events-none absolute left-3 top-3 z-[500] flex items-center gap-2 rounded-xl border border-slate-600/70 bg-slate-950/85 px-3 py-2 shadow-lg backdrop-blur">
        <MapPin className={`h-4 w-4 ${liveLocation ? 'text-cyan-300' : 'text-slate-500'}`} />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">City-level estimate</p>
          <p className="max-w-56 truncate text-[11px] text-slate-400">{liveLocation ? cityLabel : 'Map awaits live coordinates'}</p>
        </div>
      </div>

      <div className="absolute bottom-12 left-3 z-[500] flex items-center gap-2 rounded-lg border border-slate-600/60 bg-slate-950/80 px-2.5 py-1.5 text-[10px] text-slate-300 backdrop-blur">
        <span className="relative flex h-3 w-3 items-center justify-center">
          <span className="absolute h-3 w-3 rounded-full border border-cyan-400/70 bg-cyan-400/15" />
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
        </span>
        {liveLocation ? 'Estimated network location · approximate area' : 'No location marker'}
      </div>

      <div className="absolute bottom-12 right-3 z-[500] flex items-center gap-1.5">
        <button
          type="button"
          onClick={resetView}
          aria-label="Reset map view"
          className="rounded-lg border border-slate-600/70 bg-slate-950/85 p-2 text-slate-300 shadow-lg backdrop-blur hover:border-cyan-600 hover:text-cyan-200"
        >
          <Crosshair className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label="Toggle fullscreen map"
          className="rounded-lg border border-slate-600/70 bg-slate-950/85 p-2 text-slate-300 shadow-lg backdrop-blur hover:border-cyan-600 hover:text-cyan-200"
        >
          <Expand className="h-4 w-4" />
        </button>
      </div>

      {!result && !loading && (
        <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center bg-slate-950/15 p-6 text-center">
          <div className="max-w-xs rounded-2xl border border-slate-600/60 bg-slate-950/85 p-5 shadow-xl backdrop-blur">
            <GlobeEmptyState />
            <h3 className="mt-3 text-sm font-semibold text-white">Ready to locate an IP</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">Run a lookup to see an estimated city-level location on the map.</p>
          </div>
        </div>
      )}

      {result && !liveLocation && !loading && (
        <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center bg-slate-950/25 p-6 text-center">
          <div className="max-w-xs rounded-2xl border border-amber-700/50 bg-slate-950/90 p-5 shadow-xl backdrop-blur">
            <MapPin className="mx-auto h-7 w-7 text-amber-300" />
            <h3 className="mt-3 text-sm font-semibold text-white">Map location unavailable</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              {result.dataOrigin === 'private_network'
                ? 'Private and reserved addresses have no public network location to display.'
                : result.dataOrigin === 'invalid_input'
                  ? 'Enter a valid IP address to request its estimated network location.'
                  : 'The provider did not return valid coordinates. No location has been guessed.'}
            </p>
          </div>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 z-[600] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm" role="status" aria-live="polite">
          <div className="flex items-center gap-3 rounded-xl border border-cyan-800/60 bg-slate-950/90 px-4 py-3 text-sm text-cyan-100 shadow-xl">
            <LoaderCircle className="h-5 w-5 animate-spin text-cyan-300" />
            Updating IP location…
          </div>
        </div>
      )}
    </div>
  );
}

function GlobeEmptyState() {
  return (
    <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-cyan-700/50 bg-cyan-950/50">
      <MapPin className="h-5 w-5 text-cyan-300" />
      <span className="absolute -inset-1 rounded-full border border-cyan-500/20" />
    </div>
  );
}
