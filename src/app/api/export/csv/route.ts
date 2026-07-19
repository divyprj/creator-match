import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('influencers')
      .select('*')
      .order('followers_count', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const headers = [
      'Name', 'Handle', 'Email', 'Platform', 'Followers',
      'Engagement Rate', 'Niche', 'Location', 'Bio',
      'Content Themes', 'Profile Link', 'Outreach Status',
    ];

    const rows = (data || []).map((c) => {
      const contentThemes = (c.recent_posts || [])
        .map((p: any) => (p.text || '').substring(0, 80))
        .filter(Boolean)
        .join(' | ');

      return [
        c.name || '',
        c.handle || '',
        c.email || '',
        'Instagram',
        String(c.followers_count || 0),
        c.engagement_rate_str || (c.engagement_rate ? `${c.engagement_rate}%` : 'N/A'),
        c.niche || '',
        c.location || '',
        (c.bio || '').replace(/\n/g, ' '),
        contentThemes,
        `https://instagram.com/${c.handle}`,
        c.outreach_status || 'uncontacted',
      ].map(escapeCsvField);
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="indian_influencers.csv"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Export failed' }, { status: 500 });
  }
}
