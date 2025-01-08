const DDRAGON_VERSION = '14.24.1'
const DDRAGON_LANG = 'en_US'
const DDRAGON_BASE_URL = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/data/${DDRAGON_LANG}`
const COMMUNITY_DRAGON_URL = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons'

export interface Champion {
  id: string
  key: string // Champion numeric ID
  name: string
  image: {
    full: string
  }
  tags: string[]
}

interface ChampionResponse {
  data: {
    [key: string]: Champion
  }
}

let championsCache: Champion[] | null = null

export async function getChampions(): Promise<Champion[]> {
  if (championsCache) {
    return championsCache
  }

  try {
    const response = await fetch(`${DDRAGON_BASE_URL}/champion.json`)
    const data: ChampionResponse = await response.json()
    
    // Convert from object to array and sort by name
    championsCache = Object.values(data.data).sort((a, b) => a.name.localeCompare(b.name))
    return championsCache
  } catch (error) {
    console.error('Failed to fetch champions:', error)
    return []
  }
}

export function getChampionImageUrl(champion: Champion): string {
  return `${COMMUNITY_DRAGON_URL}/${champion.key}.png`
}

// Filter champions by search term (name or tag)
export function filterChampions(champions: Champion[], search: string): Champion[] {
  const searchLower = search.toLowerCase()
  return champions.filter(champion => 
    champion.name.toLowerCase().includes(searchLower) ||
    champion.tags.some(tag => tag.toLowerCase().includes(searchLower))
  )
} 
