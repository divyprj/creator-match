import { describe, expect, it } from "vitest";
import { countWords, searchSchema } from "@/lib/validation";

describe("search validation", () => {
  it("enforces the 1K to 100K product range", () => expect(searchSchema.safeParse({ niche: "Tech", platforms: ["YouTube"], minFollowers: 999, maxFollowers: 100000, limit: 8 }).success).toBe(false));
  it("permits an authenticated-sized live batch", () => expect(searchSchema.safeParse({ niche: "Tech", platforms: ["YouTube"], minFollowers: 1000, maxFollowers: 100000, limit: 50 }).success).toBe(true));
});
it("counts whitespace-separated words", () => expect(countWords("one  two\nthree")).toBe(3));
