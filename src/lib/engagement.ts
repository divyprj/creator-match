export type VideoStatistics = {
  viewCount?: string;
  likeCount?: string;
  commentCount?: string;
};

/**
 * Videos with a handful of views produce meaningless rates: 40 views and 12 likes reads as 30%
 * engagement, when a credible YouTube rate sits between roughly 1% and 8%. Live results showed
 * channels reported at 20-32% purely because their recent uploads had almost no views. Such rows
 * are excluded from the sample rather than averaged in, and a creator whose whole sample is below
 * the floor reports no rate at all instead of a flattering invented one.
 */
const MIN_SAMPLE_VIEWS = 100;

export function youtubeEngagementRate(rows: VideoStatistics[]) {
  const usable = rows
    .map((row) => ({
      views: Number(row.viewCount ?? 0),
      likes: Number(row.likeCount ?? 0),
      comments: Number(row.commentCount ?? 0),
    }))
    .filter((row) => Number.isFinite(row.views) && row.views >= MIN_SAMPLE_VIEWS);

  if (!usable.length) return { rate: null, sampleSize: 0 };

  const mean =
    usable.reduce(
      (total, row) => total + ((row.likes + row.comments) / row.views) * 100,
      0,
    ) / usable.length;

  return { rate: Number(mean.toFixed(2)), sampleSize: usable.length };
}

export function parseCompactNumber(value: string) {
  const match = value.replace(/,/g, "").match(/([0-9]+(?:\.[0-9]+)?)\s*([KMB])?/i);
  if (!match) return null;
  const multiplier = { K: 1_000, M: 1_000_000, B: 1_000_000_000 }[
    (match[2]?.toUpperCase() ?? "") as "K" | "M" | "B"
  ] ?? 1;
  return Math.round(Number(match[1]) * multiplier);
}
