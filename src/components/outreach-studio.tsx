"use client";

import { useState } from "react";
import { ArrowUpRight, Copy, EnvelopeSimple, Sparkle, SpinnerGap } from "@phosphor-icons/react";
import { NICHES, PLATFORMS, type Niche, type Platform } from "@/lib/types";

type Draft = { subject: string; email: string; dm: string; emailWords: number; dmWords: number; model: string };
const COLLABORATIONS = ["Sponsored post", "Affiliate campaign", "UGC creation", "Brand ambassador", "Paid promotion", "Barter collaboration"] as const;

export function OutreachStudio() {
  const [niche, setNiche] = useState<Niche>("Fashion");
  const [platform, setPlatform] = useState<Platform>("Instagram");
  const [creatorName, setCreatorName] = useState("");
  const [style, setStyle] = useState("");
  const [recentTheme, setRecentTheme] = useState("");
  const [collaborationType, setCollaborationType] = useState<(typeof COLLABORATIONS)[number]>("Sponsored post");
  const [brandName, setBrandName] = useState("");
  const [brandValue, setBrandValue] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [recipient, setRecipient] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<"generate" | "send" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function generate() {
    setBusy("generate"); setMessage(null);
    try {
      const response = await fetch("/api/ai/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creatorName, niche, platform, style, recentTheme, collaborationType, brandName, brandValue }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Draft generation failed.");
      setDraft(body);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Draft generation failed."); }
    finally { setBusy(null); }
  }

  async function send() {
    if (!draft || !window.confirm(`Send this email to ${recipient}? This action cannot be undone.`)) return;
    setBusy("send"); setMessage(null);
    try {
      const response = await fetch("/api/outreach/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), recipient, subject: draft.subject, body: draft.email, confirmed: true }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Send failed.");
      setMessage("Email sent and recorded once.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Send failed."); }
    finally { setBusy(null); }
  }

  return (
    <section className="panel p-5 md:p-7">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div><p className="eyebrow">Outreach studio</p><h2 className="mt-4 text-3xl font-medium tracking-[-.04em] md:text-5xl">Human-reviewed by design.</h2></div>
        <p className="max-w-md text-sm leading-6 text-white/45">Gemini writes from the creator&apos;s public signals and addresses them by name. Add the recipient after generation, review the copy, then confirm once.</p>
      </div>
      <div className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <label className="form-label">Creator name<input className="form-input" value={creatorName} onChange={e => setCreatorName(e.target.value)} placeholder="Used to address them by name" /></label>
        <label className="form-label">Niche<select className="form-input" value={niche} onChange={e => setNiche(e.target.value as Niche)}>{NICHES.map(x => <option key={x}>{x}</option>)}</select></label>
        <label className="form-label">Platform<select className="form-input" value={platform} onChange={e => setPlatform(e.target.value as Platform)}>{PLATFORMS.map(x => <option key={x}>{x}</option>)}</select></label>
        <label className="form-label">Creator style<input className="form-input" value={style} onChange={e => setStyle(e.target.value)} placeholder="Practical, data-led explainers" /></label>
        <label className="form-label">Recent public theme<input className="form-input" value={recentTheme} onChange={e => setRecentTheme(e.target.value)} placeholder="Budgeting for first-job professionals" /></label>
        <label className="form-label">Collaboration<select className="form-input" value={collaborationType} onChange={e => setCollaborationType(e.target.value as (typeof COLLABORATIONS)[number])}>{COLLABORATIONS.map(x => <option key={x}>{x}</option>)}</select></label>
        <label className="form-label">Brand name<input className="form-input" value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Used only in your reviewed draft" /></label>
        <label className="form-label md:col-span-2">Creator value<input className="form-input" value={brandValue} onChange={e => setBrandValue(e.target.value)} placeholder="Why this collaboration is genuinely relevant" /></label>
      </div>
      <button className="primary-button mt-6" disabled={busy !== null || !style || !recentTheme || !brandName || !brandValue || !creatorName} onClick={generate}>{busy === "generate" ? <SpinnerGap className="animate-spin" size={18} /> : <Sparkle size={18} />} Generate constrained drafts</button>
      {message && <p className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">{message}</p>}
      {draft && <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl bg-white/[.045] p-5"><div className="flex items-center justify-between"><h3 className="font-semibold">Email · {draft.emailWords} words</h3><button className="quiet-button" onClick={() => navigator.clipboard.writeText(`${draft.subject}\n\n${draft.email}`)}><Copy size={16} /> Copy</button></div><p className="mt-5 text-sm font-semibold text-white/75">{draft.subject}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/55">{draft.email}</p><div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]"><input className="form-input" type="email" value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="Creator email after review" /><button className="primary-button" disabled={busy !== null || !recipient} onClick={send}>{busy === "send" ? <SpinnerGap className="animate-spin" size={18} /> : <EnvelopeSimple size={18} />} Send email</button></div></article>
        <article className="rounded-2xl bg-white/[.045] p-5"><div className="flex items-center justify-between"><h3 className="font-semibold">Instagram DM · {draft.dmWords} words</h3><button className="quiet-button" onClick={() => navigator.clipboard.writeText(draft.dm)}><Copy size={16} /> Copy DM</button></div><p className="mt-5 text-sm leading-7 text-white/55">{draft.dm}</p><p className="mt-8 text-xs leading-5 text-white/35">Instagram option: copy the reviewed draft and open the public profile. Automated cold DMs are intentionally not attempted.</p><div className="mt-4 flex gap-3"><input className="form-input" value={profileUrl} onChange={e => setProfileUrl(e.target.value)} placeholder="https://instagram.com/handle" />{profileUrl && <a href={profileUrl} target="_blank" rel="noreferrer" className="quiet-button"><ArrowUpRight size={17} /> Open</a>}</div></article>
      </div>}
    </section>
  );
}
