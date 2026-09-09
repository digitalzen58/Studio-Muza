import { muzaRecommendationBatchSchema } from '@/schemas/muza-recommendation-schema'
import { MuzaRecommendationBatch } from '@/types/muza-recommendation-engine'

/**
 * Strictly validates an unparsed recommendation batch input against the Zod schema.
 * Throws ZodError directly if validation fails without silent fallbacks.
 *
 * @param input - Raw data to validate
 * @returns Validated MuzaRecommendationBatch
 */
export function validateMuzaRecommendationBatch(
  input: unknown
): MuzaRecommendationBatch {
  return muzaRecommendationBatchSchema.parse(input)
}

/**
 * Safely validates an unparsed recommendation batch input without throwing.
 * Useful for handling structured validation results gracefully.
 *
 * @param input - Raw data to validate
 * @returns SafeParseResult from Zod
 */
export function safeValidateMuzaRecommendationBatch(
  input: unknown
): ReturnType<typeof muzaRecommendationBatchSchema.safeParse> {
  return muzaRecommendationBatchSchema.safeParse(input)
}
