import { PexelsStockMediaProvider } from './pexels-provider'
import type { StockMediaProvider } from './types'

export * from './types'
export { PexelsStockMediaProvider } from './pexels-provider'

let defaultProvider: StockMediaProvider | null = null

export function getStockMediaProvider(): StockMediaProvider {
  if (!defaultProvider) {
    defaultProvider = new PexelsStockMediaProvider()
  }
  return defaultProvider
}
