import { z } from "zod";
import { NICHES, PLATFORMS } from "@/lib/types";

export const searchSchema = z
  .object({
    niche: z.enum(NICHES),
    platforms: z.array(z.enum(PLATFORMS)).min(1).max(2),
    minFollowers: z.number().int().min(1_000).max(100_000),
    maxFollowers: z.number().int().min(1_000).max(100_000),
    limit: z.number().int().min(1).max(50).default(8),
  })
  .refine((value) => value.minFollowers <= value.maxFollowers, {
    message: "Minimum followers cannot exceed maximum followers.",
    path: ["minFollowers"],
  });

export const outreachSchema = z.object({
  creatorName: z.string().trim().min(1).max(80),
  niche: z.enum(NICHES),
  platform: z.enum(PLATFORMS),
  style: z.string().trim().min(2).max(160),
  recentTheme: z.string().trim().min(2).max(160),
  collaborationType: z.enum([
    "Sponsored post",
    "Affiliate campaign",
    "UGC creation",
    "Brand ambassador",
    "Paid promotion",
    "Barter collaboration",
  ]),
  brandName: z.string().trim().min(1).max(80),
  brandValue: z.string().trim().min(2).max(240),
});

export const emailSendSchema = z.object({
  idempotencyKey: z.string().uuid(),
  recipient: z.string().email(),
  subject: z.string().trim().min(2).max(120),
  body: z.string().trim().min(20).max(2_000),
  confirmed: z.literal(true),
});

export function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}
