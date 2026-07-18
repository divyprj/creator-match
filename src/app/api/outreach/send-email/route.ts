import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUserId } from '@/lib/supabaseServer';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { creatorId, subject, body: emailBody } = body;

    if (!creatorId) {
      return NextResponse.json({ error: 'Creator ID is required' }, { status: 400 });
    }

    if (!subject || !emailBody) {
      return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 });
    }

    // Get authenticated user
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // 1. Fetch creator details to get their email address
    const { data: creator, error: creatorError } = await supabaseAdmin
      .from('influencers')
      .select('*')
      .eq('id', creatorId)
      .eq('user_id', userId)
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

    // 2. Resolve SMTP credentials (server-side environment variables only)
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 465;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass || host === '') {
      return NextResponse.json(
        { error: 'SMTP settings are not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in your .env.local file.' },
        { status: 400 }
      );
    }

    // 3. Send email (Resend API or Nodemailer SMTP)
    if (pass.startsWith('re_')) {
      const fromAddress = (user === 'resend' || !user.includes('@')) ? 'onboarding@resend.dev' : user;
      
      let res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pass}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `Creator Match <${fromAddress}>`,
          to: creator.email,
          subject: subject,
          text: emailBody
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.message || '';
        
        // If Resend limits sandbox emails to the verified owner, retry sending to the owner's email
        if (
          errorMessage.toLowerCase().includes('onboarding') || 
          errorMessage.toLowerCase().includes('restrict') || 
          res.status === 403
        ) {
          // Use SMTP_USER as the owner email for sandbox redirect
          const ownerEmail = user.includes('@') ? user : '';
          if (!ownerEmail) {
            throw new Error('Resend sandbox restriction: set SMTP_USER to your verified email in .env.local');
          }
            
          console.log(`Onboarding restriction detected. Redirecting sandbox email from ${creator.email} to owner ${ownerEmail}`);
          
          res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${pass}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: `Creator Match <${fromAddress}>`,
              to: ownerEmail,
              subject: `[Sandbox Redirect] ${subject}`,
              text: `Note: This email was redirected to your verified email address since you are using Resend in Sandbox/Onboarding mode.\n\nOriginal Recipient: ${creator.email} (${creator.name})\n\n---\n\n${emailBody}`
            })
          });
          
          if (!res.ok) {
            const errorDataRetry = await res.json().catch(() => ({}));
            throw new Error(errorDataRetry.message || `Resend API returned status ${res.status} on retry`);
          }
        } else {
          throw new Error(errorMessage || `Resend API returned status ${res.status}`);
        }
      }
    } else {
      // Setup Nodemailer transporter
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // Port 465 is secure by default
        auth: {
          user,
          pass,
        },
      });

      // Send email
      await transporter.sendMail({
        from: `"Creator Match" <${user}>`,
        to: creator.email,
        subject: subject,
        text: emailBody,
      });
    }

    // 5. Create outreach log in database (service-role client bypasses RLS)
    const { error: logError } = await supabaseAdmin.from('outreach_logs').insert({
      influencer_id: creatorId,
      type: 'email',
      subject,
      content: emailBody,
      status: 'sent',
    });

    if (logError) {
      console.error('Error saving email log to database:', logError);
    }

    // 6. Update influencer outreach status (service-role client bypasses RLS)
    const { error: statusError } = await supabaseAdmin
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
