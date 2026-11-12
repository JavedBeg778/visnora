// Visnora — URL Safety & Anti-SSRF Deep Validator
// Protects tracking pipelines, ad ingestion, and external URL submissions from SSRF attacks,
// loopback access, cloud metadata exfiltration, IPv6 tunneling, and DNS rebinding.
// Reference: docs/SECURITY.md Section 7.5 & M5.1 URL Ingestion Safety

import dns from 'dns';

const BLOCKED_SCHEMES = new Set([
  'javascript:',
  'data:',
  'file:',
  'vbscript:',
  'ftp:',
  'gopher:',
  'dict:',
  'ldap:',
  'tftp:',
]);

/**
 * Checks if an IPv4 address string (e.g. "192.168.1.1") falls within private/reserved ranges.
 */
function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some(isNaN)) return false;

  const [a, b] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;
  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  // 10.0.0.0/8 (RFC 1918 Private Class A)
  if (a === 10) return true;
  // 172.16.0.0/12 (RFC 1918 Private Class B: 172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 (RFC 1918 Private Class C)
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 (Link-local & AWS/GCP/Azure instance metadata)
  if (a === 169 && b === 254) return true;
  // 100.64.0.0/10 (Shared address space / Carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (a === 192 && b === 0) return true;
  // 198.18.0.0/15 (Benchmarking)
  if (a === 198 && (b === 18 || b === 19)) return true;
  // 224.0.0.0/4 (Multicast)
  if (a >= 224 && a <= 239) return true;
  // 240.0.0.0/4 (Reserved)
  if (a >= 240) return true;

  return false;
}

/**
 * Checks if an IPv6 address string falls within private, loopback, or link-local ranges.
 */
function isPrivateIpv6(rawIpv6: string): boolean {
  let ip = rawIpv6.toLowerCase().replace(/^\[|\]$/g, '').trim();

  // Loopback (::1, 0000:...:0001)
  if (ip === '::1' || ip === '::' || /^0*(:0*)*:1$/.test(ip)) return true;

  // IPv4-mapped IPv6 (::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (ip.startsWith('::ffff:')) {
    const mapped = ip.slice(7);
    if (mapped.includes('.')) {
      return isPrivateIpv4(mapped);
    }
  }

  // Unique Local Addresses (ULA - fc00::/7 -> fc00 to fdff)
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true;

  // Link-Local Unicast (fe80::/10 -> fe80 to febf)
  if (/^fe[89ab]/i.test(ip)) return true;

  // Site-Local (fec0::/10 - deprecated but blocked)
  if (/^fe[c-f]/i.test(ip)) return true;

  // Discard prefix (100::/64)
  if (ip.startsWith('100::')) return true;

  return false;
}

/**
 * Detects integer/hex/octal representations of IPv4 (e.g., 2130706433, 0x7f000001, 0177.0.0.1).
 */
function isEncodedIp(hostname: string): boolean {
  // Pure 32-bit integer (e.g. 2130706433 = 127.0.0.1, 2852039166 = 169.254.169.254)
  if (/^\d{8,11}$/.test(hostname)) {
    const num = parseInt(hostname, 10);
    if (!isNaN(num) && num > 0 && num <= 0xffffffff) {
      const a = (num >>> 24) & 255;
      const b = (num >>> 16) & 255;
      const c = (num >>> 8) & 255;
      const d = num & 255;
      return isPrivateIpv4(`${a}.${b}.${c}.${d}`);
    }
  }

  // Pure hexadecimal (e.g. 0x7f000001)
  if (/^0x[0-9a-f]{1,8}$/i.test(hostname)) {
    const num = parseInt(hostname, 16);
    if (!isNaN(num)) {
      const a = (num >>> 24) & 255;
      const b = (num >>> 16) & 255;
      const c = (num >>> 8) & 255;
      const d = num & 255;
      return isPrivateIpv4(`${a}.${b}.${c}.${d}`);
    }
  }

  // Octal/mixed parts (e.g. 0177.0.0.1)
  const parts = hostname.split('.');
  if (parts.length === 4 && parts.some((p) => p.startsWith('0') && p.length > 1)) {
    try {
      const dec = parts.map((p) => (p.startsWith('0x') ? parseInt(p, 16) : p.startsWith('0') ? parseInt(p, 8) : parseInt(p, 10)));
      if (dec.every((n) => !isNaN(n) && n >= 0 && n <= 255)) {
        return isPrivateIpv4(dec.join('.'));
      }
    } catch {
      return true; // Reject ambiguous encodings
    }
  }

  return false;
}

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /metadata\.google\.internal/i,
  /instance-data/i,
  /\.internal$/i,
  /\.local$/i,
  /\.lan$/i,
  /\.corp$/i,
  /\.home$/i,
];

export interface UrlValidationResult {
  safe: boolean;
  reason?: string;
  normalizedUrl?: string;
  domain?: string;
}

/**
 * Validates whether a given URL is safe for server-side processing,
 * preventing SSRF attacks against internal network resources or cloud metadata services.
 */
export function validateSafeUrl(rawUrl: string): UrlValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { safe: false, reason: 'URL must be a non-empty string' };
  }

  let trimmed = rawUrl.trim();

  // Strip trailing dot from hostname if present
  const lower = trimmed.toLowerCase();
  for (const scheme of BLOCKED_SCHEMES) {
    if (lower.startsWith(scheme)) {
      return { safe: false, reason: `Unsafe URL scheme detected: ${scheme}` };
    }
  }

  // Prepend https:// if protocol is omitted
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }

  try {
    const parsed = new URL(trimmed);

    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: `Disallowed protocol: ${parsed.protocol}` };
    }

    let hostname = parsed.hostname.toLowerCase();
    // Strip trailing dot
    if (hostname.endsWith('.')) {
      hostname = hostname.slice(0, -1);
    }

    // Check encoded IPs (decimal, hex, octal bypasses)
    if (isEncodedIp(hostname)) {
      return { safe: false, reason: 'Encoded or alternate IP representation targeting internal network' };
    }

    // Check direct IPv4
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      if (isPrivateIpv4(hostname)) {
        return { safe: false, reason: `Disallowed internal or private address: ${hostname}` };
      }
    }

    // Check direct IPv6
    if (hostname.includes(':') || hostname.startsWith('[')) {
      if (isPrivateIpv6(hostname)) {
        return { safe: false, reason: `Disallowed internal or private address: ${hostname}` };
      }
    }

    // Check hostname patterns (.internal, localhost, etc.)
    for (const pattern of BLOCKED_HOST_PATTERNS) {
      if (pattern.test(hostname)) {
        return { safe: false, reason: `Disallowed internal or private address: ${hostname}` };
      }
    }

    // Hostname must have at least one dot to be a valid public FQDN (unless external public IP)
    if (!hostname.includes('.')) {
      return { safe: false, reason: 'Hostname must be a valid fully qualified domain' };
    }

    const domain = hostname.replace(/^www\./, '');

    return {
      safe: true,
      normalizedUrl: parsed.toString(),
      domain,
    };
  } catch {
    return { safe: false, reason: 'Malformed URL structure' };
  }
}

/**
 * Quick boolean check for safe public URLs.
 */
export function isSafePublicUrl(rawUrl: string): boolean {
  return validateSafeUrl(rawUrl).safe;
}

/**
 * Resolves a hostname via DNS and verifies that all resolved IP addresses are public.
 * Defends against DNS rebinding attacks where an attacker configures a public domain
 * that resolves to 127.0.0.1 or 169.254.169.254.
 */
export async function resolveAndValidateHost(hostname: string): Promise<boolean> {
  return new Promise((resolve) => {
    dns.lookup(hostname, { all: true }, (err, addresses) => {
      if (err || !addresses || addresses.length === 0) {
        // If resolution fails, treat as unsafe for outbound requests
        resolve(false);
        return;
      }

      for (const entry of addresses) {
        if (entry.family === 4 && isPrivateIpv4(entry.address)) {
          resolve(false);
          return;
        }
        if (entry.family === 6 && isPrivateIpv6(entry.address)) {
          resolve(false);
          return;
        }
      }

      resolve(true);
    });
  });
}
