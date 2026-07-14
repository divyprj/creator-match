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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const niche = searchParams.get('niche');

  if (!niche) {
    return NextResponse.json({ error: 'Niche query parameter is required' }, { status: 400 });
  }

  // Construct the search query
  // DuckDuckGo search query for qoruz profiles with the niche and gmail.com
  const query = `site:qoruz.com "${niche}" "gmail.com"`;
  const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(ddgUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `DuckDuckGo returned HTTP error: ${response.status}` },
        { status: response.status }
      );
    }

    const html = await response.text();
    const qoruzUrls = extractQoruzUrls(html);

    return NextResponse.json({
      query,
      count: qoruzUrls.length,
      urls: qoruzUrls,
    });
  } catch (error: any) {
    console.error('Error fetching search results:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
