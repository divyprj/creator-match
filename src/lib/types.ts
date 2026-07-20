export const NICHES = [
  "Fashion",
  "Beauty",
  "Fitness",
  "Food",
  "Finance",
  "Parenting",
  "Tech",
  "Gaming",
  "Education",
] as const;

export const PLATFORMS = ["Instagram", "YouTube"] as const;

export type Niche = (typeof NICHES)[number];
export type Platform = (typeof PLATFORMS)[number];
export type Confidence = "high" | "medium" | "low" | "unverified";

export type Evidence = {
  url: string;
  excerpt: string;
  capturedAt: string;
  confidence: Confidence;
};

export type CreatorResult = {
  id: string;
  name: string;
  handle: string;
  platform: Platform;
  profileUrl: string;
  followers: number | null;
  engagementRate: number | null;
  engagementFormula: string | null;
  engagementSampleSize: number;
  niche: Niche;
  contentThemes: string[];
  email: string | null;
  city: string | null;
  country: "India" | "Unverified";
  strictEligible: boolean;
  exclusionReasons: string[];
  notes: string[];
  evidence: Evidence[];
};

export const SORT_OPTIONS = ["engagement", "followers", "relevance"] as const;
export type SortKey = (typeof SORT_OPTIONS)[number];

export type SearchResponse = {
  results: CreatorResult[];
  searchedAt: string;
  sourceCount: number;
  notice: string | null;
};
