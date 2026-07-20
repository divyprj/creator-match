export type VideoStatistics = {
  viewCount?: string;
  likeCount?: string;
  commentCount?: string;
};

export function youtubeEngagementRate(rows: VideoStatistics[]) {
  const usable = rows
    .map((row) => ({
      views: Number(row.viewCount ?? 0),
      likes: Number(row.likeCount ?? 0),
      comments: Number(row.commentCount ?? 0),
    }))
    .filter((row) => Number.isFinite(row.views) && row.views > 0);

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
