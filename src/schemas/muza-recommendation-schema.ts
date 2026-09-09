import { z } from 'zod'

export const recommendationTypeSchema = z.enum([
  'CONTENT',
  'SEO',
  'OFFER',
  'VISIBILITY',
  'ENGAGEMENT',
])

export const recommendationPrioritySchema = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH',
])

export const recommendationFormatSchema = z.enum([
  'INSTAGRAM_POST',
  'INSTAGRAM_CAROUSEL',
  'INSTAGRAM_REEL',
  'INSTAGRAM_STORY',
  'FACEBOOK_POST',
  'TIKTOK',
  'LINKEDIN_POST',
  'YOUTUBE_SHORT',
  'BLOG_ARTICLE',
  'WEBSITE_PAGE',
  'GOOGLE_BUSINESS_PROFILE',
  'OTHER',
])

export const muzaRecommendationReasonSchema = z.object({
  label: z.string().trim().min(1).max(100),
  explanation: z.string().trim().min(1).max(400),
})

export const muzaRecommendationSchema = z.object({
  type: recommendationTypeSchema,

  title: z.string().trim().min(1).max(140),
  summary: z.string().trim().min(1).max(500),

  priority: recommendationPrioritySchema,

  whyNow: z.string().trim().min(1).max(500),
  reasons: z.array(muzaRecommendationReasonSchema).min(1).max(5),

  suggestedFormats: z
    .array(recommendationFormatSchema)
    .min(1)
    .max(4)
    .refine((items) => new Set(items).size === items.length, {
      message: 'suggestedFormats ne doit pas contenir de doublons',
    }),

  objective: z.string().trim().min(1).max(300).nullable(),
  audience: z.string().trim().min(1).max(300).nullable(),
  offer: z.string().trim().min(1).max(300).nullable(),

  estimatedEffortMinutes: z.number().int().min(1).max(480).nullable(),

  requiresCamera: z.boolean(),
  requiresVoiceover: z.boolean(),

  contentAngle: z.string().trim().min(1).max(500).nullable(),
  callToAction: z.string().trim().min(1).max(300).nullable(),
})

export const muzaRecommendationBatchSchema = z.object({
  recommendations: z.array(muzaRecommendationSchema).min(1).max(5),
  strategicSummary: z.string().trim().min(1).max(1000),
  generatedAt: z.string().trim().refine((val) => !isNaN(Date.parse(val)), {
    message: 'generatedAt doit être une chaîne datetime ISO valide',
  }),
})
