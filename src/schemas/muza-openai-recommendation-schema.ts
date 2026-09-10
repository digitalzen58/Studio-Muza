import { z } from 'zod'
import {
  recommendationFormatSchema,
  recommendationPrioritySchema,
  recommendationTypeSchema,
} from '@/schemas/muza-recommendation-schema'

/**
 * Reason schema for OpenAI Structured Outputs transport.
 * Must remain strictly simple without custom refinements or transforms.
 */
export const muzaOpenAIReasonSchema = z.object({
  label: z.string(),
  explanation: z.string(),
})

/**
 * Recommendation item schema for OpenAI Structured Outputs transport.
 * All fields are required in JSON schema; optional values are explicitly marked as .nullable().
 * No .refine(), .transform(), or custom validators.
 */
export const muzaOpenAIRecommendationSchema = z.object({
  type: recommendationTypeSchema,

  title: z.string(),
  summary: z.string(),

  priority: recommendationPrioritySchema,

  whyNow: z.string(),
  reasons: z.array(muzaOpenAIReasonSchema),

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
 * Recommendation batch schema for OpenAI Structured Outputs transport.
 * All fields are required in JSON schema. No custom refinements or datetime regexes.
 */
export const muzaOpenAIRecommendationBatchSchema = z.object({
  recommendations: z.array(muzaOpenAIRecommendationSchema),
  strategicSummary: z.string(),
  generatedAt: z.string(),
})

export type MuzaOpenAIReason = z.infer<typeof muzaOpenAIReasonSchema>
export type MuzaOpenAIRecommendation = z.infer<
  typeof muzaOpenAIRecommendationSchema
>
export type MuzaOpenAIRecommendationBatch = z.infer<
  typeof muzaOpenAIRecommendationBatchSchema
>
