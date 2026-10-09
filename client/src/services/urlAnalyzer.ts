export interface UrlWarning {
  code: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  explanation: string;
}

export interface UrlAnalysisResult {
  submittedUrl: string;
  parsedHostname: string;
  protocol: string;
  port?: string;
  pathname?: string;
  search?: string;
  verdict: 'VALIDATION PASSED' | 'SUSPICIOUS' | 'BLOCKED' | 'UNVERIFIED';
  warnings: UrlWarning[];
  recommendedNextSteps: string[];
  checksPerformed: string[];
  checksNotPerformed: string[];
  liveReputation: {
    status: string;
    details: string;
  };
  disclaimer: string;
}

const COMMON_BRAND_LOOKALIKES = [
  { brand: 'paypal', regex: /paypa[l1i]|p[a4]yp[a4]l/i },
  { brand: 'google', regex: /goog[l1]e|g00g[l1]e/i },
  { brand: 'microsoft', regex: /micros[o0]ft|m1crosoft/i },
  { brand: 'apple', regex: /app[l1]e|appl[e3]/i },
  { brand: 'amazon', regex: /amaz[o0]n|amz[o0]n/i },
  { brand: 'netflix', regex: /netf[l1]ix/i },
  { brand: 'chase', regex: /ch[a4]se-bank|chase-login/i }
];

const SUSPICIOUS_EXTENSIONS = ['.exe', '.scr', '.bat', '.cmd', '.sh', '.vbs', '.apk', '.msi', '.ps1'];

const PRIVATE_IP_RANGES = [
  /^127\./,                     // 127.0.0.0/8 (Loopback)
  /^10\./,                      // 10.0.0.0/8 (Private)
  /^192\.168\./,                // 192.168.0.0/16 (Private)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12 (Private)
  /^169\.254\./,                // 169.254.0.0/16 (Link-local / Cloud metadata)
  /^0\.0\.0\.0$/                // 0.0.0.0
];

/**
 * Analyzes a URL locally and passively without making any network requests.
 * Runs completely in-memory on the client machine.
 */
export function analyzeUrlSafetyLocally(rawInput: string): UrlAnalysisResult {
  const trimmed = (rawInput || '').trim();

  const checksPerformed = [
    'Syntactic URL validity (RFC 3986 parser)',
    'Scheme validation (HTTP / HTTPS allowed)',
    'Hostname presence check',
    'Embedded credentials inspection (RFC 3986 userinfo)',
    'Lookalike and brand typosquatting heuristic',
    'IP address hostname vs Domain format check',
    'Loopback and private-network IP boundary check',
    'Unusual encoding inspection (%25, %00, hex/octal)',
    'Transport encryption verification (HTTPS vs plain HTTP)',
    'Suspicious file extensions and open-redirect pattern check'
  ];

  const checksNotPerformed = [
    'Live DNS resolution (A / AAAA / CNAME records)',
    'Outbound HTTP / TLS connection handshake (No network traffic sent)',
    'Live domain reputation and threat-intelligence feed lookup',
    'Web page content inspection and DOM analysis',
    'Dynamic sandbox binary execution or detonation'
  ];

  const disclaimer =
    'URL analysis is not a guarantee that a website is safe. This tool does not visit the submitted URL or verify its live reputation.';

  const liveReputation = {
    status: 'Live reputation check unavailable.',
    details: 'No external threat intelligence provider configured in educational lab mode.'
  };

  // 1. Empty input
  if (!trimmed) {
    return {
      submittedUrl: '',
      parsedHostname: 'None',
      protocol: 'None',
      verdict: 'UNVERIFIED',
      warnings: [
        {
          code: 'EMPTY_INPUT',
          severity: 'LOW',
          title: 'Empty URL Provided',
          explanation: 'No URL was provided for analysis. Please paste a valid URL starting with http:// or https://.'
        }
      ],
      recommendedNextSteps: ['Paste or enter a valid URL to analyze its structure.'],
      checksPerformed,
      checksNotPerformed,
      liveReputation,
      disclaimer
    };
  }

  // 2. Syntax validation
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch (err: any) {
    return {
      submittedUrl: trimmed,
      parsedHostname: 'Invalid',
      protocol: 'Invalid',
      verdict: 'UNVERIFIED',
      warnings: [
        {
          code: 'SYNTAX_INVALID',
          severity: 'HIGH',
          title: 'Invalid URL Syntax',
          explanation: `The input could not be parsed by the standard URL parser: ${err.message}. Ensure the link includes a scheme like https://.`
        }
      ],
      recommendedNextSteps: [
        'Check for missing protocol prefix (e.g. use https://example.com instead of example.com).',
        'Verify there are no spaces or illegal characters in the address.'
      ],
      checksPerformed,
      checksNotPerformed,
      liveReputation,
      disclaimer
    };
  }

  const warnings: UrlWarning[] = [];
  let isBlocked = false;

  const protocol = parsed.protocol.toLowerCase();
  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname || '/';
  const search = parsed.search || '';
  const port = parsed.port || '';

  // 3. Scheme check
  if (protocol !== 'http:' && protocol !== 'https:') {
    isBlocked = true;
    warnings.push({
      code: 'PROHIBITED_SCHEME',
      severity: 'HIGH',
      title: `Prohibited Scheme: ${protocol}`,
      explanation: `The scheme '${protocol}' is outside permitted web protocols (only http:// and https:// are accepted). Schemes such as javascript:, file:, or data: can execute arbitrary actions or access local files.`
    });
  }

  // 4. Missing hostname check
  if (!hostname) {
    warnings.push({
      code: 'MISSING_HOSTNAME',
      severity: 'HIGH',
      title: 'Missing Hostname',
      explanation: 'The URL does not specify a target domain or IP address.'
    });
  }

  // 5. Embedded credentials check (http://user:pass@host)
  if (parsed.username || parsed.password) {
    isBlocked = true;
    warnings.push({
      code: 'EMBEDDED_CREDENTIALS',
      severity: 'HIGH',
      title: 'Embedded Credentials in URL Authority',
      explanation: 'The URL includes username or password components (userinfo). This format is often used in phishing attacks to mislead victims into confusing the username with the true destination.'
    });
  }

  // 6. Localhost & Private Network IP check
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  const isPrivateIp = PRIVATE_IP_RANGES.some((rx) => rx.test(hostname));
  if (isLocalhost || isPrivateIp) {
    isBlocked = true;
    warnings.push({
      code: 'PRIVATE_NETWORK_DESTINATION',
      severity: 'HIGH',
      title: 'Internal or Private Network Destination',
      explanation: `The hostname '${hostname}' resolves to a local loopback, private RFC 1918 range, or cloud metadata address. Public web links should never target private networks.`
    });
  }

  // 7. Numeric IP address instead of domain
  const isNumericIpv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
  const isIpv6 = hostname.startsWith('[') || hostname.includes(':');
  if ((isNumericIpv4 || isIpv6) && !isLocalhost && !isPrivateIp) {
    warnings.push({
      code: 'RAW_IP_HOSTNAME',
      severity: 'MEDIUM',
      title: 'Raw IP Address Used as Hostname',
      explanation: `The URL uses a direct IP address (${hostname}) instead of a registered domain name. Legitimate web services normally use registered domains with valid SSL/TLS certificates.`
    });
  }

  // 8. Lookalike domain / Brand typosquatting heuristics
  for (const { brand, regex } of COMMON_BRAND_LOOKALIKES) {
    if (regex.test(hostname) && !hostname.endsWith(`${brand}.com`) && !hostname.endsWith(`.${brand}.com`)) {
      warnings.push({
        code: 'LOOKALIKE_BRAND_TYPOSQUATTING',
        severity: 'HIGH',
        title: `Possible Brand Lookalike Detected (${brand})`,
        explanation: `The hostname contains patterns resembling '${brand}' but does not belong to the official root domain. This may be an attempt at typosquatting or brand impersonation.`
      });
    }
  }

  // Punycode / IDN homoglyph check
  if (hostname.includes('xn--')) {
    warnings.push({
      code: 'PUNYCODE_IDN_DOMAIN',
      severity: 'MEDIUM',
      title: 'Internationalized Domain (Punycode xn--)',
      explanation: 'The hostname uses Punycode encoding. While valid for non-ASCII languages, attackers frequently use Cyrillic or Greek lookalike characters to visually mimic known ASCII domains.'
    });
  }

  // Excessive subdomains check
  const domainParts = hostname.split('.');
  if (domainParts.length > 4) {
    warnings.push({
      code: 'EXCESSIVE_SUBDOMAINS',
      severity: 'LOW',
      title: 'Excessive Subdomain Depth',
      explanation: `The hostname has ${domainParts.length} levels of subdomains. Attackers often prefix familiar brand names as subdomains of an unrelated attacker-controlled root domain.`
    });
  }

  // Hyphen stuffing check
  const hyphenCount = (hostname.match(/-/g) || []).length;
  if (hyphenCount >= 3) {
    warnings.push({
      code: 'HYPHEN_STUFFING',
      severity: 'MEDIUM',
      title: 'Unusual Hyphen Frequency in Domain',
      explanation: `The domain contains ${hyphenCount} hyphens. Attackers frequently string together security keywords with hyphens to create deceptive domain names.`
    });
  }

  // 9. Unusual encoding
  if (trimmed.includes('%25') || trimmed.includes('%00') || trimmed.toLowerCase().includes('%2f%2f')) {
    warnings.push({
      code: 'UNUSUAL_ENCODING',
      severity: 'HIGH',
      title: 'Suspicious Character Encoding',
      explanation: 'The URL contains multi-layer encoding (%25) or null bytes (%00), which are commonly used to evade web application firewalls and target input sanitizers.'
    });
  }

  // 10. Non-standard port check
  if (port && port !== '80' && port !== '443') {
    warnings.push({
      code: 'NON_STANDARD_PORT',
      severity: 'LOW',
      title: `Non-Standard Port: ${port}`,
      explanation: `The URL specifies port ${port} instead of standard web ports (80 for HTTP, 443 for HTTPS). While common in development labs, public commercial services rarely use non-standard ports.`
    });
  }

  // 11. Insecure HTTP scheme
  if (protocol === 'http:' && !isLocalhost) {
    warnings.push({
      code: 'INSECURE_HTTP_SCHEME',
      severity: 'MEDIUM',
      title: 'Unencrypted HTTP Transport',
      explanation: 'The URL uses unencrypted HTTP. Data sent to this destination travels in plaintext across the network and can be intercepted or modified by intermediaries.'
    });
  }

  // 12. Suspicious file extension in path
  const lowerPath = pathname.toLowerCase();
  for (const ext of SUSPICIOUS_EXTENSIONS) {
    if (lowerPath.endsWith(ext) || lowerPath.includes(`${ext}?`)) {
      warnings.push({
        code: 'EXECUTABLE_DOWNLOAD_PATH',
        severity: 'HIGH',
        title: `Executable File Download Target (${ext})`,
        explanation: `The path targets a downloadable script or executable file (${ext}). Direct executable downloads in unsolicited links are a primary vector for malware distribution.`
      });
      break;
    }
  }

  // 13. Open redirect query parameters
  if (search) {
    const lowerSearch = search.toLowerCase();
    if (
      lowerSearch.includes('redirect=http') ||
      lowerSearch.includes('url=http') ||
      lowerSearch.includes('next=http') ||
      lowerSearch.includes('return=http') ||
      lowerSearch.includes('target=http')
    ) {
      warnings.push({
        code: 'POSSIBLE_OPEN_REDIRECT_PARAM',
        severity: 'MEDIUM',
        title: 'Potential Open-Redirect Parameter Detected',
        explanation: 'The query string contains a parameter containing a nested URL. Phishing attackers often abuse open-redirect parameters on reputable sites to forward users to malicious landing pages.'
      });
    }
  }

  // Determine overall verdict
  let verdict: 'VALIDATION PASSED' | 'SUSPICIOUS' | 'BLOCKED' | 'UNVERIFIED';

  if (isBlocked) {
    verdict = 'BLOCKED';
  } else if (warnings.some((w) => w.severity === 'HIGH' || w.severity === 'MEDIUM')) {
    verdict = 'SUSPICIOUS';
  } else if (warnings.length > 0) {
    verdict = 'SUSPICIOUS';
  } else {
    verdict = 'VALIDATION PASSED';
  }

  // Recommendations
  const recommendedNextSteps: string[] = [];
  if (verdict === 'BLOCKED') {
    recommendedNextSteps.push('Do not proceed to this link; it violates permitted network boundaries or contains prohibited structures.');
    recommendedNextSteps.push('Verify if the link was received from an untrusted or suspicious message.');
  } else if (verdict === 'SUSPICIOUS') {
    recommendedNextSteps.push('Carefully inspect the root domain before entering any login credentials or personal information.');
    recommendedNextSteps.push('Look for HTTPS lock indicator and check certificate ownership if visiting in a sandbox.');
    recommendedNextSteps.push('Never download executable attachments from unfamiliar domains.');
  } else {
    recommendedNextSteps.push('The URL format matches standard web specifications.');
    recommendedNextSteps.push('Always verify domain ownership and stay cautious of unexpected login prompts.');
  }

  return {
    submittedUrl: trimmed,
    parsedHostname: hostname,
    protocol: protocol.replace(':', ''),
    port: port || (protocol === 'https:' ? '443' : '80'),
    pathname,
    search: search || undefined,
    verdict,
    warnings,
    recommendedNextSteps,
    checksPerformed,
    checksNotPerformed,
    liveReputation,
    disclaimer
  };
}
