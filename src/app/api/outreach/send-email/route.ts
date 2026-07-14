import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { creatorId, subject, body: emailBody, settings } = body;

    if (!creatorId) {
      return NextResponse.json({ error: 'Creator ID is required' }, { status: 400 });
    }

    if (!subject || !emailBody) {
      return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 });
    }

    // 1. Fetch creator details to get their email address
    const { data: creator, error: creatorError } = await supabase
      .from('influencers')
      .select('*')
      .eq('id', creatorId)
      .single();

    if (creatorError || !creator) {
      return NextResponse.json(
        { error: `Creator not found: ${creatorError?.message || 'Unknown'}` },
        { status: 404 }
      );
    }

    if (!creator.email) {
      return NextResponse.json(
        { error: 'Creator does not have a contact email address' },
        { status: 400 }
      );
    }

    // 2. Resolve SMTP credentials (request body or environment variables)
    const host = settings?.smtp_host || process.env.SMTP_HOST;
    const port = settings?.smtp_port || (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 465);
    const user = settings?.smtp_user || process.env.SMTP_USER;
    const pass = settings?.smtp_pass || process.env.SMTP_PASS;

    if (!host || !user || !pass || host.includes('your-email') || host === '') {
      return NextResponse.json(
        { error: 'SMTP settings are not configured. Please add them in App Settings or set environment variables.' },
        { status: 400 }
      );
    }

    // 3. Setup Nodemailer transporter
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // Port 465 is secure by default
      auth: {
        user,
        pass,
      },
    });

    // 4. Send email
    await transporter.sendMail({
      from: `"Creator Match" <${user}>`,
      to: creator.email,
      subject: subject,
      text: emailBody,
    });

    // 5. Create outreach log in database
    const { error: logError } = await supabase.from('outreach_logs').insert({
      influencer_id: creatorId,
      type: 'email',
      subject,
      content: emailBody,
      status: 'sent',
    });

    if (logError) {
      console.error('Error saving email log to database:', logError);
    }

    // 6. Update influencer outreach status
    const { error: statusError } = await supabase
      .from('influencers')
      .update({ outreach_status: 'emailed' })
      .eq('id', creatorId);

    if (statusError) {
      console.error('Error updating influencer outreach status:', statusError);
    }

    return NextResponse.json({ success: true, message: 'Email sent successfully' });

  } catch (error: any) {
    console.error('Error in send-email route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
