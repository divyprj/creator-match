import { createHash } from "node:crypto";
import type { CreatorResult, Evidence, Niche, Platform } from "@/lib/types";
import { parseCompactNumber } from "@/lib/engagement";

type TavilyResult = {
  title: string;
  url: string;
  content: string;
  raw_content?: string | null;
  score?: number;
};

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const EMAIL_PATTERN_GLOBAL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PROFILE_URL_PATTERN = /https?:\/\/(?:www\.)?(?:instagram\.com|youtube\.com|youtu\.be)\/[A-Za-z0-9_.@\-/]+/gi;

const INDIAN_CITIES = [
  "Mumbai",
  "Delhi",
  "New Delhi",
  "Bengaluru",
  "Bangalore",
  "Chennai",
  "Hyderabad",
  "Pune",
  "Kolkata",
  "Jaipur",
  "Gurugram",
  "Gurgaon",
  "Noida",
  "Ahmedabad",
  "Kochi",
  "Lucknow",
  "Chandigarh",
  "Indore",
  "Surat",
  "Goa",
];

const INDIA_PATTERN = new RegExp(`\\b(india|indian|desi|bharat|${INDIAN_CITIES.join("|")})\\b`, "i");

// Emails that belong to the directory or listicle page itself, never to a creator.
const GENERIC_EMAIL_PATTERN =
  /^(info|support|contact|hello|hi|admin|sales|team|press|help|noreply|no-reply|careers|jobs|privacy|legal|marketing|partnerships)@/i;

/** Niche-specific discovery vocabulary. Hashtags mirror what Indian creators actually tag. */
export const NICHE_TERMS: Record<Niche, { hashtags: string[]; subNiches: string[] }> = {
  Fashion: {
    hashtags: ["#IndianFashion", "#IndianFashionBlogger", "#DesiFashion"],
    subNiches: ["ethnic wear styling", "sustainable fashion", "budget outfit styling"],
  },
  Beauty: {
    hashtags: ["#SkincareIndia", "#IndianMakeupArtist", "#IndianBeautyBlogger"],
    subNiches: ["skincare routine", "drugstore makeup", "haircare"],
  },
  Fitness: {
    hashtags: ["#FitnessIndia", "#IndianFitness", "#HomeWorkoutIndia"],
    subNiches: ["home workout", "strength training", "yoga"],
  },
  Food: {
    hashtags: ["#IndianFoodBlogger", "#FoodieIndia", "#DesiFood"],
    subNiches: ["home cooking recipes", "street food reviews", "healthy Indian meals"],
  },
  Finance: {
    hashtags: ["#PersonalFinanceIndia", "#StockMarketIndia", "#FinanceIndia"],
    subNiches: ["mutual funds explained", "personal finance basics", "tax saving"],
  },
  Parenting: {
    hashtags: ["#IndianMomBlogger", "#ParentingIndia", "#MomsOfIndia"],
    subNiches: ["newborn care", "toddler activities", "working parent routines"],
  },
  Tech: {
    hashtags: ["#TechIndia", "#IndianTechReviewer", "#GadgetsIndia"],
    subNiches: ["smartphone reviews", "coding tutorials", "budget gadget reviews"],
  },
  Gaming: {
    hashtags: ["#IndianGamer", "#GamingIndia", "#BGMIIndia"],
    subNiches: ["mobile gaming", "game streaming", "esports commentary"],
  },
  Education: {
    hashtags: ["#EduIndia", "#StudyWithMeIndia", "#LearnWithIndia"],
    subNiches: ["exam preparation", "spoken English", "study tips"],
  },
};

function platformFor(url: string): Platform | null {
  if (/instagram\.com/i.test(url)) return "Instagram";
  if (/youtu(?:be\.com|\.be)/i.test(url)) return "YouTube";
  return null;
}

function normalizedHandle(url: string, platform: Platform) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "";
  }
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (platform === "Instagram") return (parts[0] ?? "").replace(/^@/, "");
  if (parts[0]?.startsWith("@")) return parts[0].slice(1);
  if (["channel", "c", "user"].includes(parts[0] ?? "")) return parts[1] ?? "";
  return "";
}

const RESERVED_HANDLES = new Set([
  "about",
  "accounts",
  "ads",
  "api",
  "business",
  "creators",
  "developer",
  "directory",
  "explore",
  "feed",
  "feeds",
  "gaming",
  "hashtag",
  "help",
  "legal",
  "locations",
  "login",
  "music",
  "p",
  "playlist",
  "popular",
  "premium",
  "privacy",
  "reel",
  "reels",
  "results",
  "shorts",
  "signup",
  "sports",
  "stories",
  "tags",
  "terms",
  "tv",
  "watch",
  "web",
]);

function followerHint(text: string) {
  const match = text.match(/([0-9][0-9,.]*\s*[KMB]?)\s*(?:\+\s*)?(?:followers|subscribers|subs)\b/i);
  return match ? parseCompactNumber(match[1]) : null;
}

function inferCity(text: string) {
  return INDIAN_CITIES.find((city) => new RegExp(`\\b${city}\\b`, "i").test(text)) ?? null;
}

export function usableEmail(candidate: string | null | undefined) {
  if (!candidate) return null;
  return GENERIC_EMAIL_PATTERN.test(candidate) ? null : candidate;
}

/**
 * Contact email, India signal and follower count are the assignment's minimum bar, so they gate
 * strict eligibility. Engagement is reported as a note instead: Instagram engagement is not
 * derivable without authorized API access, and blanket-excluding every Instagram creator for that
 * reason would make the platform undiscoverable rather than merely unverified.
 */
export function creatorEligibility(args: {
  email: string | null;
  isIndia: boolean;
  followers: number | null;
  platform: Platform;
  engagementRate: number | null;
}) {
  const exclusionReasons = [
    !args.email && "No creator-published contact email found",
    !args.isIndia && "India signal is not yet verified",
    args.followers == null && "Follower count requires platform verification",
  ].filter(Boolean) as string[];

  const notes = [
    args.engagementRate == null && args.platform === "Instagram"
      ? "Instagram engagement needs authorized API access; follower and contact evidence only"
      : null,
    args.engagementRate == null && args.platform === "YouTube"
      ? "Recent-video engagement was unavailable for this channel"
      : null,
  ].filter(Boolean) as string[];

  return { exclusionReasons, notes, strictEligible: exclusionReasons.length === 0 };
}

function buildCreator(args: {
  url: string;
  title: string;
  text: string;
  niche: Niche;
  evidenceUrl: string;
  confidence: Evidence["confidence"];
  email?: string | null;
}): CreatorResult | null {
  const platform = platformFor(args.url);
  if (!platform) return null;
  const handle = normalizedHandle(args.url, platform);
  if (!handle || RESERVED_HANDLES.has(handle.toLowerCase())) return null;

  const text = args.text.replace(/\s+/g, " ").trim();
  const email = usableEmail(args.email ?? text.match(EMAIL_PATTERN)?.[0]);
  const isIndia = INDIA_PATTERN.test(text);
  const followers = followerHint(text);
  const { exclusionReasons, notes, strictEligible } = creatorEligibility({
    email,
    isIndia,
    followers,
    platform,
    engagementRate: null,
  });

  return {
    id: createHash("sha256").update(`${platform}:${handle.toLowerCase()}`).digest("hex").slice(0, 20),
    name: args.title.replace(/\s*[-|·].*$/, "").trim() || `@${handle}`,
    handle,
    platform,
    profileUrl: args.url,
    followers,
    engagementRate: null,
    engagementFormula: null,
    engagementSampleSize: 0,
    niche: args.niche,
    contentThemes: [args.niche],
    email,
    city: inferCity(text),
    country: isIndia ? "India" : "Unverified",
    strictEligible,
    exclusionReasons,
    notes,
    evidence: [
      {
        url: args.evidenceUrl,
        excerpt: text.slice(0, 280),
        capturedAt: new Date().toISOString(),
        confidence: args.confidence,
      },
    ],
  };
}

export function tavilyResultToCreator(result: TavilyResult, niche: Niche): CreatorResult | null {
  return buildCreator({
    url: result.url,
    title: result.title,
    text: `${result.title} ${result.content}`,
    niche,
    evidenceUrl: result.url,
    confidence: result.score && result.score > 0.7 ? "medium" : "low",
  });
}

/**
 * Directories, UGC marketplaces and "top creators" listicles publish the contact emails that
 * platform pages omit. Each profile link on such a page is mined together with the nearest email
 * and follower figure in the surrounding text.
 */
export function mineProfilesFromPage(result: TavilyResult, niche: Niche, cap = 30): CreatorResult[] {
  const text = `${result.title} ${result.content} ${result.raw_content ?? ""}`.replace(/\s+/g, " ");
  const emails = [...text.matchAll(EMAIL_PATTERN_GLOBAL)].map((match) => ({
    value: match[0],
    index: match.index ?? 0,
  }));

  const creators: CreatorResult[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(PROFILE_URL_PATTERN)) {
    if (creators.length >= cap) break;
    const url = match[0].replace(/[).,;'"]+$/, "");
    const index = match.index ?? 0;
    const window = text.slice(Math.max(0, index - 260), index + 260);

    // Attribute an email to this profile only when it sits inside the same listing block.
    const nearest = emails
      .map((email) => ({ ...email, distance: Math.abs(email.index - index) }))
      .filter((email) => email.distance <= 400)
      .sort((a, b) => a.distance - b.distance)[0];

    const creator = buildCreator({
      url,
      title: window.match(/([A-Z][A-Za-z'’.]+(?:\s+[A-Z][A-Za-z'’.]+){0,2})/)?.[1] ?? "",
      text: window,
      niche,
      evidenceUrl: result.url,
      confidence: "low",
      email: nearest?.value ?? null,
    });
    if (!creator) continue;

    const key = `${creator.platform}:${creator.handle.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    creators.push(creator);
  }

  return creators;
}

async function tavilySearch(args: {
  apiKey: string;
  query: string;
  maxResults: number;
  includeDomains?: string[];
  includeRawContent?: boolean;
}) {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${args.apiKey}` },
    body: JSON.stringify({
      query: args.query,
      topic: "general",
      search_depth: "advanced",
      max_results: Math.min(20, args.maxResults),
      ...(args.includeDomains?.length ? { include_domains: args.includeDomains } : {}),
      include_answer: false,
      include_raw_content: args.includeRawContent ?? false,
      country: "india",
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Tavily search failed with ${response.status}.`);
  const body = (await response.json()) as { results?: TavilyResult[] };
  return body.results ?? [];
}

/** Failed query variants must not abandon the whole sweep; discovery is best-effort by design. */
async function settledFlat(tasks: Array<Promise<TavilyResult[]>>) {
  const settled = await Promise.allSettled(tasks);
  return settled.flatMap((entry) => (entry.status === "fulfilled" ? entry.value : []));
}

function profileQueries(niche: Niche, platform: Platform) {
  const terms = NICHE_TERMS[niche];
  const lower = niche.toLowerCase();
  return [
    `${niche} creator India micro influencer collaboration contact email ${platform}`,
    `${terms.hashtags[0]} ${terms.hashtags[1]} Indian ${lower} creator ${platform} business enquiries email`,
    `${lower} content creator Mumbai Delhi Bengaluru Pune India ${platform} followers email`,
    `${terms.subNiches[0]} Indian creator ${platform} "for collaborations" contact`,
    `${terms.subNiches[1]} India ${platform} micro influencer "business enquiry" gmail`,
    `Indian ${lower} ${platform} creator Hyderabad Jaipur Kolkata Ahmedabad collaboration email`,
    `${terms.hashtags[2]} India ${platform} creator 10k 50k followers contact`,
    `${terms.subNiches[2]} Indian ${platform} creator brand collaboration enquiries`,
    // Search naturally surfaces the largest accounts, which fall outside the 5K-100K micro band.
    // These variants name small-creator vocabulary explicitly to pull the long tail into range.
    `small Indian ${lower} creator under 50k followers ${platform} collaboration email`,
    `${lower} nano influencer India 5k 10k 20k followers ${platform} business contact`,
    `upcoming Indian ${lower} ${platform} creator growing audience collaboration enquiries email`,
  ];
}

/**
 * Qoruz and StarNgage are India-specific creator directories that publish follower counts,
 * engagement rates and business contacts on public profile pages, which general listicles rarely
 * do. They are queried by name so the sweep reliably reaches them rather than hoping they rank.
 */
const INDIAN_DIRECTORIES = ["qoruz.com", "starngage.com"];

function directoryQueries(niche: Niche) {
  const terms = NICHE_TERMS[niche];
  const lower = niche.toLowerCase();
  return [
    `top Indian ${lower} micro influencers list with contact email`,
    `Indian ${lower} influencers directory 10k to 100k followers collaboration contact`,
    `${lower} creator spotlight India Instagram YouTube handles email list`,
    `hire Indian ${lower} micro influencers UGC marketplace ${terms.hashtags[0]}`,
    `best ${lower} influencers in India Instagram handle followers engagement rate`,
    `Indian ${lower} nano influencers 5000 to 50000 followers list with contact`,
    `${lower} micro influencers India under 100k followers email collaboration rates`,
  ];
}

function indianDirectoryQueries(niche: Niche) {
  const lower = niche.toLowerCase();
  return [
    `${lower} influencer India profile followers engagement rate contact`,
    `${lower} creator India micro influencer collaboration rate card`,
  ];
}

/** Platform-restricted sweep: the profile URL is the search result itself. */
export async function searchTavily(args: {
  apiKey: string;
  niche: Niche;
  platform: Platform;
  maxResults: number;
}) {
  const domain = args.platform === "Instagram" ? "instagram.com" : "youtube.com";
  const variants = profileQueries(args.niche, args.platform).slice(
    0,
    Math.min(11, Math.max(2, Math.ceil(args.maxResults / 5))),
  );
  return settledFlat(
    variants.map((query) =>
      tavilySearch({ apiKey: args.apiKey, query, maxResults: 20, includeDomains: [domain] }),
    ),
  );
}

/** Open-web sweep over directories, marketplaces and listicles, mined for profiles plus emails. */
export async function searchDirectories(args: { apiKey: string; niche: Niche; maxResults: number }) {
  const variants = directoryQueries(args.niche).slice(
    0,
    Math.min(7, Math.max(1, Math.ceil(args.maxResults / 8))),
  );
  const pages = await settledFlat([
    ...variants.map((query) =>
      tavilySearch({ apiKey: args.apiKey, query, maxResults: 12, includeRawContent: true }),
    ),
    ...indianDirectoryQueries(args.niche).map((query) =>
      tavilySearch({
        apiKey: args.apiKey,
        query,
        maxResults: 15,
        includeDomains: INDIAN_DIRECTORIES,
        includeRawContent: true,
      }),
    ),
  ]);
  return pages.flatMap((page) => mineProfilesFromPage(page, args.niche));
}
