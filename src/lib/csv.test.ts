import { expect, it } from "vitest";
import { creatorsToDownload } from "@/lib/csv";
import type { CreatorResult } from "@/lib/types";

it("escapes spreadsheet formulas and quotes", () => {
  const creator: CreatorResult = { id: "1", name: "=IMPORTXML(\"x\")", handle: "safe", platform: "Instagram", profileUrl: "https://instagram.com/safe", followers: 2000, engagementRate: null, engagementFormula: null, engagementSampleSize: 0, niche: "Fashion", contentThemes: ["Fashion"], email: null, city: null, country: "India", strictEligible: false, exclusionReasons: [], notes: [], evidence: [] };
  const output = creatorsToDownload([creator]);
  expect(output).toContain("'=IMPORTXML");
  expect(output).toContain('""x""');
});
