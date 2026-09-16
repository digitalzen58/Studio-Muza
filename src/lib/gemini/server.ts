import 'server-only'
import { GoogleGenAI } from '@google/genai'

let clientInstance: GoogleGenAI | null = null

/**
 * Returns a server-side Gemini client instance.
 * Throws an error if GEMINI_API_KEY is not set in environment variables.
 *
 * @returns GoogleGenAI client instance
 */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  if (!clientInstance) {
    clientInstance = new GoogleGenAI({
      apiKey,
    })
  }

  return clientInstance
}
