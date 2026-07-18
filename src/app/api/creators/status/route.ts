import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUserId } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/creators/status
 * Updates a creator's outreach_status using the service-role client.
 * Body: { creatorId: number, status: string, onlyIf?: string }
 *   - onlyIf: optional — only update if current status matches this value
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { creatorId, status, onlyIf } = body;

    if (!creatorId || !status) {
      return NextResponse.json({ error: 'creatorId and status are required' }, { status: 400 });
    }

    const validStatuses = ['uncontacted', 'draft_created', 'emailed', 'dm_copied'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let query = supabaseAdmin
      .from('influencers')
      .update({ outreach_status: status })
      .eq('id', creatorId)
      .eq('user_id', userId);

    // Conditional update — only change status if current value matches
    if (onlyIf) {
      query = query.eq('outreach_status', onlyIf);
    }

    const { error } = await query;

    if (error) {
      console.error('Error updating creator status:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in creators/status route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
