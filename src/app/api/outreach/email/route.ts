import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@/lib/supabase/server";
import { emailSendSchema, countWords } from "@/lib/validation";
import { serverConfig } from "@/lib/config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user || !supabase) return NextResponse.json({ error: "Sign in before sending email." }, { status: 401 });

  const input = emailSendSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: input.error.issues[0]?.message }, { status: 400 });
  const words = countWords(input.data.body);
  if (words < 60 || words > 90) {
    return NextResponse.json({ error: `Email must contain 60–90 words; received ${words}.` }, { status: 400 });
  }
  if (!serverConfig.gmailUser || !serverConfig.gmailAppPassword) {
    return NextResponse.json({ error: "Gmail SMTP is ready but its App Password is not configured." }, { status: 503 });
  }

  const existing = await supabase
    .from("outreach_events")
    .select("id,status")
    .eq("user_id", user.id)
    .eq("idempotency_key", input.data.idempotencyKey)
    .maybeSingle();
  if (existing.data) {
    return NextResponse.json({ error: "This message was already submitted.", status: existing.data.status }, { status: 409 });
  }

  const event = await supabase
    .from("outreach_events")
    .insert({
      user_id: user.id,
      idempotency_key: input.data.idempotencyKey,
      channel: "email",
      recipient: input.data.recipient,
      subject: input.data.subject,
      body: input.data.body,
      status: "sending",
    })
    .select("id")
    .single();
  if (event.error) return NextResponse.json({ error: "Could not reserve this send safely." }, { status: 409 });

  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: serverConfig.gmailUser, pass: serverConfig.gmailAppPassword },
  });
  try {
    const sent = await transport.sendMail({
      from: `Creator Match <${serverConfig.gmailUser}>`,
      to: input.data.recipient,
      subject: input.data.subject,
      text: input.data.body,
    });
    await supabase.from("outreach_events").update({ status: "sent", provider_message_id: sent.messageId }).eq("id", event.data.id);
    return NextResponse.json({ ok: true, messageId: sent.messageId });
  } catch (error) {
    await supabase.from("outreach_events").update({ status: "failed" }).eq("id", event.data.id);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gmail send failed." },
      { status: 502 },
    );
  }
}
