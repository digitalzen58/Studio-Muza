import { z } from 'zod'

/**
 * Strict schema for single-text suggestions (HELP_WRITE, IMPROVE_TEXT, SHORTEN_TEXT).
 */
export const singleTextSuggestionSchema = z.object({
  suggestedText: z
    .string()
    .trim()
    .min(3, 'La suggestion doit comporter au moins 3 caractères')
    .max(1000, 'La suggestion ne peut dépasser 1000 caractères'),
})

export type SingleTextSuggestion = z.infer<typeof singleTextSuggestionSchema>

/**
 * Strict schema for hook proposals (SUGGEST_HOOKS).
 * Must contain exactly 3 hooks, each between 5 and 180 characters.
 */
export const hookSuggestionsSchema = z.object({
  hooks: z
    .array(
      z
        .string()
        .trim()
        .min(5, 'L’accroche doit comporter au moins 5 caractères')
        .max(180, 'L’accroche ne peut dépasser 180 caractères')
    )
    .length(3, 'Exactement 3 accroches doivent être proposées'),
})

export type HookSuggestions = z.infer<typeof hookSuggestionsSchema>
