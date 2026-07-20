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

  it("excludes low-view videos that would inflate the rate", () => {
    // 40 views / 12 interactions is 30%, which would dominate a mean built from real samples.
    expect(youtubeEngagementRate([
      { viewCount: "1000", likeCount: "40", commentCount: "10" },
      { viewCount: "40", likeCount: "10", commentCount: "2" },
    ])).toEqual({ rate: 5, sampleSize: 1 });
  });

  it("reports no rate when every sampled video is below the view floor", () => {
    expect(youtubeEngagementRate([
      { viewCount: "30", likeCount: "9", commentCount: "1" },
      { viewCount: "12", likeCount: "4", commentCount: "0" },
    ])).toEqual({ rate: null, sampleSize: 0 });
  });
});

describe("parseCompactNumber", () => {
  it.each([["1K", 1000], ["12.5k", 12500], ["1,234", 1234], ["2M", 2000000]])("parses %s", (input, output) => expect(parseCompactNumber(input)).toBe(output));
});
