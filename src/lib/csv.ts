import type { CreatorResult } from "@/lib/types";

function safeCell(value: string | number | null) {
  const raw = value == null ? "" : String(value);
  const guarded = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${guarded.replace(/"/g, '""')}"`;
}

export function creatorsToDownload(results: CreatorResult[]) {
  const headers = [
    "Name",
    "Platform",
    "Handle",
    "Followers",
    "Engagement Rate (%)",
    "Engagement Formula",
    "Engagement Sample Size",
    "Niche",
    "Content Themes",
    "Contact Email",
    "Profile",
    "City",
    "Country",
    "Strict Match",
    "Outstanding Evidence",
    "Notes",
    "Sources",
  ];
  const rows = results.map((creator) => [
    creator.name,
    creator.platform,
    creator.handle,
    creator.followers,
    creator.engagementRate,
    creator.engagementFormula,
    creator.engagementSampleSize,
    creator.niche,
    creator.contentThemes.join("; "),
    creator.email,
    creator.profileUrl,
    creator.city,
    creator.country,
    creator.strictEligible ? "Yes" : "No",
    creator.exclusionReasons.join("; "),
    creator.notes.join("; "),
    creator.evidence.map((item) => item.url).join("; "),
  ]);
  return [headers, ...rows].map((row) => row.map(safeCell).join(",")).join("\n");
}
