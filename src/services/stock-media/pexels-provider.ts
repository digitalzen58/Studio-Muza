import type {
  StockMediaProvider,
  StockMediaSearchResult,
  StockMediaSearchOptions,
  StockMediaItem,
} from './types'

interface PexelsPhotoSource {
  original: string
  large2x: string
  large: string
  medium: string
  small: string
  portrait: string
  landscape: string
  tiny: string
}

interface PexelsPhoto {
  id: number
  width: number
  height: number
  url: string
  photographer: string
  photographer_url: string
  photographer_id: number
  avg_color: string
  src: PexelsPhotoSource
  liked: boolean
  alt: string
}

interface PexelsSearchResponse {
  total_results: number
  page: number
  per_page: number
  photos: PexelsPhoto[]
  next_page?: string
}

export class PexelsStockMediaProvider implements StockMediaProvider {
  readonly name = 'PEXELS' as const

  async search(
    query: string,
    options?: StockMediaSearchOptions
  ): Promise<StockMediaSearchResult> {
    const apiKey = process.env.PEXELS_API_KEY?.trim()

    if (!apiKey) {
      throw new Error(
        'La clé API Pexels n’est pas configurée (PEXELS_API_KEY manquante dans l’environnement).'
      )
    }

    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      return {
        provider: this.name,
        query: '',
        items: [],
        totalResults: 0,
        page: 1,
        perPage: options?.perPage || 15,
      }
    }

    const page = options?.page && options.page > 0 ? options.page : 1
    const perPage = options?.perPage && options.perPage > 0 ? Math.min(options.perPage, 30) : 15

    const url = new URL('https://api.pexels.com/v1/search')
    url.searchParams.set('query', trimmedQuery)
    url.searchParams.set('page', String(page))
    url.searchParams.set('per_page', String(perPage))
    if (options?.orientation) {
      url.searchParams.set('orientation', options.orientation)
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: apiKey,
        Accept: 'application/json',
      },
      next: { revalidate: 3600 }, // Cache search results for 1 hour
    })

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Clé API Pexels invalide ou non autorisée.')
      }
      if (response.status === 429) {
        throw new Error(
          'La limite de requêtes vers Pexels a été atteinte. Veuillez réessayer dans quelques minutes.'
        )
      }
      throw new Error(
        `Erreur lors de la recherche Pexels (statut HTTP ${response.status}).`
      )
    }

    const data = (await response.json()) as PexelsSearchResponse

    const items: StockMediaItem[] = (data.photos || []).map((photo) => {
      // Pick best resolution for preview (medium: 350px width) and download (large: up to 940px / 650px)
      const previewUrl = photo.src.medium || photo.src.small || photo.src.portrait || photo.src.original
      const downloadUrl = photo.src.large || photo.src.large2x || photo.src.original

      const creatorName = photo.photographer || 'Photographe Pexels'
      const creatorUrl = photo.photographer_url || 'https://www.pexels.com'
      const sourceUrl = photo.url || `https://www.pexels.com/photo/${photo.id}/`

      return {
        provider: this.name,
        externalId: String(photo.id),
        previewUrl,
        sourceUrl,
        downloadUrl,
        creatorName,
        creatorUrl,
        width: photo.width,
        height: photo.height,
        altDescription: photo.alt || null,
        attributionRequired: true,
        attributionText: `Photo par ${creatorName} sur Pexels`,
        licenseLabel: 'Licence Pexels (Libre d’utilisation)',
      }
    })

    return {
      provider: this.name,
      query: trimmedQuery,
      items,
      totalResults: data.total_results || items.length,
      page: data.page || page,
      perPage: data.per_page || perPage,
    }
  }
}
