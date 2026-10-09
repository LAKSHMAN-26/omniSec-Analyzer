import net from 'net';

export interface GeolocationResult {
  ip: string;
  version: 'IPv4' | 'IPv6' | 'Invalid';
  isValid: boolean;
  country?: string;
  region?: string;
  city?: string;
  isp?: string;
  asn?: string;
  lat?: number;
  lon?: number;
  source: 'local_demo_provider' | 'live_provider';
  timestamp: string;
  disclaimer: string;
  error?: string;
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
      source: 'local_demo_provider',
      timestamp,
      disclaimer: 'The input provided is not a valid IPv4 or IPv6 address.',
      error: 'Invalid IP address format. Example valid IPv4: 8.8.8.8, IPv6: 2001:4860:4860::8888'
    };
  }

  const version = isV4 ? 'IPv4' : 'IPv6';
  const apiKey = process.env.GEO_API_KEY;

  // Check if target is a local loopback/private address
  if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.')) {
    return {
      ip: cleanIp,
      version,
      isValid: true,
      country: 'Localhost / Private Network',
      region: 'Internal Loopback',
      city: 'Local Workstation',
      isp: 'Loopback Adapter / LAN',
      asn: 'AS0000 (Private)',
      lat: 17.3850,
      lon: 78.4867, // Demo coordinates (Hyderabad, AP/Telangana area)
      source: 'local_demo_provider',
      timestamp,
      disclaimer: 'Private IP addresses (RFC 1918) reside on local networks and do not route over the public Internet.'
    };
  }

  // Attempt live lookup if key or fallback public service is enabled, otherwise use realistic demo database lookup
  if (apiKey) {
    try {
      const response = await fetch(`https://ipapi.co/${cleanIp}/json/?key=${apiKey}`);
      if (response.ok) {
        const data = (await response.json()) as any;
        return {
          ip: cleanIp,
          version,
          isValid: true,
          country: data.country_name || 'Unknown',
          region: data.region || 'Unknown',
          city: data.city || 'Unknown',
          isp: data.org || data.asn || 'Unknown ISP',
          asn: data.asn || 'N/A',
          lat: data.latitude,
          lon: data.longitude,
          source: 'live_provider',
          timestamp,
          disclaimer: 'IP geolocation is approximate (city/ISP level). It cannot identify specific physical home addresses or live GPS locations.'
        };
      }
    } catch (err) {
      console.warn('[IP Lookup Warning] Live API failed, falling back to local dataset:', err);
    }
  }

  // Realistic Local Demo Provider mapping for standard test IPs
  const demoDataset: Record<string, Partial<GeolocationResult>> = {
    '8.8.8.8': {
      country: 'United States',
      region: 'California',
      city: 'Mountain View',
      isp: 'Google LLC',
      asn: 'AS15169',
      lat: 37.4056,
      lon: -122.0775
    },
    '1.1.1.1': {
      country: 'Australia',
      region: 'New South Wales',
      city: 'Sydney',
      isp: 'Cloudflare Inc',
      asn: 'AS13335',
      lat: -33.8688,
      lon: 151.2093
    },
    '208.67.222.222': {
      country: 'United States',
      region: 'California',
      city: 'San Francisco',
      isp: 'OpenDNS / Cisco',
      asn: 'AS36692',
      lat: 37.7749,
      lon: -122.4194
    },
    '157.240.22.35': {
      country: 'India',
      region: 'Telangana',
      city: 'Hyderabad',
      isp: 'Meta Platforms Ireland',
      asn: 'AS32934',
      lat: 17.3850,
      lon: 78.4867
    }
  };

  const matched = demoDataset[cleanIp] || {
    country: 'Educational Demo Country',
    region: 'Demo Region',
    city: 'Demo City',
    isp: 'Global Internet Autonomous System',
    asn: 'AS99999',
    lat: 20.5937,
    lon: 78.9629 // Default India centroid for demo
  };

  return {
    ip: cleanIp,
    version,
    isValid: true,
    country: matched.country,
    region: matched.region,
    city: matched.city,
    isp: matched.isp,
    asn: matched.asn,
    lat: matched.lat,
    lon: matched.lon,
    source: 'local_demo_provider',
    timestamp,
    disclaimer: 'IP Geolocation is approximate and provided via local educational dataset. It cannot track precise live individual locations.'
  };
}
