import { describe, expect, it } from "vitest";
import { mineProfilesFromPage, tavilyResultToCreator } from "@/lib/tavily";

describe("Tavily profile normalization", () => {
  it("rejects Instagram navigation and editorial routes", () => {
    expect(tavilyResultToCreator({ title: "Popular creators", url: "https://www.instagram.com/popular/brands-looking-for-influencers", content: "India fashion creators" }, "Fashion")).toBeNull();
  });

  it("keeps a creator profile without inventing missing fields", () => {
    const creator = tavilyResultToCreator({ title: "Creator", url: "https://www.instagram.com/real_creator/", content: "Indian fashion creator" }, "Fashion");
    expect(creator?.handle).toBe("real_creator");
    expect(creator?.followers).toBeNull();
    expect(creator?.strictEligible).toBe(false);
  });
});

describe("directory page mining", () => {
  const page = {
    title: "Top Indian beauty micro influencers",
    url: "https://example.com/top-indian-beauty-creators",
    content: "",
    raw_content: [
      "Aarti Sharma is a Mumbai based skincare creator in India with 42K followers.",
      "Reach her at aarti.creates@gmail.com or https://www.instagram.com/aarti.skin/",
      "Neha Verma, Delhi India, 18K followers, contact neha.beauty@outlook.com,",
      "profile https://www.instagram.com/nehaverma_beauty/",
      "For advertising on this site email info@example.com",
      "Navigation: https://www.instagram.com/explore/tags/skincare/",
    ].join(" "),
  };

  it("extracts each listed profile with its nearest contact email", () => {
    const creators = mineProfilesFromPage(page, "Beauty");
    const handles = creators.map((creator) => creator.handle);
    expect(handles).toContain("aarti.skin");
    expect(handles).toContain("nehaverma_beauty");
    expect(creators.find((c) => c.handle === "aarti.skin")?.email).toBe("aarti.creates@gmail.com");
  });

  it("drops navigation routes and site-level contact addresses", () => {
    const creators = mineProfilesFromPage(page, "Beauty");
    expect(creators.map((creator) => creator.handle)).not.toContain("explore");
    expect(creators.map((creator) => creator.email)).not.toContain("info@example.com");
  });

  it("reads follower counts and Indian cities from the surrounding listing", () => {
    const aarti = mineProfilesFromPage(page, "Beauty").find((c) => c.handle === "aarti.skin");
    expect(aarti?.followers).toBe(42_000);
    expect(aarti?.city).toBe("Mumbai");
    expect(aarti?.country).toBe("India");
    expect(aarti?.strictEligible).toBe(true);
  });
});
