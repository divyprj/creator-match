import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Returns the configuration status of server-side credentials.
 * Does NOT return actual values — only boolean presence checks.
 */
export async function GET() {
  const geminiKey = process.env.GEMINI_API_KEY;
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  return NextResponse.json({
    gemini: !!(geminiKey && geminiKey !== '' && !geminiKey.includes('your-gemini')),
    smtp: !!(smtpHost && smtpUser && smtpPass && smtpHost !== '' && !smtpHost.includes('your-email')),
    smtp_user_display: smtpUser ? smtpUser.replace(/(.{3}).*(@.*)/, '$1***$2') : null,
  });
}
