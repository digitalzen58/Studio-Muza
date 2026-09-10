import 'server-only'
import OpenAI from 'openai'

let clientInstance: OpenAI | null = null

/**
 * Returns a server-side OpenAI client instance.
 * Throws an error if OPENAI_API_KEY is not set in environment variables.
 *
 * @returns OpenAI client instance
 */
export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  if (!clientInstance) {
    clientInstance = new OpenAI({
      apiKey,
    })
  }

  return clientInstance
}
