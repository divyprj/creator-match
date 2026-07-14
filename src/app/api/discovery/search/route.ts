import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function extractQoruzUrls(html: string): string[] {
  const urls: string[] = [];
  // Match any href that starts with or contains qoruz.com
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
      let qoruzUrl = '';

      if (decodedUrl.includes('qoruz.com')) {
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
    } catch (e) {
      // Ignore invalid URLs
    }
  }
  return urls;
}

const FALLBACK_PROFILES: Record<string, string[]> = {
  fashion: [
    'https://qoruz.com/aarohirawat2270',
    'https://qoruz.com/meetposer',
    'https://qoruz.com/akshaygupta_ak',
    'https://qoruz.com/renu_chandra',
    'https://qoruz.com/ShopDandy',
  ],
  beauty: [
    'https://qoruz.com/kritikakhurana',
    'https://qoruz.com/malvikasitlaniofficial',
    'https://qoruz.com/aashnashroff',
    'https://qoruz.com/aarohirawat2270',
  ],
  tech: [
    'https://qoruz.com/i_ansh_rathi',
    'https://qoruz.com/technicalguruji',
    'https://qoruz.com/shlokasrivastava',
  ],
  travel: [
    'https://qoruz.com/bruisedpassports',
    'https://qoruz.com/shenaztreasury',
    'https://qoruz.com/larissa_wlc',
  ],
  food: [
    'https://qoruz.com/ranveer.brar',
    'https://qoruz.com/kabitaskitchen',
    'https://qoruz.com/shivesh_b',
  ],
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const niche = searchParams.get('niche');

  if (!niche) {
    return NextResponse.json({ error: 'Niche query parameter is required' }, { status: 400 });
  }

  // Construct the search query
  // DuckDuckGo search query for qoruz profiles with the niche and gmail.com
  const query = `site:qoruz.com "${niche}" "gmail.com"`;
  
  let qoruzUrls: string[] = [];
  let isFallbackUsed = false;

  try {
    console.log(`Searching DuckDuckGo Lite for query: ${query}`);
    const response = await fetch('https://lite.duckduckgo.com/lite/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: `q=${encodeURIComponent(query)}`,
    });

    if (response.ok) {
      const html = await response.text();
      // If we hit a bot captcha challenge page, it might return 202 or contain anomaly-modal text
      if (html.includes('anomaly-modal') || html.includes('captcha')) {
        console.warn('DuckDuckGo Lite returned a bot captcha challenge page. Using curated fallback profiles.');
      } else {
        qoruzUrls = extractQoruzUrls(html);
        console.log(`DuckDuckGo Lite search completed successfully. Found ${qoruzUrls.length} profile URLs.`);
      }
    } else {
      console.warn(`DuckDuckGo Lite returned HTTP error: ${response.status}. Using curated fallback profiles.`);
    }
  } catch (error) {
    console.error('Error fetching search results from DuckDuckGo Lite:', error);
  }

  // If search was blocked, empty, or failed, use pre-seeded fallback profiles
  if (qoruzUrls.length === 0) {
    isFallbackUsed = true;
    const nicheKey = niche.toLowerCase().trim();
    qoruzUrls = FALLBACK_PROFILES[nicheKey] || FALLBACK_PROFILES['fashion'];
    console.log(`Using fallback profiles for niche "${nicheKey}":`, qoruzUrls);
  }

  return NextResponse.json({
    query,
    count: qoruzUrls.length,
    urls: qoruzUrls,
    isFallbackUsed,
  });
}
