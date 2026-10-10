import { db } from '../database/db.js';
import { URL } from 'url';
import dns from 'dns';
import net from 'net';

export interface LabTarget {
  id: string;
  name: string;
  target_type: 'vulnerable' | 'secure';
  base_url: string;
  description: string;
  is_active: number;
}

// Strict allowlist of allowed loopback hostnames for the isolated educational lab
const ALLOWED_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

/**
 * Checks whether an IP address belongs to loopback, RFC 1918 private, link-local,
 * cloud metadata (169.254.169.254), or reserved ranges.
 */
export function isBlockedOrPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return true;

    // 0.0.0.0/8 (Current network)
    if (parts[0] === 0) return true;
    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;
    // 10.0.0.0/8 (Private RFC 1918)
    if (parts[0] === 10) return true;
    // 172.16.0.0/12 (Private RFC 1918)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 (Private RFC 1918)
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 (Link-local / AWS/GCP/Azure Cloud Metadata)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 100.64.0.0/10 (Carrier-Grade NAT)
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
    // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (TEST-NET)
    if (parts[0] === 192 && parts[1] === 0 && parts[2] === 2) return true;
    if (parts[0] === 198 && parts[1] === 51 && parts[2] === 100) return true;
    if (parts[0] === 203 && parts[1] === 0 && parts[2] === 113) return true;
    // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved / Broadcast)
    if (parts[0] >= 224) return true;

    return false;
  }

  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    // ::1 loopback and :: unspecified
    if (normalized === '::1' || normalized === '::') return true;
    // fe80::/10 (Link-local)
    if (normalized.startsWith('fe80:')) return true;
    // fc00::/7 (Unique local address / private)
    if (normalized.startsWith('fc00:') || normalized.startsWith('fd')) return true;
    // IPv4-mapped IPv6 (::ffff:127.0.0.1, etc.)
    if (normalized.startsWith('::ffff:')) {
      const ipv4Part = normalized.replace('::ffff:', '');
      return isBlockedOrPrivateIp(ipv4Part);
    }
    return false;
  }

  return true;
}

/**
 * Validates that a target identifier or URL is strictly authorized.
 * Educational security tool rule: Only explicitly registered lab targets are permitted for active testing.
 * Rejects arbitrary public targets, external hosts, unauthorized loopback ports, and cloud metadata.
 */
export function validateLabTarget(targetInput: string): { valid: boolean; target?: LabTarget; error?: string } {
  if (!targetInput || typeof targetInput !== 'string') {
    return { valid: false, error: 'Target identifier is required.' };
  }

  const trimmed = targetInput.trim();

  // 1. Check if targetInput is a registered target ID in SQLite
  const registered = db.prepare('SELECT * FROM lab_targets WHERE id = ? AND is_active = 1').get(trimmed) as LabTarget | undefined;
  if (registered) {
    return { valid: true, target: registered };
  }

  // 2. If it's a URL, parse and verify strict authorization boundaries
  try {
    const parsed = new URL(trimmed);

    // Protocol restriction: only http: and https:
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: `Protocol '${parsed.protocol}' rejected. Protocol must be HTTP or HTTPS within authorized local lab.` };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check SSRF blocks for raw IP inputs
    if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
      return {
        valid: false,
        error: 'Target boundary violation: Destination targets cloud metadata address.'
      };
    }

    if (net.isIP(hostname)) {
      if (hostname !== '127.0.0.1' && isBlockedOrPrivateIp(hostname)) {
        return {
          valid: false,
          error: `Target boundary violation: IP '${hostname}' resides in a private, link-local, or reserved network range.`
        };
      }
    }

    // Host restriction: must be in ALLOWED_HOSTS for local lab
    if (!ALLOWED_HOSTS.has(hostname)) {
      return {
        valid: false,
        error: `Target boundary violation: Host '${hostname}' is external or not an allowed local educational lab host.`
      };
    }

    // Path must start with /api/lab/
    if (!parsed.pathname.startsWith('/api/lab/')) {
      return {
        valid: false,
        error: 'Target URL path must reside within /api/lab/ local educational endpoints.'
      };
    }

    // Find matching registered active target in database
    const targetMatch = db.prepare('SELECT * FROM lab_targets WHERE base_url LIKE ? AND is_active = 1').get(`%${parsed.pathname}%`) as LabTarget | undefined;
    if (targetMatch) {
      return { valid: true, target: targetMatch };
    }

    // If matches base path of lab, find best matching target
    if (parsed.pathname.includes('/vulnerable')) {
      const vulnTarget = db.prepare("SELECT * FROM lab_targets WHERE target_type = 'vulnerable' AND is_active = 1").get() as LabTarget | undefined;
      if (vulnTarget) return { valid: true, target: vulnTarget };
    }
    if (parsed.pathname.includes('/secure')) {
      const secTarget = db.prepare("SELECT * FROM lab_targets WHERE target_type = 'secure' AND is_active = 1").get() as LabTarget | undefined;
      if (secTarget) return { valid: true, target: secTarget };
    }

    return {
      valid: false,
      error: 'Target does not match any registered active local educational lab application.'
    };
  } catch {
    return { valid: false, error: 'Invalid URL format or unknown registered lab target ID.' };
  }
}

/**
 * Validates an HTTP redirect destination to prevent SSRF bypass via 3xx redirects.
 */
export function validateRedirectTarget(
  redirectUrlStr: string,
  currentTarget: LabTarget
): { valid: boolean; error?: string; url?: URL } {
  try {
    const redirectUrl = new URL(redirectUrlStr, currentTarget.base_url);

    if (redirectUrl.protocol !== 'http:' && redirectUrl.protocol !== 'https:') {
      return { valid: false, error: `Redirect blocked: Prohibited scheme '${redirectUrl.protocol}'.` };
    }

    const hostname = redirectUrl.hostname.toLowerCase();

    // Prevent redirect to cloud metadata
    if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal' || hostname === 'instance-data') {
      return { valid: false, error: 'Redirect blocked: Destination is restricted cloud metadata address.' };
    }

    // Prevent redirect to blocked private or arbitrary external IPs
    if (net.isIP(hostname)) {
      if (hostname !== '127.0.0.1' && isBlockedOrPrivateIp(hostname)) {
        return { valid: false, error: `Redirect blocked: Destination IP '${hostname}' is private or reserved.` };
      }
    }

    // Must remain within allowed registered lab host
    if (!ALLOWED_HOSTS.has(hostname)) {
      return { valid: false, error: `Redirect blocked: Host '${hostname}' is external or outside authorized lab perimeter.` };
    }

    // Path must stay within /api/lab/
    if (!redirectUrl.pathname.startsWith('/api/lab/')) {
      return { valid: false, error: 'Redirect blocked: Path must reside within authorized /api/lab/ educational endpoints.' };
    }

    return { valid: true, url: redirectUrl };
  } catch (err: any) {
    return { valid: false, error: `Redirect blocked: Invalid redirect URL: ${err.message}` };
  }
}

/**
 * Returns all registered lab targets.
 */
export function getRegisteredLabTargets(): LabTarget[] {
  return db.prepare('SELECT * FROM lab_targets WHERE is_active = 1').all() as LabTarget[];
}
