import { z } from 'zod'
import {
  recommendationFormatSchema,
  recommendationPrioritySchema,
  recommendationTypeSchema,
} from '@/schemas/muza-recommendation-schema'

/**
 * Reason schema for AI provider transport.
 * Must remain strictly simple without custom refinements or transforms.
 */
export const muzaAIReasonSchema = z.object({
  label: z.string(),
  explanation: z.string(),
})

/**
 * Recommendation item schema for AI provider transport.
 * All fields are required in JSON schema; optional values are explicitly marked as .nullable().
 * No .refine(), .transform(), or custom validators.
 */
export const muzaAIRecommendationSchema = z.object({
  type: recommendationTypeSchema,

  title: z.string(),
  summary: z.string(),

  priority: recommendationPrioritySchema,

  whyNow: z.string(),
  reasons: z.array(muzaAIReasonSchema),

  suggestedFormats: z.array(recommendationFormatSchema),

  objective: z.string().nullable(),
  audience: z.string().nullable(),
  offer: z.string().nullable(),

  estimatedEffortMinutes: z.number().int().nullable(),

  requiresCamera: z.boolean(),
  requiresVoiceover: z.boolean(),

  contentAngle: z.string().nullable(),
  callToAction: z.string().nullable(),
})

/**
 * Recommendation batch schema for AI provider transport.
 * All fields are required in JSON schema. No custom refinements or datetime regexes.
 */
export const muzaAIRecommendationBatchSchema = z.object({
  recommendations: z.array(muzaAIRecommendationSchema),
  strategicSummary: z.string(),
})

export type MuzaAIReason = z.infer<typeof muzaAIReasonSchema>
export type MuzaAIRecommendation = z.infer<
  typeof muzaAIRecommendationSchema
>
export type MuzaAIRecommendationBatch = z.infer<
  typeof muzaAIRecommendationBatchSchema
>
