export type StockMediaProviderName = 'PEXELS'

export interface StockMediaItem {
  provider: StockMediaProviderName
  externalId: string
  previewUrl: string
  sourceUrl: string
  downloadUrl: string
  creatorName: string
  creatorUrl: string
  width: number
  height: number
  altDescription: string | null
  attributionRequired: boolean
  attributionText: string
  licenseLabel: string
}

export interface StockMediaSearchResult {
  provider: StockMediaProviderName
  query: string
  items: StockMediaItem[]
  totalResults: number
  page: number
  perPage: number
}

export interface StockMediaSearchOptions {
  page?: number
  perPage?: number
  orientation?: 'landscape' | 'portrait' | 'square'
}

export interface StockMediaProvider {
  name: StockMediaProviderName
  search(query: string, options?: StockMediaSearchOptions): Promise<StockMediaSearchResult>
}
