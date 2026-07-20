import { NextResponse } from "next/server";
import { searchSchema } from "@/lib/validation";
import { serverConfig } from "@/lib/config";
import { searchTavily, searchDirectories, tavilyResultToCreator } from "@/lib/tavily";
import {
  enrichYouTubeCreator,
  discoverYouTubeChannels,
  describeYouTubeChannels,
  youtubeDiscoveryQueries,
} from "@/lib/youtube";
import type { CreatorResult, SearchResponse } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ANONYMOUS_LIMIT = 8;

/** YouTube handle lookups cannot be batched, so enrichment is fanned out under a fixed cap. */
async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await worker(items[index]);
      }
    }),
  );
  return results;
}

export async function POST(request: Request) {
  const input = searchSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return NextResponse.json({ error: input.error.issues[0]?.message ?? "Invalid search." }, { status: 400 });
  }
  if (!serverConfig.tavilyApiKey) {
    return NextResponse.json(
      { error: "Live search is ready but TAVILY_API_KEY has not been configured." },
      { status: 503 },
    );
  }
  if (input.data.platforms.includes("YouTube") && !serverConfig.youtubeApiKey) {
    return NextResponse.json(
      { error: "YouTube verification requires YOUTUBE_API_KEY." },
      { status: 503 },
    );
  }

  try {
    const supabase = await createClient();
    const user = supabase ? (await supabase.auth.getUser()).data.user : null;
    const effectiveLimit = user ? input.data.limit : Math.min(input.data.limit, ANONYMOUS_LIMIT);

    const platformSweeps = input.data.platforms.map((platform) =>
      searchTavily({
        apiKey: serverConfig.tavilyApiKey!,
        niche: input.data.niche,
        platform,
        maxResults: Math.max(8, effectiveLimit),
      }),
    );

    // The directory sweep is the only reliable source of creator-published contact emails, but it
    // costs extra Tavily calls, so anonymous previews stay on the cheaper platform-only path.
    const directorySweep = user
      ? searchDirectories({
          apiKey: serverConfig.tavilyApiKey!,
          niche: input.data.niche,
          maxResults: effectiveLimit,
        })
      : Promise.resolve([] as CreatorResult[]);

    // YouTube's own search is the only discovery path that returns verified subscriber counts, so
    // it is what actually fills the micro band. It runs for anonymous visitors too: gating it
    // behind sign-in left the public preview returning near-zero usable results, which reads as a
    // broken product. Cost stays bounded because the variant count scales with the result limit,
    // so an 8-result preview spends two queries rather than ten.
    const youtubeNative =
      input.data.platforms.includes("YouTube")
        ? discoverYouTubeChannels({
            apiKey: serverConfig.youtubeApiKey!,
            niche: input.data.niche,
            queries: youtubeDiscoveryQueries(input.data.niche, Math.ceil(effectiveLimit / 6)),
          })
            .then((channelIds) =>
              describeYouTubeChannels({
                apiKey: serverConfig.youtubeApiKey!,
                channelIds,
                niche: input.data.niche,
              }),
            )
            .catch(() => [] as CreatorResult[])
        : Promise.resolve([] as CreatorResult[]);

    const [batches, mined, native] = await Promise.all([
      Promise.all(platformSweeps),
      directorySweep,
      youtubeNative,
    ]);

    const fromPlatforms = batches
      .flat()
      .map((result) => tavilyResultToCreator(result, input.data.niche))
      .filter((creator): creator is CreatorResult => creator !== null);

    const allowedPlatforms = new Set(input.data.platforms);
    const candidates = [...native, ...fromPlatforms, ...mined].filter((creator) =>
      allowedPlatforms.has(creator.platform),
    );

    // Merge duplicates so a directory-sourced email can complete a platform-sourced profile.
    const merged = new Map<string, CreatorResult>();
    for (const creator of candidates) {
      const key = `${creator.platform}:${creator.handle.toLowerCase()}`;
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, creator);
        continue;
      }
      merged.set(key, {
        ...existing,
        email: existing.email ?? creator.email,
        followers: existing.followers ?? creator.followers,
        city: existing.city ?? creator.city,
        country: existing.country === "India" ? existing.country : creator.country,
        evidence: [...existing.evidence, ...creator.evidence].slice(0, 6),
      });
    }

    const unique = [...merged.values()];

    // Engagement sampling costs two extra YouTube calls per channel, so candidates are ranked
    // before enrichment and quota is spent on the rows most likely to survive the filters.
    const inMicroBand = (creator: CreatorResult) =>
      creator.followers != null &&
      creator.followers >= input.data.minFollowers &&
      creator.followers <= input.data.maxFollowers;
    const priority = (creator: CreatorResult) =>
      (inMicroBand(creator) ? 4 : 0) + (creator.email ? 2 : 0) + (creator.country === "India" ? 1 : 0);

    const ordered = [...unique].sort((a, b) => priority(b) - priority(a));
    const enrichable = ordered.slice(0, effectiveLimit * 2);
    const remainder = ordered.slice(effectiveLimit * 2);

    const enriched = [
      ...(await mapWithConcurrency(enrichable, 6, async (creator) => {
        if (creator.platform !== "YouTube") return creator;
        try {
          return await enrichYouTubeCreator(creator, serverConfig.youtubeApiKey!);
        } catch {
          // A single channel lookup failure must not discard an otherwise usable candidate.
          return creator;
        }
      })),
      ...remainder,
    ];

    const ranged = enriched.map((creator) => {
      const inRange =
        creator.followers !== null &&
        creator.followers >= input.data.minFollowers &&
        creator.followers <= input.data.maxFollowers;
      const exclusionReasons = [
        ...creator.exclusionReasons,
        creator.followers !== null && !inRange ? "Follower count is outside the selected range" : null,
      ].filter(Boolean) as string[];
      return { ...creator, strictEligible: exclusionReasons.length === 0, exclusionReasons };
    });

    // Strict matches lead, then better-evidenced candidates, so truncation drops the weakest rows.
    const ranked = ranged.sort((a, b) => {
      if (a.strictEligible !== b.strictEligible) return a.strictEligible ? -1 : 1;
      return a.exclusionReasons.length - b.exclusionReasons.length;
    });
    const results = ranked.slice(0, effectiveLimit);

    if (user && supabase) {
      await supabase.from("discovery_runs").insert({
        user_id: user.id,
        niche: input.data.niche.toLowerCase(),
        platforms: input.data.platforms.map((platform) => platform.toLowerCase()),
        min_followers: input.data.minFollowers,
        max_followers: input.data.maxFollowers,
        result_count: results.length,
      });
    }

    const response: SearchResponse = {
      results,
      searchedAt: new Date().toISOString(),
      sourceCount: batches.flat().length + mined.length,
      notice:
        results.length < effectiveLimit
          ? `Live sources produced ${results.length} unique candidates. No missing results were fabricated.`
          : null,
    };
    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Live discovery failed." },
      { status: 502 },
    );
  }
}
