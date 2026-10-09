import { db } from '../database/db.js';
import { URL } from 'url';

export interface LabTarget {
  id: string;
  name: string;
  target_type: 'vulnerable' | 'secure';
  base_url: string;
  description: string;
  is_active: number;
}

// Strict allowlist of allowed loopback hostnames
const ALLOWED_HOSTS = new Set(['127.0.0.1', 'localhost']);

/**
 * Validates that a target URL is strictly restricted to the registered local educational lab.
 * Rejects external URLs, public IPs, redirects, cloud metadata endpoints, or unregistered paths.
 */
export function validateLabTarget(targetInput: string): { valid: boolean; target?: LabTarget; error?: string } {
  if (!targetInput || typeof targetInput !== 'string') {
    return { valid: false, error: 'Target identifier is required.' };
  }

  // 1. Check if targetInput is a registered target ID (e.g., 'lab-vulnerable' or 'lab-secure')
  const registered = db.prepare('SELECT * FROM lab_targets WHERE id = ? AND is_active = 1').get(targetInput) as LabTarget | undefined;
  if (registered) {
    return { valid: true, target: registered };
  }

  // 2. If it's a URL, parse and verify strict loopback boundaries
  try {
    const parsed = new URL(targetInput);

    // Protocol restriction
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Protocol must be HTTP or HTTPS within local lab.' };
    }

    // Host restriction (must be 127.0.0.1 or localhost)
    const hostname = parsed.hostname.toLowerCase();
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

    // Find matching registered target
    const targetMatch = db.prepare('SELECT * FROM lab_targets WHERE base_url LIKE ? AND is_active = 1').get(`%${parsed.pathname}%`) as LabTarget | undefined;
    if (targetMatch) {
      return { valid: true, target: targetMatch };
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
 * Returns all registered lab targets.
 */
export function getRegisteredLabTargets(): LabTarget[] {
  return db.prepare('SELECT * FROM lab_targets WHERE is_active = 1').all() as LabTarget[];
}
