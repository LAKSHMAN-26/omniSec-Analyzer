import { Component, type ErrorInfo, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import { AlertTriangle, Crosshair, Expand, LoaderCircle, MapPin, Minimize, Navigation, ShieldCheck } from 'lucide-react';
import type { GeolocationData } from '../../types';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER: [number, number] = [20, 0];
const CITY_ZOOM = 11;
const TILE_URL = import.meta.env.VITE_GEO_TILE_URL ||
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = import.meta.env.VITE_GEO_TILE_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

interface CityLocationMapProps {
  result: GeolocationData | null;
  loading: boolean;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

function parseCoordinate(value: number | string | undefined, min: number, max: number): number | null {
  if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) return null;
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) && numericValue >= min && numericValue <= max ? numericValue : null;
}

function getValidLocation(result: GeolocationData | null): (GeolocationData & { lat: number; lon: number }) | null {
  if (!result || !result.isValid || result.dataOrigin === 'private_network' || result.dataOrigin === 'invalid_input') {
    return null;
  }
  const lat = parseCoordinate(result.lat, -90, 90);
  const lon = parseCoordinate(result.lon, -180, 180);
  return lat === null || lon === null ? null : { ...result, lat, lon };
}

function createLocationIcon() {
  return L.divIcon({
    className: 'geo-location-icon',
    html: '<span class="geo-location-pulse"></span><span class="geo-location-dot"></span>',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18]
  });
}

interface MapBehaviorProps {
  result: GeolocationData | null;
}

function MapBehavior({ result }: MapBehaviorProps) {
  const map = useMap();

  useEffect(() => {
    const validLocation = getValidLocation(result);
    if (validLocation) {
      map.flyTo([validLocation.lat, validLocation.lon], CITY_ZOOM, { duration: 1.15 });
    } else {
      map.flyTo(DEFAULT_CENTER, 2, { duration: 0.65 });
    }
  }, [map, result]);

  useEffect(() => {
    const container = map.getContainer();
    const resizeObserver = new ResizeObserver(() => map.invalidateSize({ debounceMoveend: true }));
    resizeObserver.observe(container);

    const onFullscreenChange = () => {
      window.setTimeout(() => map.invalidateSize({ debounceMoveend: true }), 120);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      resizeObserver.disconnect();
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [map]);

  return null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: (error: Error) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class MapErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Leaflet Map Error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error);
    }
    return this.props.children;
  }
}

export function CityLocationMap({ result, loading, onFullscreenChange }: CityLocationMapProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [tileError, setTileError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const validLocation = getValidLocation(result);
  const center: [number, number] = validLocation ? [validLocation.lat, validLocation.lon] : DEFAULT_CENTER;
  const locationIcon = useMemo(() => createLocationIcon(), []);

  const cityLabel = [result?.city, result?.region, result?.country].filter(Boolean).join(', ');
  const villageTown = [result?.village, result?.town].filter(Boolean).join(' / ');

  // Automatically open the popup on marker mount or position update
  useEffect(() => {
    if (validLocation && markerRef.current) {
      const timer = window.setTimeout(() => {
        try {
          markerRef.current?.openPopup();
        } catch {
          // ignore if map is unmounting
        }
      }, 400);
      return () => window.clearTimeout(timer);
    }
  }, [validLocation]);

  const resetView = () => {
    const map = mapRef.current;
    if (map) {
      if (validLocation) {
        map.flyTo(center, CITY_ZOOM, { duration: 0.8 });
      } else {
        map.flyTo(DEFAULT_CENTER, 2, { duration: 0.8 });
      }
    }
  };

  const toggleFullscreen = async () => {
    const element = wrapperRef.current;
    if (!element) return;
    try {
      if (document.fullscreenElement === element) {
        await document.exitFullscreen();
        setIsFullscreen(false);
        onFullscreenChange?.(false);
      } else {
        await element.requestFullscreen();
        setIsFullscreen(true);
        onFullscreenChange?.(true);
      }
    } catch (err) {
      console.error('Could not toggle fullscreen map mode.', err);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(document.fullscreenElement === wrapperRef.current);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const showFallback = Boolean(
    tileError ||
    (result && !validLocation && !loading)
  );

  return (
    <div className="space-y-2">
      <div
        ref={wrapperRef}
        className="geo-map-shell relative min-h-[300px] h-[340px] sm:min-h-[380px] sm:h-[420px] md:min-h-[440px] md:h-[460px] w-full overflow-hidden rounded-2xl border border-slate-700/80 bg-[#08111e] shadow-xl"
        aria-label="IP approximate location interactive map"
      >
        <MapErrorBoundary
          fallback={(err) => (
            <div className="flex h-full w-full items-center justify-center p-6 text-center">
              <FallbackCard
                title="Map unavailable — location details are shown below."
                description={`A map rendering error occurred (${err.message || 'Map component issue'}). Location details remain available below.`}
                result={result}
              />
            </div>
          )}
        >
          <MapContainer
            center={center}
            zoom={validLocation ? CITY_ZOOM : 2}
            minZoom={2}
            maxZoom={18}
            zoomControl={false}
            ref={mapRef}
            scrollWheelZoom
            className="geo-leaflet-map h-full w-full min-h-[300px] sm:min-h-[380px] md:min-h-[440px]"
          >
            <TileLayer
              attribution={TILE_ATTRIBUTION}
              url={TILE_URL}
              maxZoom={19}
              eventHandlers={{
                loading: () => setTileError(false),
                tileerror: () => setTileError(true)
              }}
            />
            <ZoomControl position="topright" />
            <MapBehavior result={result} />

            {validLocation && (
              <Marker
                ref={markerRef}
                key={`${validLocation.ip}-${validLocation.lat}-${validLocation.lon}`}
                position={center}
                icon={locationIcon}
              >
                <Popup autoPan={true} closeButton={true}>
                  <div className="geo-popup">
                    <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider text-cyan-400">
                      <MapPin className="h-2.5 w-2.5" />
                      Approximate IP Location
                    </span>
                    <strong className="text-sm font-semibold text-white">
                      {validLocation.city || 'Estimated city area'}
                    </strong>
                    <span className="text-[11px] text-slate-300">
                      {[villageTown, validLocation.region, validLocation.district, validLocation.country]
                        .filter(Boolean)
                        .join(', ') || 'Regional network'}
                    </span>
                    <div className="mt-1 flex flex-wrap gap-x-2 border-t border-slate-700/60 pt-1 font-mono text-[10px] text-slate-400">
                      <span>IP: <span className="text-slate-200">{validLocation.ip}</span></span>
                      <span>Coords: <span className="text-cyan-300">{validLocation.lat}, {validLocation.lon}</span></span>
                      {validLocation.isp && (
                        <span className="w-full truncate text-[10px] text-slate-400">
                          ISP: <span className="text-slate-200">{validLocation.isp}</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-500 italic">
                      Network-level estimate · Not exact GPS
                    </span>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </MapErrorBoundary>

        {/* Floating status pill (top-left) */}
        <div className="pointer-events-none absolute left-3 top-3 z-[500] flex items-center gap-2 rounded-xl border border-slate-600/70 bg-slate-950/85 px-3 py-2 shadow-lg backdrop-blur">
          <MapPin className={`h-4 w-4 ${validLocation ? 'text-cyan-300 animate-pulse' : 'text-slate-500'}`} />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">Approximate location</p>
            <p className="max-w-56 truncate text-[11px] text-slate-400">
              {validLocation ? cityLabel || 'Coordinates plotted' : 'Awaiting valid coordinates'}
            </p>
          </div>
        </div>

        {/* Bottom indicator badge */}
        <div className="pointer-events-none absolute bottom-3 left-3 z-[500] flex items-center gap-2 rounded-lg border border-slate-600/60 bg-slate-950/80 px-2.5 py-1.5 text-[10px] text-slate-300 backdrop-blur">
          <span className="relative flex h-3 w-3 items-center justify-center">
            <span className={`absolute h-3 w-3 rounded-full border ${validLocation ? 'border-cyan-400/70 bg-cyan-400/20 animate-ping' : 'border-slate-500/50'}`} />
            <span className={`h-1.5 w-1.5 rounded-full ${validLocation ? 'bg-cyan-300' : 'bg-slate-500'}`} />
          </span>
          {validLocation ? 'Approximate network location · Area estimate' : 'No coordinates plotted'}
        </div>

        {/* Controls (Reset & Fullscreen) */}
        <div className="absolute bottom-3 right-3 z-[500] flex items-center gap-1.5">
          <button
            type="button"
            onClick={resetView}
            aria-label="Reset map view to target"
            title="Recenter map"
            className="rounded-lg border border-slate-600/70 bg-slate-950/85 p-2 text-slate-300 shadow-lg backdrop-blur transition hover:border-cyan-500 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            <Crosshair className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen map' : 'Toggle fullscreen map'}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="rounded-lg border border-slate-600/70 bg-slate-950/85 p-2 text-slate-300 shadow-lg backdrop-blur transition hover:border-cyan-500 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
          </button>
        </div>

        {/* Empty state: before any search */}
        {!result && !loading && (
          <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center bg-slate-950/25 p-6 text-center backdrop-blur-[1px]">
            <div className="max-w-xs rounded-2xl border border-slate-700/70 bg-slate-950/90 p-5 shadow-2xl backdrop-blur">
              <GlobeEmptyState />
              <h3 className="mt-3 text-sm font-semibold text-white">Enter an IP address to explore its approximate location.</h3>
              <p className="mt-1 text-xs text-slate-400">Interactive OpenStreetMap with city-level marker and location details.</p>
            </div>
          </div>
        )}

        {/* Fallback state: map unavailable, coordinates missing, tile error, or private IP */}
        {showFallback && (
          <div
            role="status"
            className="absolute inset-0 z-[550] flex items-center justify-center bg-slate-950/90 p-4 sm:p-6 text-center backdrop-blur-sm overflow-y-auto"
          >
            <FallbackCard
              title="Map unavailable — location details are shown below."
              description={
                tileError
                  ? 'OpenStreetMap tiles could not be loaded (offline or network blocked). Available location fields remain listed below.'
                  : result?.dataOrigin === 'private_network'
                    ? 'Private, local, and reserved IP addresses (RFC 1918 / loopback) do not have a public geographical location.'
                    : result?.dataOrigin === 'invalid_input'
                      ? 'The input provided is not a valid IPv4 or IPv6 address.'
                      : 'The network provider response did not include valid latitude/longitude coordinates. No map position was guessed.'
              }
              result={result}
            />
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-[600] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm" role="status" aria-live="polite">
            <div className="flex items-center gap-3 rounded-xl border border-cyan-700/60 bg-slate-950/95 px-5 py-3.5 text-sm font-medium text-cyan-100 shadow-2xl">
              <LoaderCircle className="h-5 w-5 animate-spin text-cyan-400" />
              Looking up approximate IP location...
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-slate-500">
        <p>
          Map data: <a className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a> (ODbL)
        </p>
        <span className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
          <ShieldCheck className="h-3 w-3 text-cyan-400" />
          No paid map API key required
        </span>
      </div>
    </div>
  );
}

interface FallbackCardProps {
  title: string;
  description: string;
  result: GeolocationData | null;
}

function FallbackCard({ title, description, result }: FallbackCardProps) {
  const villageTown = [result?.village, result?.town].filter(Boolean).join(' / ');
  const lat = parseCoordinate(result?.lat, -90, 90);
  const lon = parseCoordinate(result?.lon, -180, 180);
  const hasCoords = lat !== null && lon !== null;

  return (
    <div className="max-w-lg w-full rounded-2xl border border-amber-800/70 bg-[#0f172a]/95 p-5 shadow-2xl sm:p-6 text-left">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-amber-600/40 bg-amber-950/50 p-2.5 text-amber-300 shrink-0">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm sm:text-base font-bold text-white leading-snug">{title}</h3>
          <p className="mt-1 text-xs text-slate-300 leading-relaxed">{description}</p>
        </div>
      </div>

      {result && result.isValid && (
        <div className="mt-4 rounded-xl border border-slate-800 bg-[#080e18] p-3.5 space-y-2">
          <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-cyan-400">
            Available Location Summary
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-mono block">City:</span>
              <span className="font-medium text-slate-200">{result.city?.trim() || 'Not available'}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-mono block">Village / Town:</span>
              <span className="font-medium text-slate-200">{villageTown || 'Not available'}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-mono block">Region / State:</span>
              <span className="font-medium text-slate-200">{result.region?.trim() || 'Not available'}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-mono block">District:</span>
              <span className="font-medium text-slate-200">{result.district?.trim() || 'Not available'}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-mono block">Country:</span>
              <span className="font-medium text-slate-200">
                {result.country ? `${result.country}${result.countryCode ? ` (${result.countryCode})` : ''}` : 'Not available'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-mono block">Coordinates:</span>
              <span className="font-medium font-mono text-cyan-300">
                {hasCoords ? `${lat}, ${lon}` : 'Not available'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GlobeEmptyState() {
  return (
    <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-cyan-700/50 bg-cyan-950/50">
      <Navigation className="h-5 w-5 text-cyan-300" />
      <span className="absolute -inset-1 rounded-full border border-cyan-500/20" />
    </div>
  );
}
