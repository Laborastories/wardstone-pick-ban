import { getChampionsFromDb } from 'wasp/client/operations'
import { type Champion as ChampionEntity } from 'wasp/entities'

const COMMUNITY_DRAGON_URL =
  'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/'

let DDRAGON_VERSION = '15.1.1' // Fallback version

// Initialize DDragon version
fetch('https://ddragon.leagueoflegends.com/api/versions.json')
  .then(response => response.json())
  .then(versions => {
    DDRAGON_VERSION = versions[0]
  })
  .catch(error => {
    console.error('Failed to fetch DDragon version:', error)
  })

export type ChampionRole = 'top' | 'jungle' | 'mid' | 'bot' | 'support'
export interface Champion extends ChampionEntity {}

export async function getChampions(): Promise<Champion[]> {
  try {
    return await getChampionsFromDb()
  } catch (error) {
    console.error('Failed to fetch champions:', error)
    return []
  }
}

export function getChampionImageUrl(
  champion: Champion | string,
  type: 'icon' | 'splash' = 'icon',
): string {
  // For icons, just use DDragon with champion ID
  if (type === 'icon') {
    const championId = typeof champion === 'string' ? champion : champion.id
    const iconUrl = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${championId}.png`
    return iconUrl
  }

  // For splash art, we need the champion object with splashPath
  if (typeof champion === 'string') {
    console.warn(
      'String champion ID provided for splash art - need champion object with splashPath',
    )
    return ''
  }

  if (!champion.splashPath) {
    console.warn('No splashPath found in champion object:', champion)
    return ''
  }

  return `${COMMUNITY_DRAGON_URL}${champion.splashPath}`
}

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
