import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Clock3,
  Globe2,
  Info,
  MapPin,
  Radio,
  Search,
  ShieldAlert,
  Wifi
} from 'lucide-react';
import { CityLocationMap } from '../geolocation/CityLocationMap';
import { TooltipInfo } from '../TooltipInfo';
import { apiService } from '../../services/api';
import type { GeolocationData, GeolocationProviderStatus } from '../../types';

function countryFlag(countryCode: string | undefined): string | null {
  if (!countryCode || !/^[a-z]{2}$/i.test(countryCode)) return null;
  return String.fromCodePoint(...countryCode.toUpperCase().split('').map((letter) => 127397 + letter.charCodeAt(0)));
}

function isLiveResult(result: GeolocationData): boolean {
  return result.source === 'live_provider' && result.dataOrigin === 'live_provider';
}

function hasCoordinates(result: GeolocationData): boolean {
  return typeof result.lat === 'number' &&
    Number.isFinite(result.lat) &&
    result.lat >= -90 &&
    result.lat <= 90 &&
    typeof result.lon === 'number' &&
    Number.isFinite(result.lon) &&
    result.lon >= -180 &&
    result.lon <= 180;
}

export const Geolocation: React.FC = () => {
  const [ipInput, setIpInput] = useState('');
  const [result, setResult] = useState<GeolocationData | null>(null);
  const [providerStatus, setProviderStatus] = useState<GeolocationProviderStatus | null>(null);
  const [providerStatusError, setProviderStatusError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

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
  }, []);

  const handleLookup = async (targetIp = ipInput) => {
    const ip = targetIp.trim();
    if (!ip) {
      setError('Enter an IPv4 or IPv6 address to locate.');
      setResult(null);
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const requestId = ++requestIdRef.current;
    setIpInput(ip);
    setLoading(true);
    setError(null);
    setResult(null);

    const timeoutId = window.setTimeout(() => controller.abort(), 10000);
    try {
      const data = await apiService.lookupIp(ip, controller.signal);
      if (requestId !== requestIdRef.current) return;
      setResult(data);
      if (!data.isValid) {
        setError(data.error || 'Enter a valid IPv4 or IPv6 address.');
      } else if (data.error) {
        setError(data.error);
      }
    } catch (cause) {
      if (requestId !== requestIdRef.current || controller.signal.aborted && controllerRef.current !== controller) return;
      setResult(null);
      setError(cause instanceof Error ? cause.message : 'The IP geolocation lookup failed.');
    } finally {
      window.clearTimeout(timeoutId);
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  const resultIsLive = result ? isLiveResult(result) : false;
  const flag = countryFlag(result?.countryCode);

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-[#1F2937] bg-[#111827] p-5 shadow-xl sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-800 bg-cyan-950 text-cyan-300">
            <Globe2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-white">Geolocation Intelligence</h1>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wide ${
                providerStatus
                  ? 'border-emerald-700/70 bg-emerald-950/40 text-emerald-300'
                  : 'border-amber-700/70 bg-amber-950/40 text-amber-300'
              }`}>
                <Radio className="h-3 w-3" />
                {providerStatus ? 'Live provider · no key' : 'Provider status unavailable'}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-gray-400">
              Locate an estimated city or network region from IP geolocation data.
              <TooltipInfo
                term="IP geolocation"
                englishExplanation="IP geolocation estimates the network or provider region associated with an IP address. It does not identify a person’s exact location."
              />
            </p>
          </div>
        </div>
      </header>

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
              IP address · IPv4 or IPv6
            </span>
            <input
              type="text"
              value={ipInput}
              onChange={(event) => setIpInput(event.target.value)}
              placeholder="e.g. 8.8.8.8"
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
            {loading ? 'Locating…' : 'Locate IP'}
          </button>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">Example IPs:</span>
          {['8.8.8.8', '1.1.1.1', '208.67.222.222'].map((ip) => (
            <button
              key={ip}
              type="button"
              disabled={loading}
              onClick={() => void handleLookup(ip)}
              className="rounded-lg border border-slate-700 bg-slate-950/70 px-2.5 py-1.5 font-mono text-[11px] text-cyan-200 transition hover:border-cyan-700 hover:bg-cyan-950/40 disabled:opacity-50"
            >
              {ip}
            </button>
          ))}
          <span className="text-[10px] text-slate-600">Each example performs a live provider lookup.</span>
        </div>
        {providerStatusError && (
          <div role="status" className="mt-3 flex items-start gap-2 rounded-xl border border-amber-900/60 bg-amber-950/20 p-3 text-[11px] leading-relaxed text-amber-100/80">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <p>Provider status could not be verified: {providerStatusError} IP lookups still go through the backend.</p>
          </div>
        )}
      </section>

      {error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-800/80 bg-rose-950/40 p-3.5 text-xs text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
          <span>{error}</span>
        </div>
      )}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <CityLocationMap result={result} loading={loading} />
        </div>

        <aside className="flex flex-col gap-3 rounded-2xl border border-[#1F2937] bg-[#111827] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Lookup result</span>
            {result && (
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 font-mono text-[9px] font-bold uppercase ${
                resultIsLive || result.dataOrigin === 'private_network'
                  ? 'border-emerald-700/70 bg-emerald-950/40 text-emerald-300'
                  : 'border-amber-700/70 bg-amber-950/40 text-amber-300'
              }`}>
                {resultIsLive ? <Radio className="h-3 w-3" /> : <Info className="h-3 w-3" />}
                {resultIsLive ? 'Live lookup' : result.dataOrigin === 'private_network' ? 'Private / reserved' : 'Invalid IP'}
              </span>
            )}
          </div>

          {result ? (
            <>
              <div className="rounded-xl border border-slate-800 bg-[#0B0F19] p-4">
                <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Estimated city / region</p>
                <div className="mt-2 flex items-start gap-2">
                  {flag && <span aria-label={`${result.country} flag`} className="mt-0.5 text-xl">{flag}</span>}
                  <div className="min-w-0">
                    <h2 className="break-words text-xl font-bold leading-tight text-white">
                      {result.city || (result.dataOrigin === 'private_network' ? 'Private or reserved IP' : 'Location unavailable')}
                    </h2>
                    {(result.region || result.country) && (
                      <p className="mt-1 break-words text-sm text-cyan-200">{[result.region, result.country].filter(Boolean).join(', ')}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#0B0F19] p-3">
                <div className="flex items-center gap-2 text-slate-500">
                  <Wifi className="h-3.5 w-3.5" />
                  <span className="font-mono text-[10px] uppercase tracking-wider">Network details</span>
                </div>
                <dl className="mt-3 space-y-2.5">
                  <div className="flex justify-between gap-3 text-xs">
                    <dt className="text-slate-500">IP address</dt><dd className="break-all text-right font-mono text-slate-200">{result.ip}</dd>
                  </div>
                  <div className="flex justify-between gap-3 text-xs">
                    <dt className="flex shrink-0 items-center gap-1.5 text-slate-500"><Building2 className="h-3 w-3" /> ISP / org</dt><dd className="break-words text-right text-slate-200">{result.isp || 'Not provided'}</dd>
                  </div>
                  <div className="flex justify-between gap-3 text-xs">
                    <dt className="text-slate-500">ASN</dt><dd className="break-words text-right font-mono text-violet-200">{result.asn || 'Not provided'}</dd>
                  </div>
                  <div className="flex justify-between gap-3 text-xs">
                    <dt className="flex shrink-0 items-center gap-1.5 text-slate-500"><Clock3 className="h-3 w-3" /> Time zone</dt><dd className="break-words text-right text-slate-200">{result.timezone || 'Not provided'}</dd>
                  </div>
                  <div className="flex justify-between gap-3 text-xs">
                    <dt className="text-slate-500">Status</dt><dd className={resultIsLive ? 'text-right text-emerald-300' : 'text-right text-amber-300'}>{resultIsLive ? 'Provider result' : result.dataOrigin === 'private_network' ? 'Not publicly geolocatable' : 'Invalid address'}</dd>
                  </div>
                </dl>
              </div>

              {resultIsLive && !hasCoordinates(result) && (
                <div role="status" className="flex items-start gap-2 rounded-xl border border-amber-800/70 bg-amber-950/25 p-3 text-[11px] leading-relaxed text-amber-100/80">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  Provider returned city data without valid coordinates. The map is not centered or marked for this result.
                </div>
              )}

              <p className="mt-auto flex items-start gap-2 border-t border-slate-800 pt-3 text-[10px] leading-relaxed text-slate-500">
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-700" />
                Location is estimated from IP network data and may represent a city or provider region. It does not identify a person's exact physical location or provide live GPS tracking.
              </p>
            </>
          ) : (
            <div className="flex min-h-64 flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-[#0B0F19] p-5 text-center">
              <MapPin className="h-7 w-7 text-slate-600" />
              <h2 className="mt-3 text-sm font-semibold text-slate-300">No lookup result yet</h2>
              <p className="mt-1 max-w-56 text-xs leading-relaxed text-slate-500">Enter an IP address to see city-level network information. Coordinates are never displayed as physical-location evidence.</p>
            </div>
          )}
        </aside>
      </section>

      <p className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-[10px] leading-relaxed text-slate-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        The highlighted circle is an approximate-area visual only, not a measured accuracy radius. Map tiles are provided by CARTO using OpenStreetMap data; usage is subject to their terms and attribution.
      </p>
    </div>
  );
};
