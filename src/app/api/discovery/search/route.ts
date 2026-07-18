import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// In-memory search cache (5-minute TTL)
// ---------------------------------------------------------------------------
const searchCache = new Map<string, { urls: string[]; source: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function extractUrls(html: string): string[] {
  const urls: string[] = [];
  const regex = /href="([^"]+)"/g;
  let match;
  const reserved = [
    'pricing',
    'login',
    'about',
    'explore',
    'faq',
    'contact',
    'search',
    'terms',
    'privacy',
    'blog',
    'case-studies',
    'resources',
    'find-influencers',
    'kol-directory',
    'influencer-marketing-platform',
    'agency',
    'brand',
    'creator',
    'signup',
  ];

  while ((match = regex.exec(html)) !== null) {
    const rawUrl = match[1];
    try {
      const decodedUrl = decodeURIComponent(rawUrl);
      
      // 1. Extract Qoruz URLs
      if (decodedUrl.includes('qoruz.com')) {
        let qoruzUrl = '';
        if (decodedUrl.includes('uddg=')) {
          const parts = decodedUrl.split('uddg=');
          if (parts.length > 1) {
            const potential = parts[1].split('&')[0];
            if (potential.startsWith('http')) {
              qoruzUrl = potential;
            }
          }
        } else if (decodedUrl.startsWith('http') || decodedUrl.startsWith('https')) {
          qoruzUrl = decodedUrl;
        }

        if (qoruzUrl) {
          const urlObj = new URL(qoruzUrl);
          const path = urlObj.pathname.replace(/^\/|\/$/g, '');
          const segments = path.split('/');
          const handle = segments[0];

          if (handle && !reserved.includes(handle.toLowerCase())) {
            const finalUrl = `https://qoruz.com/${handle}`;
            if (!urls.includes(finalUrl)) {
              urls.push(finalUrl);
            }
          }
        }
      }

      // 2. Extract StarNgage URLs
      if (decodedUrl.includes('starngage.com/app/global/influencer/instagram')) {
        let starngageUrl = '';
        if (decodedUrl.includes('uddg=')) {
          const parts = decodedUrl.split('uddg=');
          if (parts.length > 1) {
            const potential = parts[1].split('&')[0];
            if (potential.startsWith('http')) {
              starngageUrl = potential;
            }
          }
        } else if (decodedUrl.startsWith('http') || decodedUrl.startsWith('https')) {
          starngageUrl = decodedUrl;
        }

        if (starngageUrl) {
          const urlObj = new URL(starngageUrl);
          const path = urlObj.pathname.replace(/^\/|\/$/g, '');
          const segments = path.split('/');
          
          const instagramIdx = segments.indexOf('instagram');
          if (instagramIdx !== -1 && segments[instagramIdx + 1]) {
            const handle = segments[instagramIdx + 1];
            if (handle && !reserved.includes(handle.toLowerCase())) {
              const finalUrl = `https://starngage.com/app/global/influencer/instagram/${handle}`;
              if (!urls.includes(finalUrl)) {
                urls.push(finalUrl);
              }
            }
          }
        }
      }

      // 3. Extract Collabstr URLs
      if (decodedUrl.includes('collabstr.com')) {
        let collabstrUrl = '';
        if (decodedUrl.includes('uddg=')) {
          const parts = decodedUrl.split('uddg=');
          if (parts.length > 1) {
            const potential = parts[1].split('&')[0];
            if (potential.startsWith('http')) {
              collabstrUrl = potential;
            }
          }
        } else if (decodedUrl.startsWith('http') || decodedUrl.startsWith('https')) {
          collabstrUrl = decodedUrl;
        }

        if (collabstrUrl) {
          const urlObj = new URL(collabstrUrl);
          const path = urlObj.pathname.replace(/^\/|\/$/g, '');
          const segments = path.split('/');
          const handle = segments[0];

          if (handle && !reserved.includes(handle.toLowerCase())
              && !handle.startsWith('instagram-influencers')
              && !handle.startsWith('tiktok-influencers')
              && !handle.startsWith('youtube-influencers')) {
            const finalUrl = `https://collabstr.com/${handle}`;
            if (!urls.includes(finalUrl)) {
              urls.push(finalUrl);
            }
          }
        }
      }

    } catch (e) {
      // Ignore invalid URLs
    }
  }
  return urls;
}

// ---------------------------------------------------------------------------
// Search Functions — 3-tier cascade: Google → Serper → DuckDuckGo
// ---------------------------------------------------------------------------

const SEARCH_QUERY_TEMPLATE = (niche: string) =>
  `(site:qoruz.com OR site:starngage.com/app/global/influencer/instagram OR site:collabstr.com) "${niche}" "gmail.com"`;

const SERPER_QUERY_TEMPLATE = (niche: string) =>
  `${niche} influencer instagram qoruz starngage collabstr email`;

/**
 * Extract profile URLs from JSON search results (Google / Serper).
 * Looks for Qoruz, StarNgage, and Collabstr links in the result URLs.
 */
function extractUrlsFromJson(results: { link?: string; url?: string }[]): string[] {
  const reserved = [
    'pricing', 'login', 'about', 'explore', 'faq', 'contact', 'search',
    'terms', 'privacy', 'blog', 'case-studies', 'resources',
    'find-influencers', 'kol-directory', 'influencer-marketing-platform',
    'agency', 'brand', 'creator', 'signup',
  ];
  const urls: string[] = [];

  for (const item of results) {
    const rawUrl = item.link || item.url || '';
    try {
      const urlObj = new URL(rawUrl);
      const host = urlObj.hostname;
      const path = urlObj.pathname.replace(/^\/|\/$/g, '');
      const segments = path.split('/');

      // Qoruz
      if (host.includes('qoruz.com')) {
        const handle = segments[0];
        if (handle && !reserved.includes(handle.toLowerCase())) {
          const finalUrl = `https://qoruz.com/${handle}`;
          if (!urls.includes(finalUrl)) urls.push(finalUrl);
        }
      }

      // StarNgage
      if (host.includes('starngage.com') && path.includes('instagram')) {
        const instagramIdx = segments.indexOf('instagram');
        if (instagramIdx !== -1 && segments[instagramIdx + 1]) {
          const handle = segments[instagramIdx + 1];
          if (handle && !reserved.includes(handle.toLowerCase())) {
            const finalUrl = `https://starngage.com/app/global/influencer/instagram/${handle}`;
            if (!urls.includes(finalUrl)) urls.push(finalUrl);
          }
        }
      }

      // Collabstr
      if (host.includes('collabstr.com')) {
        const handle = segments[0];
        if (handle && !reserved.includes(handle.toLowerCase())
            && !handle.startsWith('instagram-influencers')
            && !handle.startsWith('tiktok-influencers')
            && !handle.startsWith('youtube-influencers')) {
          const finalUrl = `https://collabstr.com/${handle}`;
          if (!urls.includes(finalUrl)) urls.push(finalUrl);
        }
      }
    } catch {
      // Ignore invalid URLs
    }
  }
  return urls;
}

/**
 * Tier 1: Google Custom Search API (100 free queries/day)
 */
async function searchGoogle(niche: string): Promise<string[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;
  if (!apiKey || !cx) {
    console.log('[Google Search] Skipped — GOOGLE_SEARCH_API_KEY or GOOGLE_SEARCH_CX not set.');
    return [];
  }

  const query = SEARCH_QUERY_TEMPLATE(niche);
  try {
    console.log(`[Google Search] Searching for: ${niche}`);
    const res = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=10`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!res.ok) {
      console.warn(`[Google Search] HTTP ${res.status}: ${await res.text()}`);
      return [];
    }

    const data = await res.json();
    const items = data.items || [];
    const urls = extractUrlsFromJson(items);
    console.log(`[Google Search] Found ${urls.length} profile URLs.`);
    return urls;
  } catch (e: any) {
    console.error(`[Google Search] Error: ${e.message}`);
    return [];
  }
}

/**
 * Tier 2: Serper.dev (2,500 free credits on signup)
 */
async function searchSerper(niche: string): Promise<string[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    console.log('[Serper] Skipped — SERPER_API_KEY not set.');
    return [];
  }

  const query = SERPER_QUERY_TEMPLATE(niche);
  try {
    console.log(`[Serper] Searching for: ${niche} (free-tier query)`);
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: 30 }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(`[Serper] HTTP ${res.status}: ${await res.text()}`);
      return [];
    }

    const data = await res.json();
    const organic = data.organic || [];
    const urls = extractUrlsFromJson(organic);
    console.log(`[Serper] Found ${urls.length} profile URLs.`);
    return urls;
  } catch (e: any) {
    console.error(`[Serper] Error: ${e.message}`);
    return [];
  }
}

/**
 * Tier 3: DuckDuckGo Lite (free, no API key, but captcha-prone)
 */
async function searchDuckDuckGo(niche: string): Promise<string[]> {
  const query = SEARCH_QUERY_TEMPLATE(niche);
  const endpoints = [
    'https://html.duckduckgo.com/html/',
    'https://lite.duckduckgo.com/lite/',
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`[DuckDuckGo] Trying ${endpoint} for: ${niche}`);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://duckduckgo.com/',
        },
        body: `q=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        console.warn(`[DuckDuckGo] HTTP ${response.status} from ${endpoint}`);
        continue;
      }

      const html = await response.text();
      if (html.includes('anomaly-modal') || html.includes('captcha') || html.includes('blocked')) {
        console.warn(`[DuckDuckGo] Bot detection at ${endpoint}, trying next...`);
        continue;
      }

      const urls = extractUrls(html);
      if (urls.length > 0) {
        console.log(`[DuckDuckGo] Found ${urls.length} profile URLs via ${endpoint}.`);
        return urls;
      }
      console.log(`[DuckDuckGo] 0 results from ${endpoint}, trying next...`);
    } catch (e: any) {
      console.warn(`[DuckDuckGo] Error at ${endpoint}: ${e.message}`);
    }
  }

  console.log('[DuckDuckGo] All endpoints exhausted — 0 results.');
  return [];
}

// ---------------------------------------------------------------------------
// Main GET Handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawNiche = searchParams.get('niche');

  if (!rawNiche) {
    return NextResponse.json({ error: 'Niche query parameter is required' }, { status: 400 });
  }

  const niche = rawNiche.toLowerCase().trim();

  // Check cache first
  const cached = searchCache.get(niche);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[Cache] Returning cached results for "${niche}" (${cached.urls.length} URLs, source: ${cached.source})`);
    return NextResponse.json({
      query: SEARCH_QUERY_TEMPLATE(niche),
      count: cached.urls.length,
      urls: cached.urls,
      source: cached.source,
      isFallbackUsed: false,
    });
  }

  let foundUrls: string[] = [];
  let source = '';

  // Tier 1: Google Custom Search
  foundUrls = await searchGoogle(niche);
  if (foundUrls.length > 0) {
    source = 'google';
  }

  // Tier 2: Serper.dev (free-tier compatible query)
  if (foundUrls.length === 0) {
    foundUrls = await searchSerper(niche);
    if (foundUrls.length > 0) {
      source = 'serper';
    }
  }

  // Tier 3: DuckDuckGo (html + lite fallback)
  if (foundUrls.length === 0) {
    foundUrls = await searchDuckDuckGo(niche);
    if (foundUrls.length > 0) {
      source = 'duckduckgo';
    }
  }

  // All tiers exhausted
  if (foundUrls.length === 0) {
    console.log(`[Search] All tiers exhausted for "${niche}" — 0 results.`);
    return NextResponse.json({
      query: SEARCH_QUERY_TEMPLATE(niche),
      count: 0,
      urls: [],
      source: 'none',
      isFallbackUsed: false,
      message: `No creator profiles found for "${rawNiche}". All search providers returned 0 results. Try a different niche keyword.`,
    });
  }

  // Cache successful results
  searchCache.set(niche, { urls: foundUrls, source, timestamp: Date.now() });

  return NextResponse.json({
    query: SEARCH_QUERY_TEMPLATE(niche),
    count: foundUrls.length,
    urls: foundUrls,
    source,
    isFallbackUsed: false,
  });
}
