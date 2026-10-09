import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('IP geolocation response integrity', () => {
  it('queries ipapi.co live without an API key and uses its city coordinates', async () => {
    vi.stubEnv('GEO_API_KEY', '');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      city: 'Mountain View',
      region: 'California',
      country_name: 'United States',
      country_code: 'US',
      latitude: 37.42301,
      longitude: -122.083352,
      org: 'Google LLC',
      asn: 'AS15169'
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await request(app).get('/api/geolocation/8.8.8.8');

    expect(response.status).toBe(200);
    expect(response.body.dataOrigin).toBe('live_provider');
    expect(response.body.source).toBe('live_provider');
    expect(response.body.city).toBe('Mountain View');
    expect(response.body.lat).toBe(37.42301);
    expect(response.body.lon).toBe(-122.083352);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://ipapi.co/8.8.8.8/json/',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('does not provide city-level data or coordinates for private and reserved addresses', async () => {
    const response = await request(app).get('/api/geolocation/192.168.1.10');

    expect(response.status).toBe(200);
    expect(response.body.dataOrigin).toBe('private_network');
    expect(response.body.source).toBe('not_queried');
    expect(response.body.city).toBeUndefined();
    expect(response.body.lat).toBeUndefined();
    expect(response.body.lon).toBeUndefined();
    expect(response.body.isDemoData).toBeUndefined();
  });

  it('omits invalid provider coordinates without guessing a map position', async () => {
    vi.stubEnv('GEO_API_KEY', '');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      city: 'Example City',
      region: 'Example Region',
      country_name: 'Example Country',
      latitude: 200,
      longitude: 500
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));

    const response = await request(app).get('/api/geolocation/9.9.9.9');

    expect(response.status).toBe(200);
    expect(response.body.dataOrigin).toBe('live_provider');
    expect(response.body.city).toBe('Example City');
    expect(response.body.lat).toBeUndefined();
    expect(response.body.lon).toBeUndefined();
  });

  it('surfaces provider rate limits without substituting other data', async () => {
    vi.stubEnv('GEO_API_KEY', '');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 429 })));

    const response = await request(app).get('/api/geolocation/9.9.9.9');

    expect(response.status).toBe(429);
    expect(response.body.message).toContain('rate limit');
  });

  it('surfaces provider timeouts without substituting other data', async () => {
    vi.stubEnv('GEO_API_KEY', '');
    const timeout = Object.assign(new Error('timed out'), { name: 'TimeoutError' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeout));

    const response = await request(app).get('/api/geolocation/9.9.9.9');

    expect(response.status).toBe(504);
    expect(response.body.message).toContain('timed out');
  });

  it('surfaces provider failures without substituting other data', async () => {
    vi.stubEnv('GEO_API_KEY', '');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })));

    const response = await request(app).get('/api/geolocation/9.9.9.9');

    expect(response.status).toBe(502);
    expect(response.body.message).toContain('HTTP 503');
  });
});
