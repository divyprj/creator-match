import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

function extractEmail(text: string): string | null {
  if (!text) return null;
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0].toLowerCase() : null;
}

function parseEngagementRate(rateStr: string | null | undefined): number | null {
  if (!rateStr) return null;
  const clean = rateStr.replace(/[^\d.]/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? null : parsed;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { urls, niche } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'An array of URLs is required' }, { status: 400 });
    }

    if (!niche) {
      return NextResponse.json({ error: 'Niche is required' }, { status: 400 });
    }

    const results = {
      processed: 0,
      saved: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[],
    };

    for (const url of urls) {
      results.processed++;
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });

        if (!response.ok) {
          results.errors++;
          results.details.push({
            url,
            status: 'error',
            message: `Qoruz profile returned HTTP status: ${response.status}`,
          });
          continue;
        }

        const html = await response.text();
        const nextDataMatch = html.match(
          /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
        );

        if (!nextDataMatch) {
          results.errors++;
          results.details.push({
            url,
            status: 'error',
            message: 'Could not find hydration data (__NEXT_DATA__) on page',
          });
          continue;
        }

        const jsonData = JSON.parse(nextDataMatch[1]);
        const pageData = jsonData.props?.pageProps?.pageData;

        if (!pageData) {
          results.errors++;
          results.details.push({
            url,
            status: 'error',
            message: 'Could not extract pageData from hydration payload',
          });
          continue;
        }

        // Determine platform and extract metrics
        const isInstagram = !!pageData.instagram;
        const isYoutube = !!pageData.youtube;

        let handle = pageData.handle || '';
        let name = pageData.name || '';
        let bio = pageData.bio_combined || '';
        let followers = 0;
        let engRateStr = '';
        let recentPosts: any[] = [];

        if (isInstagram) {
          const ig = pageData.instagram;
          handle = ig.username || handle;
          bio = ig.bio || bio;
          followers = ig.followers_count || 0;
          engRateStr = ig.eng_rate || '';
          recentPosts = (ig.recent_posts || []).map((post: any) => ({
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
          recentPosts = (yt.recent_posts || []).map((post: any) => ({
            text: post.text || '',
            url: post.post_url || '',
            views: post.video_view_count || '',
          }));
        }

        // 1. Email Extraction (Check combined bio and platform-specific bios)
        let email = extractEmail(bio) || extractEmail(pageData.bio_combined) || extractEmail(name);

        if (!email) {
          results.skipped++;
          results.details.push({
            url,
            status: 'skipped',
            reason: 'No contact email found in profile bio',
          });
          continue;
        }

        // 2. Follower Count Filter (5,000 to 10,000,000 followers)
        if (followers < 5000 || followers > 10000000) {
          results.skipped++;
          results.details.push({
            url,
            status: 'skipped',
            reason: `Follower count (${followers}) is outside range (5,000 - 10,000,000)`,
            followers,
          });
          continue;
        }

        const engagementRate = parseEngagementRate(engRateStr);
        const location = pageData.location || '';
        const profileImage = pageData.profile_image_original || '';

        // Upsert to Supabase
        const { error: upsertError } = await supabase.from('influencers').upsert(
          {
            handle,
            name,
            email,
            followers_count: followers,
            engagement_rate: engagementRate,
            engagement_rate_str: engRateStr || null,
            location,
            niche,
            bio,
            profile_image: profileImage,
            recent_posts: recentPosts,
            outreach_status: 'uncontacted',
          },
          { onConflict: 'handle' }
        );

        if (upsertError) {
          results.errors++;
          results.details.push({
            url,
            status: 'error',
            message: `Database upsert failed: ${upsertError.message}`,
          });
          continue;
        }

        results.saved++;
        results.details.push({
          url,
          status: 'saved',
          handle,
          name,
          email,
          followers,
          engagement_rate: engRateStr,
        });

      } catch (err: any) {
        results.errors++;
        results.details.push({
          url,
          status: 'error',
          message: err.message || 'Error occurred while processing profile',
        });
      }
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Error enriching profiles:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
