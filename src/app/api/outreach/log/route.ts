import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUserId } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

/**
 * POST /api/outreach/log
 * Creates an outreach log entry using the service-role client.
 * Body: { influencer_id: number, type: 'email' | 'dm', content: string, subject?: string, status?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { influencer_id, type, content, subject, status } = body;

    if (!influencer_id || !type || !content) {
      return NextResponse.json(
        { error: 'influencer_id, type, and content are required' },
        { status: 400 }
      );
    }

    if (!['email', 'dm'].includes(type)) {
      return NextResponse.json({ error: 'type must be "email" or "dm"' }, { status: 400 });
    }

    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { error } = await supabaseAdmin.from('outreach_logs').insert({
      influencer_id,
      type,
      content,
      subject: subject || null,
      status: status || 'sent',
      user_id: userId,
    });

    if (error) {
      console.error('Error creating outreach log:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in outreach/log route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
