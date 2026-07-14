const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  try {
    const envPath = path.join(__dirname, '../../.env.local');
    if (!fs.existsSync(envPath)) return null;
    const content = fs.readFileSync(envPath, 'utf8');
    const urlMatch = content.match(/NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.+)/);
    const keyMatch = content.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=\s*(.+)/);
    return {
      url: urlMatch ? urlMatch[1].trim() : null,
      key: keyMatch ? keyMatch[1].trim() : null,
    };
  } catch (e) {
    return null;
  }
}

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
  const env = loadEnv();
  if (!env || !env.url || !env.key) {
    console.error('Environment variables not configured properly in .env.local.');
    return;
  }

  const supabase = createClient(env.url, env.key);
  console.log('Connecting to Supabase...');

  // Target a profile that we know exists and has an email (like akshaygupta_ak)
  const profileUrl = 'https://qoruz.com/akshaygupta_ak';
  console.log(`\nTesting End-to-End Scrape & Save for profile: ${profileUrl}`);

  try {
    const res = await fetch(profileUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!res.ok) {
      console.error(`✘ HTTP Error fetching profile: ${res.status}`);
      return;
    }

    const html = await res.text();
    const nextDataMatch = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
    );

    if (!nextDataMatch) {
      console.error('✘ Could not find __NEXT_DATA__ script in HTML!');
      return;
    }

    const jsonData = JSON.parse(nextDataMatch[1]);
    const pageData = jsonData.props?.pageProps?.pageData;

    if (!pageData) {
      console.error('✘ pageData is missing in hydration payload!');
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
    }

    const email = extractEmail(bio) || extractEmail(pageData.bio_combined) || extractEmail(name);
    const engagementRate = parseEngagementRate(engRateStr);
    const location = pageData.location || '';
    const profileImage = pageData.profile_image_original || '';

    if (!email) {
      console.log('✘ Skipped: Profile does not have a contact email in bio.');
      return;
    }

    console.log(`\n✔ Scraped Data Successfully:`);
    console.log(`  - Handle: @${handle}`);
    console.log(`  - Name: ${name}`);
    console.log(`  - Email: ${email}`);
    console.log(`  - Followers: ${followers}`);
    console.log(`  - Engagement: ${engRateStr} (${engagementRate}%)`);
    console.log(`  - Location: ${location}`);

    console.log('\nUpserting creator to Supabase...');
    const { data, error } = await supabase.from('influencers').upsert(
      {
        handle,
        name,
        email,
        followers_count: followers,
        engagement_rate: engagementRate,
        engagement_rate_str: engRateStr || null,
        location,
        niche: 'Fashion',
        bio,
        profile_image: profileImage,
        recent_posts: recentPosts,
        outreach_status: 'uncontacted',
      },
      { onConflict: 'handle' }
    ).select();

    if (error) {
      console.error('✘ Supabase Upsert Failed:', error.message || error);
    } else {
      console.log('✔ Creator successfully saved/updated in Supabase database!');
      console.log('Upserted Row details:', data[0]);
    }

  } catch (err) {
    console.error('Test crashed with error:', err.message || err);
  }
}

runTest();
