import { configureQueryClient } from 'wasp/client/operations'
import { getChampions } from '../draft/services/championService'

export async function setupClient(): Promise<void> {
  // Configure query client
  configureQueryClient({
    defaultOptions: {
      queries: {
        cacheTime: 1000 * 60 * 2, // 2 minutes
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 1000 * 60, // 1 minute
      },
    },
  })

  // Prefetch champions on app start
  try {
    await getChampions()
  } catch (error) {
    console.error('Failed to prefetch champions:', error)
  }
}

export default setupClient
