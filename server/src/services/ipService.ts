import net from 'net';

export type GeolocationSource = 'not_queried' | 'live_provider';
export type GeolocationDataOrigin =
  | 'live_provider'
  | 'private_network'
  | 'invalid_input';

export class GeolocationProviderError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = 'GeolocationProviderError';
  }
}

export interface GeolocationProviderStatus {
  provider: 'ipapi.co';
  authenticationRequired: false;
  message: string;
}

export interface GeolocationResult {
  ip: string;
  version: 'IPv4' | 'IPv6' | 'Invalid';
  isValid: boolean;
  country?: string;
  region?: string;
  city?: string;
  village?: string;
  town?: string;
  district?: string;
  countryCode?: string;
  isp?: string;
  asn?: string;
  connectionType?: string;
  timezone?: string;
  postalCode?: string;
  lat?: number;
  lon?: number;
  source: GeolocationSource;
  dataOrigin: GeolocationDataOrigin;
  timestamp: string;
  disclaimer: string;
  error?: string;
}

function ipv4ToNumber(ip: string): number {
  return ip.split('.').reduce((value, octet) => (value * 256) + Number(octet), 0);
}

function ipv4InRange(ip: string, network: string, prefixLength: number): boolean {
  const mask = prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;
  return (ipv4ToNumber(ip) & mask) === (ipv4ToNumber(network) & mask);
}

function isReservedIpv4(ip: string): boolean {
  const reservedRanges: Array<[string, number]> = [
    ['0.0.0.0', 8],
    ['10.0.0.0', 8],
    ['100.64.0.0', 10],
    ['127.0.0.0', 8],
    ['169.254.0.0', 16],
    ['172.16.0.0', 12],
    ['192.0.0.0', 24],
    ['192.0.2.0', 24],
    ['192.88.99.0', 24],
    ['192.168.0.0', 16],
    ['198.18.0.0', 15],
    ['198.51.100.0', 24],
    ['203.0.113.0', 24],
    ['224.0.0.0', 4],
    ['240.0.0.0', 4]
  ];
  return reservedRanges.some(([network, prefix]) => ipv4InRange(ip, network, prefix));
}

function ipv6ToBigInt(ip: string): bigint | null {
  let address = ip.toLowerCase();
  if (address.includes('.')) {
    const separator = address.lastIndexOf(':');
    const ipv4 = address.slice(separator + 1);
    if (!net.isIPv4(ipv4)) return null;
    const octets = ipv4.split('.').map(Number);
    const first = ((octets[0] << 8) | octets[1]).toString(16);
    const second = ((octets[2] << 8) | octets[3]).toString(16);
    address = `${address.slice(0, separator)}:${first}:${second}`;
  }

  const halves = address.split('::');
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missingCount = 8 - left.length - right.length;
  if ((halves.length === 1 && missingCount !== 0) || missingCount < 0) return null;
  const groups = [...left, ...Array(missingCount).fill('0'), ...right];
  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))) return null;
  return groups.reduce((value, group) => (value << 16n) | BigInt(`0x${group}`), 0n);
}

function ipv6InRange(address: bigint, network: bigint, prefixLength: number): boolean {
  return (address >> BigInt(128 - prefixLength)) === (network >> BigInt(128 - prefixLength));
}

export function isPrivateOrReservedIp(ip: string): boolean {
  if (net.isIPv4(ip)) return isReservedIpv4(ip);
  if (!net.isIPv6(ip)) return false;

  const address = ipv6ToBigInt(ip);
  if (address === null) return true;

  const mappedIpv4Prefix = BigInt('0xffff') << 32n;
  if (ipv6InRange(address, mappedIpv4Prefix, 96)) {
    const mappedIpv4 = Number(address & 0xffffffffn);
    const ipv4 = [
      (mappedIpv4 >>> 24) & 255,
      (mappedIpv4 >>> 16) & 255,
      (mappedIpv4 >>> 8) & 255,
      mappedIpv4 & 255
    ].join('.');
    return isReservedIpv4(ipv4);
  }

  const globalUnicastPrefix = BigInt('0x2000') << 112n;
  const documentationPrefix = BigInt('0x20010db8') << 96n;
  const uniqueLocalPrefix = BigInt('0xfc') << 120n;
  const linkLocalPrefix = BigInt('0xfe80') << 112n;
  const multicastPrefix = BigInt('0xff') << 120n;
  const discardOnlyPrefix = BigInt('0x100') << 120n;

  return !ipv6InRange(address, globalUnicastPrefix, 3) ||
    ipv6InRange(address, documentationPrefix, 32) ||
    ipv6InRange(address, uniqueLocalPrefix, 7) ||
    ipv6InRange(address, linkLocalPrefix, 10) ||
    ipv6InRange(address, multicastPrefix, 8) ||
    ipv6InRange(address, discardOnlyPrefix, 64);
}

export function getGeolocationProviderStatus(): GeolocationProviderStatus {
  return {
    provider: 'ipapi.co',
    authenticationRequired: false,
    message: 'Public IP lookups use ipapi.co without an API key, subject to its usage limits and terms.'
  };
}

export async function lookupIpGeolocation(ipAddress: string): Promise<GeolocationResult> {
  const cleanIp = ipAddress.trim();
  const timestamp = new Date().toISOString();
  const isV4 = net.isIPv4(cleanIp);
  const isV6 = net.isIPv6(cleanIp);

  if (!isV4 && !isV6) {
    return {
      ip: cleanIp,
      version: 'Invalid',
      isValid: false,
      source: 'not_queried',
      dataOrigin: 'invalid_input',
      timestamp,
      disclaimer: 'The input provided is not a valid IPv4 or IPv6 address.',
      error: 'Invalid IP address format. Example valid IPv4: 8.8.8.8, IPv6: 2001:4860:4860::8888'
    };
  }

  const version = isV4 ? 'IPv4' : 'IPv6';
  if (isPrivateOrReservedIp(cleanIp)) {
    return {
      ip: cleanIp,
      version,
      isValid: true,
      country: 'Private or reserved network',
      isp: 'Not available',
      asn: 'Not available',
      source: 'not_queried',
      dataOrigin: 'private_network',
      timestamp,
      disclaimer: 'Private, loopback, and reserved IP addresses do not identify a public network location. No city or map location is available.'
    };
  }

  let response: Response;
  try {
    response = await fetch(`https://ipapi.co/${encodeURIComponent(cleanIp)}/json/`, {
      signal: AbortSignal.timeout(8000)
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new GeolocationProviderError('The geolocation provider timed out. Please try again.', 504);
    }
    throw new GeolocationProviderError('Could not connect to the geolocation provider. Please try again.', 502);
  }

  if (response.status === 429) {
    throw new GeolocationProviderError('The geolocation provider rate limit was reached. Wait before trying again.', 429);
  }
  if (response.status === 401 || response.status === 403) {
    throw new GeolocationProviderError(
      'ipapi.co rejected the unauthenticated request. Check its current access requirements or use a different provider.',
      502
    );
  }
  if (!response.ok) {
    throw new GeolocationProviderError(`The geolocation provider returned HTTP ${response.status}. Please try again later.`, 502);
  }

  let data: Record<string, unknown>;
  try {
    data = await response.json() as Record<string, unknown>;
  } catch {
    throw new GeolocationProviderError('The geolocation provider returned an unreadable response.', 502);
  }
  if (data.error === true || data.error === 'true') {
    const reason = typeof data.reason === 'string' ? data.reason : '';
    if (/rate.?limit|quota|too many requests/i.test(reason)) {
      throw new GeolocationProviderError('The geolocation provider rate limit was reached. Wait before trying again.', 429);
    }
    if (/auth|api.?key|token|forbidden/i.test(reason)) {
      throw new GeolocationProviderError(
        `ipapi.co rejected the unauthenticated request: ${reason || 'authentication required'}`,
        502
      );
    }
    throw new GeolocationProviderError(
      reason || 'The geolocation provider could not locate this IP address.',
      502
    );
  }

  const numericField = (value: unknown): number | undefined => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
    if (typeof value !== 'string' || !value.trim()) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  const latitude = numericField(data.latitude);
  const longitude = numericField(data.longitude);
  const hasValidCoordinates = typeof latitude === 'number' && latitude >= -90 && latitude <= 90 &&
    typeof longitude === 'number' && longitude >= -180 && longitude <= 180;
  const countryCode = typeof data.country_code === 'string' && /^[a-z]{2}$/i.test(data.country_code)
    ? data.country_code.toUpperCase()
    : undefined;
  const textField = (value: unknown): string | undefined =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined;

  return {
    ip: cleanIp,
    version,
    isValid: true,
    country: textField(data.country_name),
    countryCode,
    region: textField(data.region),
    city: textField(data.city),
    village: textField(data.village),
    town: textField(data.town),
    district: textField(data.district),
    postalCode: textField(data.postal),
    isp: textField(data.org) ?? textField(data.asn),
    asn: textField(data.asn),
    connectionType: textField(data.connection_type),
    timezone: textField(data.timezone),
    ...(hasValidCoordinates ? { lat: latitude, lon: longitude } : {}),
    source: 'live_provider',
    dataOrigin: 'live_provider',
    timestamp,
    disclaimer: 'Location is estimated from IP network data and may represent a city or provider region. It does not identify a person’s exact physical location or provide live GPS tracking.'
  };
}
