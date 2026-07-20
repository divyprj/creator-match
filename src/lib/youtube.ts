import { createHash } from "node:crypto";
import type { CreatorResult, Niche } from "@/lib/types";
import { youtubeEngagementRate } from "@/lib/engagement";
import { creatorEligibility, usableEmail, NICHE_TERMS } from "@/lib/tavily";

const INDIA_TEXT = /\b(india|indian|mumbai|delhi|bengaluru|bangalore|chennai|hyderabad|pune|kolkata)\b/i;

type ChannelResponse = {
  items?: Array<{
    id: string;
    snippet: { title: string; description: string; country?: string };
    statistics: { subscriberCount?: string; hiddenSubscriberCount?: boolean };
    contentDetails: { relatedPlaylists?: { uploads?: string } };
  }>;
};

async function youtubeGet<T>(path: string, params: Record<string, string>, apiKey: string) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  Object.entries({ ...params, key: apiKey }).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`YouTube ${path} failed with ${response.status}.`);
  return (await response.json()) as T;
}

/**
 * Query bank for native channel discovery. Deliberately plain-language and creator-sized: phrases
 * like "small creator" and "daily vlog" surface the long tail, whereas brand-style keywords return
 * the same large channels every time. Each variant costs 100 quota units, so callers request only
 * as many as the result limit justifies.
 */
export function youtubeDiscoveryQueries(niche: Niche, count: number) {
  const terms = NICHE_TERMS[niche];
  const lower = niche.toLowerCase();
  return [
    `${lower} India small creator`,
    `indian ${lower} vlog channel`,
    `${terms.subNiches[0]} india`,
    `${terms.subNiches[1]} indian channel`,
    `${terms.subNiches[2]} india hindi`,
    `indian ${lower} creator hindi`,
    `${lower} tips india`,
    `desi ${lower} channel`,
    `${lower} india daily vlog`,
    `indian ${lower} shorts creator`,
  ].slice(0, Math.max(1, count));
}

/**
 * Direct channel discovery through YouTube's own search, rather than only enriching what a web
 * search happened to surface. This is the only source in the system that returns verified
 * subscriber counts at discovery time, so it is the one path that can reliably fill the
 * 5,000-100,000 micro band. `search.list` costs 100 quota units per call, so variants are few and
 * deliberate; `channels.list` batches 50 ids per unit and does the heavy lifting.
 */
export async function discoverYouTubeChannels(args: {
  apiKey: string;
  niche: Niche;
  queries: string[];
}) {
  const batches = await Promise.allSettled(
    args.queries.map((query) =>
      youtubeGet<{ items?: Array<{ id?: { channelId?: string } }> }>(
        "search",
        {
          part: "snippet",
          type: "channel",
          q: query,
          regionCode: "IN",
          relevanceLanguage: "en",
          maxResults: "50",
        },
        args.apiKey,
      ),
    ),
  );

  const ids = new Set<string>();
  for (const batch of batches) {
    if (batch.status !== "fulfilled") continue;
    for (const item of batch.value.items ?? []) {
      if (item.id?.channelId) ids.add(item.id.channelId);
    }
  }
  return [...ids];
}

/** Resolves discovered channel ids to creators in batches of 50, without engagement sampling. */
export async function describeYouTubeChannels(args: {
  apiKey: string;
  channelIds: string[];
  niche: Niche;
}): Promise<CreatorResult[]> {
  const creators: CreatorResult[] = [];

  for (let index = 0; index < args.channelIds.length; index += 50) {
    const slice = args.channelIds.slice(index, index + 50);
    let response: ChannelResponse;
    try {
      response = await youtubeGet<ChannelResponse>(
        "channels",
        { part: "snippet,statistics,contentDetails", id: slice.join(",") },
        args.apiKey,
      );
    } catch {
      continue;
    }

    for (const item of response.items ?? []) {
      const followers = item.statistics.hiddenSubscriberCount
        ? null
        : Number(item.statistics.subscriberCount ?? 0) || null;
      const email = usableEmail(
        item.snippet.description.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0],
      );
      const inIndia = item.snippet.country === "IN" || INDIA_TEXT.test(item.snippet.description);
      const { exclusionReasons, notes, strictEligible } = creatorEligibility({
        email,
        isIndia: inIndia,
        followers,
        platform: "YouTube",
        engagementRate: null,
      });

      creators.push({
        id: createHash("sha256").update(`YouTube:${item.id.toLowerCase()}`).digest("hex").slice(0, 20),
        name: item.snippet.title,
        handle: item.id,
        platform: "YouTube",
        profileUrl: `https://www.youtube.com/channel/${item.id}`,
        followers,
        engagementRate: null,
        engagementFormula: null,
        engagementSampleSize: 0,
        niche: args.niche,
        contentThemes: [args.niche],
        email,
        city: null,
        country: inIndia ? "India" : "Unverified",
        strictEligible,
        exclusionReasons,
        notes,
        evidence: [
          {
            url: `https://www.youtube.com/channel/${item.id}`,
            excerpt: `Official YouTube channel metadata; country=${item.snippet.country ?? "unset"}; subscribers=${followers ?? "hidden"}.`,
            capturedAt: new Date().toISOString(),
            confidence: "high" as const,
          },
        ],
      });
    }
  }

  return creators;
}

export async function enrichYouTubeCreator(creator: CreatorResult, apiKey: string) {
  if (creator.platform !== "YouTube") return creator;
  const lookup: Record<string, string> = creator.handle.startsWith("UC")
    ? { id: creator.handle }
    : { forHandle: creator.handle };
  const channel = await youtubeGet<ChannelResponse>(
    "channels",
    { part: "snippet,statistics,contentDetails", ...lookup },
    apiKey,
  );
  const item = channel.items?.[0];
  if (!item) return creator;

  const playlistId = item.contentDetails.relatedPlaylists?.uploads;
  let sample: Array<{ viewCount?: string; likeCount?: string; commentCount?: string }> = [];
  if (playlistId) {
    const playlist = await youtubeGet<{ items?: Array<{ contentDetails: { videoId: string } }> }>(
      "playlistItems",
      { part: "contentDetails", playlistId, maxResults: "10" },
      apiKey,
    );
    const ids = playlist.items?.map((entry) => entry.contentDetails.videoId).filter(Boolean) ?? [];
    if (ids.length) {
      const videos = await youtubeGet<{
        items?: Array<{ statistics: { viewCount?: string; likeCount?: string; commentCount?: string } }>;
      }>("videos", { part: "statistics", id: ids.join(",") }, apiKey);
      sample = videos.items?.map((video) => video.statistics) ?? [];
    }
  }

  const engagement = youtubeEngagementRate(sample);
  // Channel descriptions frequently list a newsroom or support address rather than the creator's
  // own contact, so the same generic-address filter used on the Tavily path applies here too.
  const descriptionEmail = item.snippet.description.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const email = creator.email ?? usableEmail(descriptionEmail) ?? null;
  const followers = item.statistics.hiddenSubscriberCount
    ? null
    : Number(item.statistics.subscriberCount ?? 0) || null;
  const inIndia = item.snippet.country === "IN" || creator.country === "India";
  const { exclusionReasons, notes, strictEligible } = creatorEligibility({
    email,
    isIndia: inIndia,
    followers,
    platform: "YouTube",
    engagementRate: engagement.rate,
  });

  return {
    ...creator,
    name: item.snippet.title,
    profileUrl: `https://www.youtube.com/channel/${item.id}`,
    followers,
    email,
    country: inIndia ? ("India" as const) : ("Unverified" as const),
    engagementRate: engagement.rate,
    engagementSampleSize: engagement.sampleSize,
    engagementFormula: engagement.rate == null ? null : "Mean (likes + comments) / views × 100",
    strictEligible,
    exclusionReasons,
    notes,
    evidence: [
      ...creator.evidence,
      {
        url: `https://www.youtube.com/channel/${item.id}`,
        excerpt: `Official YouTube channel metadata; country=${item.snippet.country ?? "unset"}; subscribers=${followers ?? "hidden"}.`,
        capturedAt: new Date().toISOString(),
        confidence: "high" as const,
      },
    ],
  };
}
