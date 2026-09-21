/**
 * Custom error thrown when an AI provider generation exceeds its bounded execution time.
 */
export class MuzaProviderTimeoutError extends Error {
  readonly timeoutMs: number

  constructor(timeoutMs: number) {
    super(`Mūza provider generation timed out after ${timeoutMs}ms`)
    this.name = 'MuzaProviderTimeoutError'
    this.timeoutMs = timeoutMs
  }
}

/**
 * Executes an asynchronous provider operation with a bounded server-side timeout.
 * - Does NOT retry automatically.
 * - Does NOT switch provider automatically.
 * - Leaves persistence untouched (error bubbles up before persistence).
 * - Exactly one call in, exactly one resolution or timeout out.
 *
 * @param promise - The provider generation promise
 * @param timeoutMs - Max execution duration in milliseconds
 */
export async function withProviderTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  let timer: NodeJS.Timeout | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new MuzaProviderTimeoutError(timeoutMs))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timer) {
      clearTimeout(timer)
    }
  }
}
