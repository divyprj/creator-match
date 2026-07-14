function extractEmail(text) {
  if (!text) return null;
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0].toLowerCase() : null;
}

function parseEngagementRate(rateStr) {
  if (!rateStr) return null;
  const clean = rateStr.replace(/[^\d.]/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? null : parsed;
}

async function runTest() {
  const url = 'https://qoruz.com/akshaygupta_ak';
  console.log(`Fetching profile page: ${url}\n`);

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
    const nextDataMatch = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
    );

    if (!nextDataMatch) {
      console.error('Could not find __NEXT_DATA__ script in HTML!');
      return;
    }

    const jsonData = JSON.parse(nextDataMatch[1]);
    const pageData = jsonData.props?.pageProps?.pageData;

    if (!pageData) {
      console.error('pageData is missing inside hydration payload!');
      return;
    }

    const isInstagram = !!pageData.instagram;
    const isYoutube = !!pageData.youtube;

    let handle = pageData.handle || '';
    let name = pageData.name || '';
    let bio = pageData.bio_combined || '';
    let followers = 0;
    let engRateStr = '';
    let recentPosts = [];

    if (isInstagram) {
      const ig = pageData.instagram;
      handle = ig.username || handle;
      bio = ig.bio || bio;
      followers = ig.followers_count || 0;
      engRateStr = ig.eng_rate || '';
      recentPosts = (ig.recent_posts || []).map((post) => ({
        text: post.text || '',
        url: post.post_url || '',
        likes: post.like_count || '',
        comments: post.comment_count || '',
        views: post.video_view_count || '',
        type: post.post_type || '',
      }));
    } else if (isYoutube) {
      const yt = pageData.youtube;
      handle = yt.username || handle;
      bio = yt.bio || bio;
      followers = yt.subscribers_count || yt.followers_count || 0;
      engRateStr = yt.eng_rate || '';
      recentPosts = (yt.recent_posts || []).map((post) => ({
        text: post.text || '',
        url: post.post_url || '',
        views: post.video_view_count || '',
      }));
    }

    const email = extractEmail(bio) || extractEmail(pageData.bio_combined) || extractEmail(name);
    const engagementRate = parseEngagementRate(engRateStr);
    const location = pageData.location || '';
    const profileImage = pageData.profile_image_original || '';

    console.log('SUCCESS! Parsed profile data:');
    console.log({
      handle,
      name,
      email,
      followers_count: followers,
      engagement_rate: engagementRate,
      engagement_rate_str: engRateStr,
      location,
      profile_image: profileImage,
      recent_posts_count: recentPosts.length,
    });

    if (recentPosts.length > 0) {
      console.log('\nRecent Posts Details:');
      recentPosts.forEach((post, i) => {
        console.log(`\nPost ${i + 1}:`);
        console.log(`URL: ${post.url}`);
        console.log(`Type: ${post.type || 'N/A'}`);
        console.log(`Stats: Likes=${post.likes || '0'}, Comments=${post.comments || '0'}`);
        console.log(`Snippet: ${post.text.substring(0, 100)}...`);
      });
    }
  } catch (err) {
    console.error('Test failed with error:', err);
  }
}

runTest();
