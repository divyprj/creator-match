import { describe, expect, it } from "vitest";
import { parseCompactNumber, youtubeEngagementRate } from "@/lib/engagement";

describe("youtubeEngagementRate", () => {
  it("uses the mean per-video interaction rate and ignores zero-view rows", () => {
    expect(youtubeEngagementRate([
      { viewCount: "1000", likeCount: "90", commentCount: "10" },
      { viewCount: "2000", likeCount: "180", commentCount: "20" },
      { viewCount: "0", likeCount: "4", commentCount: "2" },
    ])).toEqual({ rate: 10, sampleSize: 2 });
  });
  it("returns a transparent empty result", () => expect(youtubeEngagementRate([])).toEqual({ rate: null, sampleSize: 0 }));
});

describe("parseCompactNumber", () => {
  it.each([["1K", 1000], ["12.5k", 12500], ["1,234", 1234], ["2M", 2000000]])("parses %s", (input, output) => expect(parseCompactNumber(input)).toBe(output));
});
