import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  Clock3,
  Compass,
  Copy,
  Globe2,
  Hash,
  Info,
  MapPin,
  Navigation,
  Radio,
  Search,
  ShieldAlert,
  Sparkles,
  Wifi,
  type LucideIcon
} from 'lucide-react';
import { CityLocationMap } from '../geolocation/CityLocationMap';
import { TooltipInfo } from '../TooltipInfo';
import { apiService } from '../../services/api';
import type { GeolocationData, GeolocationProviderStatus } from '../../types';

function countryFlag(countryCode: string | undefined): string | null {
  if (!countryCode || !/^[a-z]{2}$/i.test(countryCode)) return null;
  return String.fromCodePoint(...countryCode.toUpperCase().split('').map((letter) => 127397 + letter.charCodeAt(0)));
}

function coordinateValue(value: number | string | undefined, min: number, max: number): number | null {
  if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) return null;
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) && numericValue >= min && numericValue <= max ? numericValue : null;
}

function displayValue(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return 'Not available';
}

interface DetailCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  copyValue?: string;
  copyLabel?: string;
  copied?: boolean;
  onCopy?: (value: string) => void;
}

function DetailCard({ icon: Icon, label, value, copyValue, copyLabel, copied, onCopy }: DetailCardProps) {
  const isUnavailable = value === 'Not available';

  return (
    <div className="group min-w-0 rounded-xl border border-slate-800 bg-[#0B0F19] p-3.5 transition hover:border-cyan-700/70 sm:p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 text-slate-400">
          <Icon className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">{label}</span>
        </div>
        <div className="mt-2 flex min-w-0 items-start justify-between gap-2">
          <span className={`min-w-0 break-words text-sm font-medium ${isUnavailable ? 'text-slate-500 italic' : 'text-slate-100'}`}>
            {value}
          </span>
          {copyValue && onCopy && !isUnavailable && (
            <button
              type="button"
              onClick={() => onCopy(copyValue)}
              aria-label={`${copied ? 'Copied' : 'Copy'} ${copyLabel || label.toLowerCase()}`}
              title={copied ? 'Copied' : `Copy ${copyLabel || label.toLowerCase()}`}
              className="shrink-0 rounded-md p-1 text-slate-500 transition hover:bg-slate-800 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const EDUCATIONAL_DEMO_DATA: GeolocationData = {
  ip: '198.51.100.42',
  version: 'IPv4',
  isValid: true,
  city: 'Bengaluru',
  village: 'Electronic City',
  town: 'Anekal',
  region: 'Karnataka',
  district: 'Bengaluru Urban',
  country: 'India',
  countryCode: 'IN',
  postalCode: '560100',
  lat: 12.8452,
  lon: 77.6602,
  timezone: 'Asia/Kolkata',
  isp: 'Demo Educational Telecom Network',
  asn: 'AS64512',
  connectionType: 'Fiber Broadband',
  source: 'demo_data',
  dataOrigin: 'demo_data',
  isDemoData: true,
  timestamp: new Date().toISOString(),
  disclaimer: 'Educational demo dataset — not a live lookup. Used for verification and offline testing.'
};

export const Geolocation: React.FC = () => {
  const [ipInput, setIpInput] = useState('');
  const [result, setResult] = useState<GeolocationData | null>(null);
  const [lastRequestedIp, setLastRequestedIp] = useState('');
  const [providerStatus, setProviderStatus] = useState<GeolocationProviderStatus | null>(null);
  const [providerStatusError, setProviderStatusError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previousResult, setPreviousResult] = useState(false);
  const [requestFailed, setRequestFailed] = useState(false);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [copiedAllDetails, setCopiedAllDetails] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiService.getGeolocationProviderStatus()
      .then((status) => {
        if (!cancelled) {
          setProviderStatus(status);
          setProviderStatusError(null);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setProviderStatusError(cause instanceof Error ? cause.message : 'Could not verify the geolocation provider.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => () => {
    requestIdRef.current += 1;
    controllerRef.current?.abort();
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
  }, []);

  const handleLookup = async (targetIp = ipInput) => {
    const ip = targetIp.trim();
    if (!ip) {
      setError('Enter an IPv4 or IPv6 address to explore its approximate location.');
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const requestId = ++requestIdRef.current;
    setIpInput(ip);
    setLastRequestedIp(ip);
    setLoading(true);
    setError(null);
    setPreviousResult(Boolean(result));
    setRequestFailed(false);

    const timeoutId = window.setTimeout(() => controller.abort(), 10000);
    try {
      const data = await apiService.lookupIp(ip, controller.signal);
      if (requestId !== requestIdRef.current) return;
      setResult(data);
      setPreviousResult(false);
    } catch (cause) {
      if (requestId !== requestIdRef.current || (controller.signal.aborted && controllerRef.current !== controller)) return;
      setError(cause instanceof Error ? cause.message : 'The IP geolocation lookup failed.');
      setRequestFailed(true);
    } finally {
      window.clearTimeout(timeoutId);
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  const handleLoadDemo = () => {
    controllerRef.current?.abort();
    setIpInput('198.51.100.42');
    setLastRequestedIp('198.51.100.42');
    setResult(EDUCATIONAL_DEMO_DATA);
    setError(null);
    setPreviousResult(false);
    setRequestFailed(false);
  };

  const copyToClipboard = async (value: string, isAll = false) => {
    try {
      await navigator.clipboard.writeText(value);
      if (isAll) {
        setCopiedAllDetails(true);
        if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
        copyTimerRef.current = window.setTimeout(() => setCopiedAllDetails(false), 2000);
      } else {
        setCopiedValue(value);
        if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
        copyTimerRef.current = window.setTimeout(() => setCopiedValue(null), 1800);
      }
    } catch {
      setError('Could not copy to the clipboard. Check browser clipboard permissions.');
    }
  };

  const isDemo = Boolean(result?.isDemoData || (result?.dataOrigin as string) === 'demo_data');
  const resultIsLive = Boolean(result && result.source === 'live_provider' && result.dataOrigin === 'live_provider');
  const isPreviousResult = Boolean(result && previousResult);
  const latitude = result ? coordinateValue(result.lat, -90, 90) : null;
  const longitude = result ? coordinateValue(result.lon, -180, 180) : null;
  const hasCoordinates = latitude !== null && longitude !== null;
  const flag = countryFlag(result?.countryCode);

  const villageTown = [result?.village, result?.town].filter(Boolean).join(' / ');
  const countryDisplay = result?.country
    ? `${result.country}${result.countryCode ? ` (${result.countryCode})` : ''}`
    : 'Not available';

  const locationParts = result
    ? [result.city, villageTown, result.region, result.district, result.country]
      .filter((part): part is string => Boolean(part?.trim()))
    : [];

  const summary = (result?.isValid && (resultIsLive || isDemo))
    ? `Approximate IP location estimated${locationParts.length ? ` in ${locationParts.join(', ')}` : ''}${hasCoordinates ? `. Approximate coordinates: ${latitude}, ${longitude}.` : '.'}`
    : '';

  const formattedDetails = result ? [
    '=== OmniSec Analyzer — Geo Location IP Tracker ===',
    `IP Address: ${result.ip || 'Not available'}`,
    `City: ${displayValue(result.city)}`,
    `Village / Town: ${displayValue(villageTown)}`,
    `Region / State: ${displayValue(result.region)}`,
    `District: ${displayValue(result.district)}`,
    `Country: ${countryDisplay}`,
    `Postal Code / PIN Code: ${displayValue(result.postalCode)}`,
    `Latitude: ${latitude !== null ? String(latitude) : 'Not available'}`,
    `Longitude: ${longitude !== null ? String(longitude) : 'Not available'}`,
    `Timezone: ${displayValue(result.timezone)}`,
    `ISP / Organization: ${displayValue(result.isp)}`,
    `Connection Type: ${displayValue(result.connectionType)}`,
    ...(result.asn ? [`ASN: ${result.asn}`] : []),
    `Data Origin: ${isDemo ? 'Demo data — not a live lookup' : resultIsLive ? 'Live provider lookup (ipapi.co)' : result.dataOrigin === 'private_network' ? 'Private / reserved network' : 'Unknown'}`,
    'Accuracy: Approximate IP network location; not an exact home address or live GPS position.'
  ].join('\n') : '';

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="rounded-2xl border border-[#1F2937] bg-[#111827] p-5 shadow-xl sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-800 bg-cyan-950 text-cyan-300">
            <Globe2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-white">Geo Location IP Tracker</h1>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wide ${
                providerStatus
                  ? 'border-emerald-700/70 bg-emerald-950/40 text-emerald-300'
                  : 'border-amber-700/70 bg-amber-950/40 text-amber-300'
              }`}>
                <Radio className="h-3 w-3" />
                {providerStatus ? 'Live provider · No key required' : 'Provider status unavailable'}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-gray-400">
              Interactive map and network intelligence for public IP addresses with OpenStreetMap.
              <TooltipInfo
                term="Approximate IP location"
                englishExplanation="IP geolocation estimates the network routing center or provider service area. It does not identify an individual person's exact home or live GPS location."
              />
            </p>
          </div>
        </div>
      </header>

      {/* Search Input Section */}
      <section className="rounded-2xl border border-[#1F2937] bg-[#111827] p-4 sm:p-5">
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            void handleLookup();
          }}
        >
          <label className="min-w-0 flex-1">
            <span className="mb-1.5 block text-[10px] font-mono font-semibold uppercase tracking-widest text-slate-400">
              IP Address · IPv4 or IPv6
            </span>
            <input
              type="text"
              value={ipInput}
              onChange={(event) => setIpInput(event.target.value)}
              placeholder="e.g. 8.8.8.8 or 2001:4860:4860::8888"
              aria-label="IP address"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-xl border border-slate-700 bg-[#080e18] px-4 py-3 font-mono text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-700 px-5 py-3 font-mono text-xs font-bold text-slate-950 shadow-lg shadow-cyan-950/50 transition hover:from-cyan-500 hover:to-cyan-600 disabled:cursor-wait disabled:opacity-60 sm:min-w-40"
          >
            <Search className="h-4 w-4" />
            {loading ? 'Locating…' : 'Track IP Location'}
          </button>
        </form>

        {/* Quick Example IP buttons */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">Examples:</span>
          {[
            { label: '8.8.8.8 (Google)', ip: '8.8.8.8' },
            { label: '1.1.1.1 (Cloudflare)', ip: '1.1.1.1' },
            { label: '208.67.222.222 (OpenDNS)', ip: '208.67.222.222' }
          ].map((item) => (
            <button
              key={item.ip}
              type="button"
              disabled={loading}
              onClick={() => void handleLookup(item.ip)}
              className="rounded-lg border border-slate-700 bg-slate-950/70 px-2.5 py-1.5 font-mono text-[11px] text-cyan-200 transition hover:border-cyan-700 hover:bg-cyan-950/40 disabled:opacity-50"
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            disabled={loading}
            onClick={handleLoadDemo}
            title="Load educational demo dataset to test demo labels and fallback"
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-800/80 bg-amber-950/30 px-2.5 py-1.5 font-mono text-[11px] text-amber-200 transition hover:border-amber-600 hover:bg-amber-950/60 disabled:opacity-50"
          >
            <Sparkles className="h-3 w-3 text-amber-400" />
            Educational Demo Dataset
          </button>
        </div>

        {providerStatusError && (
          <div role="status" className="mt-3 flex items-start gap-2 rounded-xl border border-amber-900/60 bg-amber-950/20 p-3 text-[11px] leading-relaxed text-amber-100/80">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <p>Provider status verification note: {providerStatusError} Public IP lookups will continue through the backend.</p>
          </div>
        )}
      </section>

      {/* Error state */}
      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-800/80 bg-rose-950/40 p-3.5 text-xs text-rose-200">
          <span className="flex min-w-0 items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
            <span>{error}</span>
          </span>
          {!loading && requestFailed && lastRequestedIp && (
            <button
              type="button"
              onClick={() => void handleLookup(lastRequestedIp)}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-rose-700/80 px-3 py-2 font-mono text-[11px] font-semibold text-rose-100 transition hover:bg-rose-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              <Radio className="h-3.5 w-3.5" />
              Retry Lookup
            </button>
          )}
        </div>
      )}

      {/* Notice if displaying previous result while loading new */}
      {isPreviousResult && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-amber-800/70 bg-amber-950/25 px-3.5 py-3 text-xs text-amber-100">
          <Info className="h-4 w-4 shrink-0 text-amber-300" />
          <span>
            Displaying previous result for <strong className="font-mono">{result?.ip}</strong>
            {loading ? ` while querying ${lastRequestedIp}...` : `; previous data retained.`}
          </span>
        </div>
      )}

      {/* Interactive Map with Fallback & OpenStreetMap attribution */}
      <CityLocationMap result={result} loading={loading} />

      {/* Location Details Section below the map */}
      {result && (
        <section aria-labelledby="location-intelligence-heading" className="space-y-4 rounded-2xl border border-[#1F2937] bg-[#111827] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="location-intelligence-heading" className="text-base font-bold text-white">Location Details</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Network location attributes provided by the data source. Unsupplied fields show <span className="font-mono text-slate-300">Not available</span>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Demo vs Live vs Private Badge */}
              {isDemo ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-600/70 bg-amber-950/50 px-3 py-1 font-mono text-[11px] font-bold uppercase text-amber-300">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                  Demo data — not a live lookup
                </span>
              ) : resultIsLive ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-700/70 bg-emerald-950/40 px-3 py-1 font-mono text-[11px] font-bold uppercase text-emerald-300">
                  <Radio className="h-3.5 w-3.5 text-emerald-400" />
                  Live provider lookup · Approximate location
                </span>
              ) : result.dataOrigin === 'private_network' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-800/70 bg-cyan-950/40 px-3 py-1 font-mono text-[11px] font-bold uppercase text-cyan-300">
                  <Info className="h-3.5 w-3.5 text-cyan-400" />
                  Private / reserved network
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-800/70 bg-rose-950/40 px-3 py-1 font-mono text-[11px] font-bold uppercase text-rose-300">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
                  Invalid IP format
                </span>
              )}

              {/* Copy Location Details Button */}
              <button
                type="button"
                onClick={() => void copyToClipboard(formattedDetails, true)}
                disabled={!formattedDetails}
                className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/80 px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-600 hover:text-cyan-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 shadow-sm"
              >
                {copiedAllDetails ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>Copied Details!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-slate-400" />
                    <span>Copy Location Details</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {result.isValid ? (
            <>
              {/* Responsive Cards Grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <DetailCard
                  icon={Hash}
                  label="IP Address"
                  value={displayValue(result.ip)}
                  copyValue={result.ip}
                  copyLabel="IP address"
                  copied={copiedValue === result.ip}
                  onCopy={copyToClipboard}
                />
                <DetailCard icon={Building2} label="City" value={displayValue(result.city)} />
                <DetailCard icon={MapPin} label="Village / Town" value={displayValue(villageTown)} />
                <DetailCard icon={Compass} label="Region / State" value={displayValue(result.region)} />
                <DetailCard icon={MapPin} label="District" value={displayValue(result.district)} />
                <DetailCard
                  icon={Globe2}
                  label="Country"
                  value={countryDisplay}
                />
                <DetailCard icon={Hash} label="Postal Code / PIN Code" value={displayValue(result.postalCode)} />
                <DetailCard
                  icon={Navigation}
                  label="Latitude"
                  value={latitude === null ? 'Not available' : String(latitude)}
                  copyValue={latitude !== null ? String(latitude) : undefined}
                  copyLabel="latitude"
                  copied={copiedValue === String(latitude)}
                  onCopy={copyToClipboard}
                />
                <DetailCard
                  icon={Navigation}
                  label="Longitude"
                  value={longitude === null ? 'Not available' : String(longitude)}
                  copyValue={longitude !== null ? String(longitude) : undefined}
                  copyLabel="longitude"
                  copied={copiedValue === String(longitude)}
                  onCopy={copyToClipboard}
                />
                <DetailCard icon={Clock3} label="Timezone" value={displayValue(result.timezone)} />
                <DetailCard icon={Building2} label="ISP / Organization" value={displayValue(result.isp)} />
                <DetailCard icon={Wifi} label="Connection Type" value={displayValue(result.connectionType)} />
                {result.asn && (
                  <DetailCard icon={Radio} label="ASN" value={displayValue(result.asn)} />
                )}
              </div>

              {/* Summary banner if available */}
              {summary && (
                <div className="rounded-xl border border-cyan-900/60 bg-cyan-950/20 p-4">
                  <div className="flex items-start gap-3">
                    {flag && <span aria-label={`${result.country} flag`} className="text-2xl shrink-0">{flag}</span>}
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-cyan-400">Location summary</p>
                      <p className="mt-1 text-sm leading-relaxed text-cyan-50">{summary}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-4 text-sm text-rose-100">
              <p className="font-semibold">This input is not a valid IP address.</p>
              <p className="mt-1 text-xs text-rose-200/80">{result.error || 'Enter a valid IPv4 or IPv6 address and try again.'}</p>
            </div>
          )}

          {/* Privacy & Accuracy Notice */}
          <div className="flex items-start gap-2.5 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-xs leading-relaxed text-slate-400">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
            <p>
              <strong className="text-slate-300">Accuracy & Privacy Notice:</strong> IP geolocation provides an approximate network estimate (metropolitan, regional, or ISP hub level). It does <span className="underline decoration-cyan-500/50">not</span> identify an individual’s exact physical street address, residential house, or live GPS coordinate. Mobile data networks, proxies, and VPNs will route traffic through provider data centers.
            </p>
          </div>
        </section>
      )}
    </div>
  );
};
