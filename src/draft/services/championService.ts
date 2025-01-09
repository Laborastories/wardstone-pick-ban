const DDRAGON_VERSION = '14.24.1'
const DDRAGON_LANG = 'en_US'
const DDRAGON_BASE_URL = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/data/${DDRAGON_LANG}`
const COMMUNITY_DRAGON_URL =
  'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default'

export interface Champion {
  id: string
  key: string // Champion numeric ID
  name: string
  image: {
    full: string
  }
  tags: string[]
  splashPath?: string
}

interface ChampionResponse {
  data: {
    [key: string]: Champion
  }
}

interface CommunityDragonChampion {
  id: number
  name: string
  alias: string
  skins: {
    id: number
    isBase: boolean
    splashPath: string
    uncenteredSplashPath: string
    loadScreenPath: string
  }[]
}

let championsCache: Champion[] | null = null
let splashPathCache: Record<string, string> = {}

export async function getChampions(): Promise<Champion[]> {
  if (championsCache) {
    return championsCache
  }

  try {
    const response = await fetch(`${DDRAGON_BASE_URL}/champion.json`)
    const data: ChampionResponse = await response.json()

    // Convert from object to array and sort by name
    championsCache = Object.values(data.data).sort((a, b) =>
      a.name.localeCompare(b.name),
    )

    // Fetch splash paths for each champion
    await Promise.all(
      championsCache.map(async champion => {
        try {
          const response = await fetch(
            `${COMMUNITY_DRAGON_URL}/v1/champions/${champion.key}.json`,
          )
          const data: CommunityDragonChampion = await response.json()
          const baseSkin = data.skins.find(skin => skin.isBase)
          if (baseSkin) {
            // Remove /lol-game-data/assets/ prefix and lowercase the path
            const path = baseSkin.splashPath
              .replace('/lol-game-data/assets/', '')
              .toLowerCase()
            splashPathCache[champion.id] = path
            champion.splashPath = path
          }
        } catch (error) {
          console.error(
            `Failed to fetch splash path for ${champion.name}:`,
            error,
          )
        }
      }),
    )

    return championsCache
  } catch (error) {
    console.error('Failed to fetch champions:', error)
    return []
  }
}

export function getChampionImageUrl(
  champion: Champion | string,
  type: 'icon' | 'splash' = 'icon',
): string {
  if (typeof champion === 'string') {
    // If splash art is requested
    if (type === 'splash') {
      const path = splashPathCache[champion]
      if (path) {
        return `${COMMUNITY_DRAGON_URL}/${path}`
      }
      // Fallback to icon if splash not found
    }

    // If just the champion ID is provided, find the champion in cache to get numeric key
    const championData = championsCache?.find(c => c.id === champion)
    if (championData) {
      return `${COMMUNITY_DRAGON_URL}/v1/champion-icons/${championData.key}.png`
    }
    // Fallback to using the champion name directly
    return `${COMMUNITY_DRAGON_URL}/v1/champion-icons/${champion}.png`
  }

  // If full champion object is provided
  if (type === 'splash' && champion.splashPath) {
    return `${COMMUNITY_DRAGON_URL}/${champion.splashPath}`
  }
  return `${COMMUNITY_DRAGON_URL}/v1/champion-icons/${champion.key}.png`
}

// Filter champions by search term (name or tag)
export function filterChampions(
  champions: Champion[],
  search: string,
): Champion[] {
  const searchLower = search.toLowerCase()
  return champions.filter(
    champion =>
      champion.name.toLowerCase().includes(searchLower) ||
      champion.tags.some(tag => tag.toLowerCase().includes(searchLower)),
  )
}
