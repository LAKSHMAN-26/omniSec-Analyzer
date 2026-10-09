function resource(id, name, nodeType, parentCategory, description, purpose, officialUrl, tags, options = {}) {
    return {
        id,
        name,
        nodeType,
        parentCategory,
        description,
        purpose,
        useCases: options.useCases ?? [`Learn about ${name} for authorized, privacy-respecting research.`],
        officialUrl,
        githubUrl: options.githubUrl,
        documentationUrl: options.documentationUrl,
        pricingType: options.pricingType ?? 'unknown',
        openSourceStatus: options.openSourceStatus ?? 'unknown',
        tags,
        relatedResourceIds: options.relatedResourceIds ?? [],
        safetyNotes: options.safetyNotes ??
            'Use public information lawfully, follow the service terms, and validate findings with independent sources.',
        verificationStatus: options.verificationStatus ?? 'unverified'
    };
}
function topic(id, name, parentCategory, description, purpose, tags, children) {
    return {
        id,
        name,
        nodeType: 'subcategory',
        parentCategory,
        description,
        purpose,
        useCases: [`Explore ${name.toLowerCase()} concepts using public, authorized sources.`],
        pricingType: 'unknown',
        openSourceStatus: 'unknown',
        tags,
        relatedResourceIds: children.map((child) => child.id),
        safetyNotes: 'This topic is educational. Respect privacy, authorization, and applicable service terms.',
        verificationStatus: 'unverified',
        children
    };
}
function category(id, name, icon, description, topics) {
    return {
        id,
        name,
        nodeType: 'category',
        parentCategory: name,
        description,
        purpose: `Organize public resources for ${name.toLowerCase()}.`,
        useCases: ['Explore subtopics and curated public resources.'],
        pricingType: 'unknown',
        openSourceStatus: 'unknown',
        tags: [name.toLowerCase(), 'osint', 'learning'],
        relatedResourceIds: topics.map((item) => item.id),
        safetyNotes: 'Directory content only: this application does not collect information or interact with external services.',
        verificationStatus: 'unverified',
        icon,
        children: topics
    };
}
const generalSafety = 'Use only publicly available information for lawful, authorized purposes. Do not target private individuals, bypass access controls, or collect unnecessary personal data.';
export const osintCategories = [
    category('search', 'Search Engines & Advanced Search', 'search', 'Find publicly indexed information and learn how search operators narrow results.', [
        topic('search-engines', 'General search engines', 'Search Engines & Advanced Search', 'Search services index publicly accessible web pages and content.', 'Discover public documentation, announcements, and other web sources.', ['search', 'web'], [
            resource('google-advanced-search', 'Google Advanced Search', 'website', 'Search Engines & Advanced Search', 'A form for narrowing Google web searches by terms, language, region, and other options.', 'Find relevant public pages with fewer unrelated results.', 'https://www.google.com/advanced_search', ['search', 'web'], { documentationUrl: 'https://support.google.com/websearch/', useCases: ['Locate public documents on a topic.', 'Narrow a search by language or exact phrase.'], safetyNotes: generalSafety }),
        ]),
        topic('search-operators', 'Advanced search operators', 'Search Engines & Advanced Search', 'Search operators refine queries against content already indexed by a search engine.', 'Build precise queries while staying within public search interfaces.', ['operators', 'search'], [
            resource('google-search-operators', 'Google Search operators', 'documentation', 'Search Engines & Advanced Search', 'Google help resources describe supported search features and query behavior.', 'Understand search syntax and its limitations.', 'https://support.google.com/websearch/', ['operators', 'documentation'], { documentationUrl: 'https://support.google.com/websearch/', safetyNotes: generalSafety }),
        ]),
        topic('public-code-search', 'Public code search', 'Search Engines & Advanced Search', 'Explore code that repository owners have made public.', 'Research publicly documented software and project implementations.', ['code', 'repositories'], [
            resource('github', 'GitHub', 'website', 'Search Engines & Advanced Search', 'A platform for hosting and collaborating on software repositories.', 'Find public source code, project documentation, and release history.', 'https://github.com/', ['code', 'repositories', 'software'], { githubUrl: 'https://github.com/', safetyNotes: 'Review only public repositories. Never use exposed secrets or credentials; report them through the project’s responsible disclosure process.' }),
        ])
    ]),
    category('domain', 'Domain & DNS Intelligence', 'globe', 'Learn how public registration, DNS, and certificate records provide context about domains.', [
        topic('registration', 'Domain registration and WHOIS/RDAP', 'Domain & DNS Intelligence', 'Registration lookup services expose selected registration data subject to registry policy and privacy redaction.', 'Check public registration and registrar context for an authorized domain.', ['domain', 'whois', 'rdap'], [
            resource('icann-lookup', 'ICANN Lookup', 'website', 'Domain & DNS Intelligence', 'ICANN’s lookup service provides access to domain registration data.', 'Review available domain registration details.', 'https://lookup.icann.org/', ['domain', 'rdap'], { safetyNotes: 'Registration data may be redacted, stale, or incomplete. Do not use it to identify or contact private individuals.' }),
        ]),
        topic('dns-records', 'DNS records and domain mapping', 'Domain & DNS Intelligence', 'DNS records describe how a domain is configured to resolve on the internet.', 'Understand public DNS records and domain relationships.', ['dns', 'domain'], [
            resource('dnsdumpster', 'DNSDumpster', 'website', 'Domain & DNS Intelligence', 'A public DNS reconnaissance search service.', 'Review publicly discoverable DNS information for domains you are authorized to assess.', 'https://dnsdumpster.com/', ['dns', 'domain'], { safetyNotes: 'Use only for authorized domain research; service availability and terms may change.' }),
        ]),
        topic('certificate-transparency', 'Certificate transparency', 'Domain & DNS Intelligence', 'Certificate transparency logs provide public records of issued TLS certificates.', 'Review certificate issuance context and names associated with certificates.', 'certificate transparency domain'.split(' '), [
            resource('crt-sh', 'crt.sh', 'website', 'Domain & DNS Intelligence', 'A public search interface for certificate transparency logs.', 'Search publicly logged certificates for an authorized domain.', 'https://crt.sh/', ['certificate-transparency', 'tls', 'domain'], { safetyNotes: 'A certificate entry is not evidence of a vulnerability or current exposure.' }),
        ]),
        topic('domain-history', 'Domain relationship research', 'Domain & DNS Intelligence', 'Commercial and public services may provide historical DNS and domain relationship context.', 'Compare public domain data sources during an authorized assessment.', ['domain', 'history'], [
            resource('securitytrails', 'SecurityTrails', 'website', 'Domain & DNS Intelligence', 'A domain and DNS intelligence service with product access subject to its current terms.', 'Review domain and DNS context for an authorized organization.', 'https://securitytrails.com/', ['domain', 'dns', 'history'], { safetyNotes: 'Check account requirements, plan limits, and terms before use.' }),
        ])
    ]),
    category('network', 'IP Address & Network Intelligence', 'network', 'Explore public information about IP addresses, autonomous systems, and exposed internet services.', [
        topic('ip-context', 'IP address information', 'IP Address & Network Intelligence', 'IP lookup sources provide contextual network allocation and routing information.', 'Understand public IP ownership and routing context.', ['ip', 'network'], [
            resource('ipinfo', 'IPinfo', 'website', 'IP Address & Network Intelligence', 'An IP address data and network context service.', 'Review public IP and network context.', 'https://ipinfo.io/', ['ip', 'asn', 'network'], { safetyNotes: 'Geolocation and ownership estimates can be imprecise; do not infer an individual’s identity or exact location.' }),
            resource('ripestat', 'RIPEstat', 'website', 'IP Address & Network Intelligence', 'RIPE NCC’s public service provides information about internet number resources and routing.', 'Review public IP, ASN, and routing information.', 'https://stat.ripe.net/', ['ip', 'asn', 'routing'], { safetyNotes: generalSafety }),
        ]),
        topic('internet-assets', 'Public internet asset search', 'IP Address & Network Intelligence', 'Internet-wide search services index selected publicly reachable services and certificates.', 'Support authorized defensive asset inventory and exposure review.', ['internet', 'assets', 'defensive'], [
            resource('shodan', 'Shodan', 'website', 'IP Address & Network Intelligence', 'A search service for internet-connected devices and services.', 'Review an organization’s authorized public attack surface.', 'https://www.shodan.io/', ['internet', 'assets', 'search'], { safetyNotes: 'Use only for authorized defensive research. Public exposure does not itself demonstrate a vulnerability.' }),
            resource('censys', 'Censys', 'website', 'IP Address & Network Intelligence', 'An internet measurement and asset search platform.', 'Review public-facing assets within an authorized scope.', 'https://search.censys.io/', ['internet', 'assets', 'certificates'], { safetyNotes: 'Use only for authorized defensive research. Respect platform terms and access limits.' }),
        ]),
        topic('reputation', 'Network reputation and context', 'IP Address & Network Intelligence', 'Reputation databases aggregate reports that can help investigate network indicators.', 'Collect context for indicators during defensive analysis.', ['reputation', 'threat-intelligence'], [
            resource('virustotal-network', 'VirusTotal', 'website', 'IP Address & Network Intelligence', 'A service for examining files, URLs, domains, and IP addresses using multiple sources.', 'Review an indicator during authorized security analysis.', 'https://www.virustotal.com/', ['ip', 'domain', 'reputation'], { safetyNotes: 'Submitted data may be shared with security partners. Do not upload confidential or personal data without authorization.' }),
        ])
    ]),
    category('email', 'Email & Public Identity Research', 'mail', 'Understand organization-facing email resources while protecting personal privacy.', [
        topic('email-domain', 'Email-domain configuration', 'Email & Public Identity Research', 'Public DNS records can describe an organization’s mail configuration.', 'Learn defensive email-domain configuration concepts.', ['email', 'dns', 'domain'], [
            resource('mxtoolbox', 'MXToolbox', 'website', 'Email & Public Identity Research', 'A collection of public DNS and email diagnostic tools.', 'Review mail-domain configuration for a domain you are authorized to assess.', 'https://mxtoolbox.com/', ['email', 'dns'], { safetyNotes: generalSafety }),
        ]),
        topic('business-contacts', 'Public business contact discovery', 'Email & Public Identity Research', 'Some services index or infer business contact information from public sources.', 'Understand organization-level contact research and its limitations.', ['business', 'contacts', 'privacy'], [
            resource('hunter', 'Hunter', 'website', 'Email & Public Identity Research', 'A service for business-domain and professional contact discovery, subject to its terms.', 'Locate organization-level public contact channels for legitimate outreach.', 'https://hunter.io/', ['business', 'email'], { safetyNotes: 'Avoid targeting individuals. Follow applicable privacy law, service terms, and opt-out preferences.' }),
        ]),
        topic('email-verification', 'Email verification concepts', 'Email & Public Identity Research', 'Email reputation and verification services can return incomplete or probabilistic assessments.', 'Understand how verification signals are produced without treating them as identity proof.', ['email', 'verification', 'privacy'], [
            resource('emailrep', 'EmailRep', 'website', 'Email & Public Identity Research', 'A public email reputation service; its coverage, API behavior, and data handling should be reviewed before use.', 'Study email-reputation concepts with addresses you own or are authorized to assess.', 'https://emailrep.io/', ['email', 'reputation'], { safetyNotes: 'Do not query arbitrary personal addresses or use reputation data to target people. Check current service terms, privacy practices, and limits.' }),
        ]),
        topic('breach-notifications', 'Breach-notification resources', 'Email & Public Identity Research', 'Breach notification services help users check whether an address appears in known breach records.', 'Support account owners and defenders in exposure awareness.', ['privacy', 'breach', 'defense'], [
            resource('have-i-been-pwned', 'Have I Been Pwned', 'website', 'Email & Public Identity Research', 'A breach-notification service that helps users check their own email addresses and domains.', 'Help account holders understand known breach exposure.', 'https://haveibeenpwned.com/', ['privacy', 'breach', 'defense'], { useCases: ['Check an address you control.', 'Review organization-domain exposure with authorization.'], safetyNotes: 'Check only addresses or domains you own or are explicitly authorized to assess; never use breach data to target people.' }),
        ])
    ]),
    category('social-web', 'Social Media & Public Web Research', 'messages', 'Learn to evaluate public web content without scraping private accounts or over-collecting personal data.', [
        topic('public-content', 'Public posts and web archives', 'Social Media & Public Web Research', 'Public archives preserve snapshots of web pages that may later change or disappear.', 'Compare historical public pages while noting archival limitations.', ['archives', 'web', 'verification'], [
            resource('internet-archive', 'Internet Archive', 'website', 'Social Media & Public Web Research', 'A nonprofit digital library that provides access to archived web pages and other media.', 'Review archived public web pages as one source of context.', 'https://web.archive.org/', ['archives', 'web'], { safetyNotes: 'Archived content can be incomplete or altered; verify important claims with current primary sources.' }),
        ]),
        topic('media-verification', 'Public media verification', 'Social Media & Public Web Research', 'Verification resources help evaluate provenance, context, and claims in public media.', 'Learn to corroborate publicly shared media.', ['verification', 'media', 'fact-checking'], [
            resource('bellingcat-toolkit', 'Bellingcat Online Investigation Toolkit', 'learningResource', 'Social Media & Public Web Research', 'A collection of publicly documented tools and guidance for open-source investigations.', 'Learn verification methods and source evaluation.', 'https://bellingcat.gitbook.io/toolkit', ['verification', 'learning'], { documentationUrl: 'https://bellingcat.gitbook.io/toolkit', safetyNotes: 'Use ethically and lawfully; independently verify findings and avoid exposing private people.' }),
        ]),
        topic('public-profile-research', 'Public profile research', 'Social Media & Public Web Research', 'Public profiles can provide context but may be incomplete, impersonated, or misattributed.', 'Evaluate claims about organizations and public figures using public sources.', ['social-media', 'verification', 'privacy'], [
            resource('google-fact-check-explorer', 'Google Fact Check Explorer', 'website', 'Social Media & Public Web Research', 'A searchable index of fact-check articles from participating publishers.', 'Find published fact checks and follow their cited evidence.', 'https://toolbox.google.com/factcheck/explorer', ['fact-checking', 'verification'], { safetyNotes: 'A lack of search results is not proof that a claim is true or false.' }),
        ])
    ]),
    category('geo-media', 'Image, Video & Geolocation Research', 'image', 'Explore public tools for media context and location verification, with attention to uncertainty.', [
        topic('reverse-image', 'Reverse image search', 'Image, Video & Geolocation Research', 'Reverse image services find visually similar or matching images indexed by their systems.', 'Trace an image’s public context and possible earlier appearances.', ['image', 'verification'], [
            resource('google-lens', 'Google Lens', 'website', 'Image, Video & Geolocation Research', 'A visual search service for exploring image matches and related information.', 'Find visual context for media you are authorized to analyze.', 'https://lens.google/', ['image', 'visual-search'], { safetyNotes: 'Do not upload private or sensitive imagery without appropriate consent and authorization.' }),
            resource('tineye', 'TinEye', 'website', 'Image, Video & Geolocation Research', 'A reverse image search service that locates image matches in its index.', 'Check public image matches and source context.', 'https://tineye.com/', ['image', 'reverse-search'], { safetyNotes: 'An absent match does not prove an image is original or authentic.' }),
        ]),
        topic('maps', 'Public map resources', 'Image, Video & Geolocation Research', 'Public maps provide geographic context but differ in coverage, freshness, and precision.', 'Compare public map data for a safe, authorized scenario.', ['maps', 'geography'], [
            resource('openstreetmap', 'OpenStreetMap', 'website', 'Image, Video & Geolocation Research', 'A collaborative, open map of the world.', 'Explore geographic context using public map data.', 'https://www.openstreetmap.org/', ['maps', 'open-data'], { safetyNotes: 'Map data may be incomplete or outdated. Avoid using it to track or target private individuals.' }),
            resource('google-earth', 'Google Earth', 'website', 'Image, Video & Geolocation Research', 'A geographic visualization service providing map and imagery views.', 'Explore broad geographic context and publicly visible landmarks.', 'https://earth.google.com/', ['maps', 'imagery'], { safetyNotes: 'Imagery dates and resolution vary; do not treat imagery as real-time observation.' }),
        ]),
        topic('metadata', 'Image metadata and media context', 'Image, Video & Geolocation Research', 'Metadata can contain details about a file, but fields may be absent, modified, or inaccurate.', 'Inspect media metadata in a controlled, authorized workflow.', ['metadata', 'forensics', 'image'], [
            resource('exiftool', 'ExifTool', 'tool', 'Image, Video & Geolocation Research', 'A tool for reading, writing, and editing metadata in many file formats.', 'Inspect metadata from files you are authorized to handle.', 'https://exiftool.org/', ['metadata', 'forensics'], { safetyNotes: 'Metadata may be missing, altered, or misleading. Preserve original evidence and document handling.' }),
        ]),
        topic('video-verification', 'Video and geolocation verification', 'Image, Video & Geolocation Research', 'Video verification compares visible clues and provenance against independent public sources.', 'Practice cautious verification without tracking people or treating a location estimate as certainty.', ['video', 'geolocation', 'verification'], [
            resource('video-verification-basics', 'Video verification basics', 'learningResource', 'Image, Video & Geolocation Research', 'A learning topic about checking provenance, timestamps, visible landmarks, and corroborating sources.', 'Learn a repeatable approach to public-media verification.', undefined, ['video', 'geolocation', 'verification'], { safetyNotes: 'Do not identify, track, or expose private people. Location and time estimates can be wrong; document uncertainty.' }),
        ])
    ]),
    category('threat-intel', 'Threat Intelligence & Security Research', 'shield', 'Find public security advisories and indicator context for defensive research.', [
        topic('malware-intelligence', 'Malware intelligence', 'Threat Intelligence & Security Research', 'Public malware repositories and reports provide analysis context for defenders.', 'Research indicators and malware reports without executing unknown samples.', ['malware', 'defense'], [
            resource('malwarebazaar', 'MalwareBazaar', 'website', 'Threat Intelligence & Security Research', 'A community-driven malware sample exchange and threat intelligence resource.', 'Look up defensive context for known malware indicators.', 'https://bazaar.abuse.ch/', ['malware', 'threat-intelligence'], { safetyNotes: 'Do not download or execute samples on a normal workstation. Follow organizational malware-handling procedures.' }),
            resource('otx', 'AlienVault OTX', 'website', 'Threat Intelligence & Security Research', 'A threat intelligence community and indicator-sharing platform.', 'Review public threat pulses and indicator context.', 'https://otx.alienvault.com/', ['threat-intelligence', 'indicators'], { safetyNotes: 'Treat community indicators as leads, not confirmed attribution or proof of compromise.' }),
        ]),
        topic('advisories', 'Vulnerability databases and advisories', 'Threat Intelligence & Security Research', 'Public databases catalog vulnerability records and security advisories.', 'Check authoritative vulnerability descriptions and references.', ['vulnerability', 'advisories'], [
            resource('nvd', 'NIST National Vulnerability Database', 'website', 'Threat Intelligence & Security Research', 'NIST’s public vulnerability database provides vulnerability records and related references.', 'Research vulnerability identifiers and published context.', 'https://nvd.nist.gov/', ['vulnerability', 'cve'], { safetyNotes: 'Records can be updated and may not describe every deployment context; consult vendor advisories.' }),
            resource('mitre-attack', 'MITRE ATT&CK', 'documentation', 'Threat Intelligence & Security Research', 'A knowledge base describing adversary tactics and techniques based on observed behavior.', 'Structure defensive threat modeling and detection discussions.', 'https://attack.mitre.org/', ['threat-modeling', 'defense'], { documentationUrl: 'https://attack.mitre.org/', safetyNotes: 'ATT&CK technique inclusion is not proof that an actor or behavior applies to a particular environment.' }),
        ]),
        topic('file-reputation', 'File and indicator reputation', 'Threat Intelligence & Security Research', 'Reputation services aggregate multiple analysis sources for files and indicators.', 'Gather defensive context before escalating an indicator for analysis.', ['reputation', 'indicators'], [
            resource('virustotal-threat', 'VirusTotal', 'website', 'Threat Intelligence & Security Research', 'A service for examining files, URLs, domains, and IP addresses using multiple sources.', 'Review known indicator context during authorized analysis.', 'https://www.virustotal.com/', ['reputation', 'malware'], { safetyNotes: 'Submitted data may be shared with security partners. Do not upload confidential or personal data without authorization.' }),
        ])
    ]),
    category('technology', 'Public Code & Technology Discovery', 'code', 'Discover public repositories, package registries, and technology documentation.', [
        topic('source-code', 'Public source code', 'Public Code & Technology Discovery', 'Public source repositories document software, dependencies, and development history.', 'Research software components and public project documentation.', ['code', 'repositories'], [
            resource('gitlab', 'GitLab', 'website', 'Public Code & Technology Discovery', 'A platform for software development and source-code collaboration.', 'Explore projects and documentation made public by their owners.', 'https://gitlab.com/', ['code', 'repositories'], { safetyNotes: 'Review public content only; report exposed secrets responsibly and do not use them.' }),
            resource('github-tech', 'GitHub', 'website', 'Public Code & Technology Discovery', 'A platform for hosting and collaborating on software repositories.', 'Find public source code, project documentation, and release history.', 'https://github.com/', ['code', 'repositories'], { safetyNotes: 'Public repositories may contain unsafe or unmaintained code; do not run it without review.' }),
        ]),
        topic('technology-fingerprinting', 'Technology fingerprinting', 'Public Code & Technology Discovery', 'Technology identification can infer software from visible public web characteristics.', 'Understand technology context for assets within an authorized scope.', ['technology', 'web'], [
            resource('wappalyzer', 'Wappalyzer', 'website', 'Public Code & Technology Discovery', 'A technology lookup and identification service for websites.', 'Review publicly observable website technology context.', 'https://www.wappalyzer.com/', ['technology', 'web'], { safetyNotes: 'Technology detection can be inaccurate or outdated; do not treat it as proof of a vulnerability.' }),
        ]),
        topic('package-registries', 'Public package registries', 'Public Code & Technology Discovery', 'Package registries provide public package metadata, release history, and documentation.', 'Research public package ownership and dependency details.', ['packages', 'dependencies'], [
            resource('npm', 'npm', 'website', 'Public Code & Technology Discovery', 'A package registry and ecosystem for JavaScript software.', 'Review public package metadata and release information.', 'https://www.npmjs.com/', ['javascript', 'packages'], { safetyNotes: 'Package metadata can change; verify maintainers and integrity before depending on a package.' }),
            resource('pypi', 'PyPI', 'website', 'Public Code & Technology Discovery', 'The Python Package Index hosts public Python packages.', 'Review Python package metadata and release information.', 'https://pypi.org/', ['python', 'packages'], { safetyNotes: 'Verify package names and maintainers; typo-squatting and compromised packages are possible.' }),
        ])
    ]),
    category('forensics', 'Digital Forensics & Metadata', 'file-search', 'Learn evidence handling, metadata inspection, and reproducible forensic analysis.', [
        topic('file-metadata', 'File metadata', 'Digital Forensics & Metadata', 'File metadata describes properties recorded by file formats and applications.', 'Inspect metadata in files you are authorized to examine.', ['metadata', 'forensics'], [
            resource('exiftool-forensics', 'ExifTool', 'tool', 'Digital Forensics & Metadata', 'A tool for reading, writing, and editing metadata in many file formats.', 'Inspect file and image metadata in a documented workflow.', 'https://exiftool.org/', ['metadata', 'forensics'], { safetyNotes: 'Preserve original evidence; metadata can be missing, altered, or inaccurate.' }),
        ]),
        topic('forensic-tools', 'Forensic analysis tools', 'Digital Forensics & Metadata', 'Forensic suites support structured analysis of evidence with attention to preservation and chain of custody.', 'Learn about forensic workflows using approved test data.', ['forensics', 'evidence'], [
            resource('autopsy', 'Autopsy', 'tool', 'Digital Forensics & Metadata', 'A digital forensics platform for analyzing computer systems and evidence.', 'Explore forensic analysis concepts using authorized images or training data.', 'https://www.autopsy.com/', ['forensics', 'evidence'], { safetyNotes: 'Use only with proper authority and preserve evidence integrity and chain of custody.' }),
            resource('cyberchef', 'CyberChef', 'tool', 'Digital Forensics & Metadata', 'A web-based utility for performing data transformation and analysis operations.', 'Understand encodings and inspect non-sensitive sample data.', 'https://gchq.github.io/CyberChef/', ['analysis', 'encoding'], { safetyNotes: 'Avoid entering secrets or sensitive evidence into public hosted instances; use an approved local copy when needed.' }),
        ]),
        topic('evidence-preservation', 'Evidence preservation', 'Digital Forensics & Metadata', 'Evidence handling methods aim to preserve integrity and make analysis repeatable.', 'Learn to document collection, hashing, and analysis steps.', ['evidence', 'hashing'], [
            resource('forensic-hashing', 'File hash analysis', 'learningResource', 'Digital Forensics & Metadata', 'Cryptographic hashes can help detect whether file contents changed between measurements.', 'Understand integrity checks for authorized evidence handling.', undefined, ['hashing', 'evidence'], { safetyNotes: 'A matching hash supports byte-for-byte comparison; it does not prove file provenance or authenticity.' }),
        ])
    ]),
    category('learning', 'OSINT Frameworks & Learning', 'graduation-cap', 'Plan ethical research, evaluate sources, and communicate evidence with appropriate uncertainty.', [
        topic('methodologies', 'OSINT methodologies', 'OSINT Frameworks & Learning', 'Structured methodologies help scope questions, collect evidence, and document reasoning.', 'Plan a lawful, purpose-limited research workflow.', ['methodology', 'planning'], [
            resource('osint-framework', 'OSINT Framework', 'learningResource', 'OSINT Frameworks & Learning', 'A categorized directory of OSINT-related resources.', 'Discover public resources by research topic.', 'https://osintframework.com/', ['directory', 'learning'], { safetyNotes: 'The directory is a starting point, not an endorsement. Independently verify each tool, its terms, and safety.' }),
        ]),
        topic('investigation-planning', 'Investigation planning', 'OSINT Frameworks & Learning', 'A clear scope and collection plan reduce over-collection and improve repeatability.', 'Define questions, allowed sources, and stopping conditions before research.', ['planning', 'ethics'], [
            resource('bellingcat-toolkit-learning', 'Bellingcat Online Investigation Toolkit', 'learningResource', 'OSINT Frameworks & Learning', 'A collection of public tools and guidance for open-source investigations.', 'Learn source evaluation and investigation planning.', 'https://bellingcat.gitbook.io/toolkit', ['learning', 'verification'], { documentationUrl: 'https://bellingcat.gitbook.io/toolkit', safetyNotes: generalSafety }),
        ]),
        topic('source-evaluation', 'Evidence evaluation and reporting', 'OSINT Frameworks & Learning', 'Source evaluation considers provenance, corroboration, uncertainty, and alternative explanations.', 'Communicate what is known, what is not, and how conclusions were reached.', ['evidence', 'reporting', 'ethics'], [
            resource('owasp', 'OWASP', 'learningResource', 'OSINT Frameworks & Learning', 'A nonprofit foundation providing open resources for application security education.', 'Use security guidance as background for responsible technical reporting.', 'https://owasp.org/', ['security', 'learning'], { documentationUrl: 'https://owasp.org/', safetyNotes: 'Use resources lawfully and within the authorization and scope of any assessment.' }),
        ])
    ])
];
export const osintRoot = {
    id: 'osint-universe',
    name: 'OSINT UNIVERSE',
    nodeType: 'root',
    parentCategory: 'OSINT Universe',
    description: 'A visual directory for discovering public OSINT tools, sources, and learning resources.',
    purpose: 'Explore a safe, educational map of public resources.',
    useCases: ['Browse resource categories.', 'Learn a beginner-friendly research workflow.'],
    pricingType: 'unknown',
    openSourceStatus: 'unknown',
    tags: ['osint', 'directory', 'education'],
    relatedResourceIds: osintCategories.map((item) => item.id),
    safetyNotes: 'This directory does not collect information, perform scans, or interact with external services.',
    verificationStatus: 'unverified',
    children: osintCategories
};
