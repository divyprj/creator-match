"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle,
  DownloadSimple,
  InstagramLogo,
  MagnifyingGlass,
  ShieldCheck,
  SortAscending,
  SpinnerGap,
  WarningCircle,
  YoutubeLogo,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { creatorsToDownload } from "@/lib/csv";
import { NICHES, PLATFORMS, type CreatorResult, type Niche, type Platform, type SearchResponse, type SortKey } from "@/lib/types";

const SORT_LABELS: Record<SortKey, string> = {
  engagement: "Engagement rate",
  followers: "Followers",
  relevance: "Evidence strength",
};

function compact(value: number | null) {
  if (value == null) return "Unverified";
  return Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function CreatorSearch({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [niche, setNiche] = useState<Niche>("Fashion");
  const [platforms, setPlatforms] = useState<Platform[]>(["Instagram", "YouTube"]);
  const [minFollowers, setMinFollowers] = useState(5_000);
  const [maxFollowers, setMaxFollowers] = useState(100_000);
  const [results, setResults] = useState<CreatorResult[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortKey>("engagement");

  const strictCount = useMemo(() => results.filter((result) => result.strictEligible).length, [results]);

  // Unverified metrics sort last rather than counting as zero, so a creator whose engagement could
  // not be measured is never presented as worse than one measured at a genuinely low rate.
  const sorted = useMemo(() => {
    const copy = [...results];
    if (sort === "relevance") return copy;
    const field = sort === "engagement" ? "engagementRate" : "followers";
    return copy.sort((first, second) => {
      const a = first[field];
      const b = second[field];
      if (a == null && b == null) return 0;
      if (a == null) return 1;
      if (b == null) return -1;
      return b - a;
    });
  }, [results, sort]);

  function togglePlatform(platform: Platform) {
    setPlatforms((current) =>
      current.includes(platform)
        ? current.length === 1
          ? current
          : current.filter((item) => item !== platform)
        : [...current, platform],
    );
  }

  async function search() {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/search/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, platforms, minFollowers, maxFollowers, limit: isAuthenticated ? 50 : 8 }),
      });
      const body = (await response.json()) as SearchResponse & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Live search failed.");
      setResults(body.results);
      setNotice(body.notice);
    } catch (caught) {
      setResults([]);
      setError(caught instanceof Error ? caught.message : "Live search failed.");
    } finally {
      setLoading(false);
    }
  }

  async function saveCreator(creator: CreatorResult) {
    if (!isAuthenticated) return;
    try {
      const supabase = createClient();
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Your session expired.");
      const { error: saveError } = await supabase.from("saved_creators").upsert(
        {
          user_id: user.id,
          source_key: `${creator.platform}:${creator.handle.toLowerCase()}`,
          name: creator.name,
          handle: creator.handle,
          platform: creator.platform.toLowerCase(),
          profile_url: creator.profileUrl,
          followers: creator.followers,
          engagement_rate: creator.engagementRate,
          engagement_formula: creator.engagementFormula,
          engagement_sample_size: creator.engagementSampleSize,
          niche: creator.niche.toLowerCase(),
          content_themes: creator.contentThemes,
          contact_email: creator.email,
          city: creator.city,
          country: creator.country,
          strict_eligible: creator.strictEligible,
          evidence: creator.evidence,
        },
        { onConflict: "user_id,source_key" },
      );
      if (saveError) throw saveError;
      setSaved((current) => new Set(current).add(creator.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save creator.");
    }
  }

  function download() {
    const blob = new Blob([creatorsToDownload(sorted)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `creator-match-${niche.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section id="search" className="px-5 py-32 md:px-10 md:py-48">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-16 flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="eyebrow">Live discovery workspace</p>
            <h2 className="mt-5 max-w-4xl text-4xl font-medium leading-[0.98] tracking-[-0.055em] text-white md:text-7xl">
              Search the public web. Keep only what the evidence supports.
            </h2>
          </div>
          <p className="max-w-md text-base leading-7 text-white/55">
            Tavily discovers candidates. Official platform data and cited public sources decide whether a profile qualifies. {isAuthenticated ? "Signed-in searches can build a live shortlist of up to 50." : "Public previews return up to 8 and are never saved."}
          </p>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-[#0f1218]/90 p-4 shadow-2xl shadow-black/30 md:p-7">
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_2fr_auto] lg:items-end">
            <label className="field-shell">
              <span>Niche</span>
              <select value={niche} onChange={(event) => setNiche(event.target.value as Niche)}>
                {NICHES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <div className="field-shell">
              <span>Platforms</span>
              <div className="flex gap-2 pt-2">
                {PLATFORMS.map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => togglePlatform(platform)}
                    className={`platform-toggle ${platforms.includes(platform) ? "platform-toggle-active" : ""}`}
                    aria-pressed={platforms.includes(platform)}
                  >
                    {platform === "Instagram" ? <InstagramLogo size={17} /> : <YoutubeLogo size={17} />}
                    {platform}
                  </button>
                ))}
              </div>
            </div>
            <div className="field-shell">
              <span>Follower range</span>
              <div className="mt-2 flex items-center justify-between text-sm text-white">
                <strong>{compact(minFollowers)}</strong>
                <span className="text-white/35">{minFollowers < 5_000 ? "Nano included" : "Micro default"}</span>
                <strong>{compact(maxFollowers)}</strong>
              </div>
              <div className="range-pair">
                <input
                  aria-label="Minimum followers"
                  type="range"
                  min="1000"
                  max="100000"
                  step="1000"
                  value={minFollowers}
                  onChange={(event) => setMinFollowers(Math.min(Number(event.target.value), maxFollowers))}
                />
                <input
                  aria-label="Maximum followers"
                  type="range"
                  min="1000"
                  max="100000"
                  step="1000"
                  value={maxFollowers}
                  onChange={(event) => setMaxFollowers(Math.max(Number(event.target.value), minFollowers))}
                />
              </div>
              <div className="mt-2 flex justify-between text-[11px] uppercase tracking-[0.16em] text-white/30">
                <span>1K nano</span><span>5K micro</span><span>100K cap</span>
              </div>
            </div>
            <button type="button" onClick={search} disabled={loading} className="primary-button h-[62px] min-w-40">
              {loading ? <SpinnerGap className="animate-spin" size={20} /> : <MagnifyingGlass size={20} />}
              {loading ? "Searching" : "Search live"}
            </button>
          </div>
        </div>

        {(error || notice) && (
          <div className={`mt-5 flex items-start gap-3 rounded-2xl border p-4 text-sm ${error ? "border-[#ff6b5e]/30 bg-[#ff6b5e]/10 text-[#ffb3ad]" : "border-white/10 bg-white/5 text-white/65"}`}>
            {error ? <WarningCircle size={20} /> : <ShieldCheck size={20} />}
            <span>{error ?? notice}</span>
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-10">
            <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <p className="text-sm text-white/50">{results.length} live candidates · {strictCount} strict matches</p>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-white/45">
                  <SortAscending size={18} />
                  <span className="hidden sm:inline">Sort by</span>
                  <select
                    aria-label="Sort creators by"
                    value={sort}
                    onChange={(event) => setSort(event.target.value as SortKey)}
                    className="rounded-lg border border-white/10 bg-[#11151c] px-3 py-2 text-sm text-white/80"
                  >
                    {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                      <option key={key} value={key}>{SORT_LABELS[key]}</option>
                    ))}
                  </select>
                </label>
                {isAuthenticated ? (
                  <button type="button" onClick={download} className="quiet-button">
                    <DownloadSimple size={18} /> Export CSV
                  </button>
                ) : (
                  <Link href="/auth" className="quiet-button"><DownloadSimple size={18} /> Sign in to export</Link>
                )}
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {sorted.map((creator) => (
                <article key={creator.id} className="group overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#11151c] p-5 transition-colors hover:border-white/25">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-white/40">
                        {creator.platform === "Instagram" ? <InstagramLogo size={16} /> : <YoutubeLogo size={16} />}
                        {creator.platform}
                      </div>
                      <h3 className="truncate text-xl font-medium tracking-tight text-white">{creator.name}</h3>
                      <p className="mt-1 truncate text-sm text-white/40">@{creator.handle}</p>
                    </div>
                    <span className={`status-chip ${creator.strictEligible ? "status-good" : "status-pending"}`}>
                      {creator.strictEligible ? <CheckCircle size={14} /> : <WarningCircle size={14} />}
                      {creator.strictEligible ? "Strict match" : "Needs evidence"}
                    </span>
                  </div>
                  <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-white/10">
                    <Metric label="Followers" value={compact(creator.followers)} />
                    <Metric label="Engagement" value={creator.engagementRate == null ? "Unverified" : `${creator.engagementRate}%`} />
                    <Metric label="Email" value={creator.email ? "Found" : "Missing"} />
                  </div>
                  {creator.exclusionReasons.length > 0 && (
                    <p className="mt-4 text-sm leading-6 text-white/45">{creator.exclusionReasons.slice(0, 2).join(". ")}.</p>
                  )}
                  {creator.notes.length > 0 && (
                    <p className="mt-2 text-xs leading-5 text-white/30">{creator.notes[0]}.</p>
                  )}
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <a className="quiet-button" href={creator.profileUrl} target="_blank" rel="noreferrer">
                      View evidence <ArrowUpRight size={17} />
                    </a>
                    {isAuthenticated ? (
                      <button type="button" className="quiet-button" disabled={saved.has(creator.id)} onClick={() => saveCreator(creator)}>
                        {saved.has(creator.id) ? "Saved" : "Save creator"}
                      </button>
                    ) : (
                      <Link className="quiet-button" href="/auth">Sign in to save</Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="bg-[#171b23] px-3 py-4"><span className="block text-[10px] uppercase tracking-[0.15em] text-white/30">{label}</span><strong className="mt-2 block truncate text-sm font-medium text-white/80">{value}</strong></div>;
}
