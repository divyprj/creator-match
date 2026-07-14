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

function extractQoruzUrls(html) {
  const urls = [];
  const regex = /href="([^"]+)"/g;
  let match;

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
      // Ignore
    }
  }
  return urls;
}

async function runTest() {
  const niche = 'fashion';
  const query = `site:qoruz.com "${niche}" "gmail.com"`;
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  console.log(`Searching DuckDuckGo: ${url}\n`);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!res.ok) {
      console.error(`HTTP Error: ${res.status}`);
      return;
    }

    const html = await res.text();
    const urls = extractQoruzUrls(html);
    console.log(`SUCCESS! Found ${urls.length} Qoruz URLs:`);
    urls.forEach((url, i) => console.log(`${i + 1}. ${url}`));
  } catch (err) {
    console.error('Test failed with error:', err);
  }
}

runTest();
