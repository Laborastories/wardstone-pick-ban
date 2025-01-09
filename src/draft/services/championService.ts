const DDRAGON_LANG = 'en_US'
const COMMUNITY_DRAGON_URL =
  'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default'

let DDRAGON_VERSION: string | null = null
let DDRAGON_BASE_URL: string | null = null

async function initDDragon() {
  if (DDRAGON_VERSION) return

  try {
    const response = await fetch(
      'https://ddragon.leagueoflegends.com/api/versions.json',
    )
    const versions = await response.json()
    DDRAGON_VERSION = versions[0] // Get latest version
    DDRAGON_BASE_URL = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/data/${DDRAGON_LANG}`
  } catch (error) {
    console.error('Failed to fetch DDragon version:', error)
    // Fallback to a known version if fetch fails
    DDRAGON_VERSION = '15.1.1'
    DDRAGON_BASE_URL = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/data/${DDRAGON_LANG}`
  }
}

export type ChampionRole = 'top' | 'jungle' | 'mid' | 'bot' | 'support'

export interface Champion {
  id: string
  key: string // Champion numeric ID
  name: string
  image: {
    full: string
  }
  tags: string[]
  splashPath?: string
  roles: ChampionRole[]
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

// Temporary function to help generate role mappings
// export async function printChampionList() {
//   try {
//     await initDDragon()
//     const response = await fetch(`${DDRAGON_BASE_URL}/champion.json`)
//     const data: ChampionResponse = await response.json()

//     // Sort champions by name and format them for role mapping
//     const champions = Object.values(data.data)
//       .sort((a, b) => a.name.localeCompare(b.name))
//       .map(champion => `  '${champion.id}': [],`)
//       .join('\n')

//     console.log('// Champion role mappings')
//     console.log('const championRoles: Record<string, ChampionRole[]> = {')
//     console.log(champions)
//     console.log('}')
//   } catch (error) {
//     console.error('Failed to fetch champions:', error)
//   }
// }

// // Call this once to get the list
// printChampionList()

// Champion role mappings
const championRoles: Record<string, ChampionRole[]> = {
  Aatrox: ['top'],
  Ahri: ['mid'],
  Akali: ['top', 'mid'],
  Akshan: ['top', 'mid'],
  Alistar: ['support'],
  Ambessa: ['top', 'jungle'],
  Amumu: ['jungle'],
  Anivia: ['mid', 'bot'],
  Annie: ['mid'],
  Aphelios: ['bot'],
  Ashe: ['bot', 'support'],
  AurelionSol: ['mid'],
  Aurora: ['top', 'mid'],
  Azir: ['mid'],
  Bard: ['support'],
  Belveth: ['jungle'],
  Blitzcrank: ['support'],
  Brand: ['mid', 'bot', 'support'],
  Braum: ['support'],
  Briar: ['jungle'],
  Caitlyn: ['bot'],
  Camille: ['top', 'support'],
  Cassiopeia: ['top', 'mid'],
  Chogath: ['top'],
  Corki: ['mid', 'bot'],
  Darius: ['top', 'jungle'],
  Diana: ['jungle'],
  DrMundo: ['top', 'jungle'],
  Draven: ['bot'],
  Ekko: ['jungle', 'mid'],
  Elise: ['jungle'],
  Evelynn: ['jungle'],
  Ezreal: ['bot'],
  Fiddlesticks: ['jungle', 'support'],
  Fiora: ['top'],
  Fizz: ['mid'],
  Galio: ['mid'],
  Gangplank: ['top'],
  Garen: ['top', 'mid'],
  Gnar: ['top'],
  Gragas: ['top', 'jungle'],
  Graves: ['jungle'],
  Gwen: ['top'],
  Hecarim: ['jungle'],
  Heimerdinger: ['mid'],
  Hwei: ['mid'],
  Illaoi: ['top'],
  Irelia: ['top', 'mid'],
  Ivern: ['jungle'],
  Janna: ['support'],
  JarvanIV: ['jungle'],
  Jax: ['top'],
  Jayce: ['top'],
  Jhin: ['bot'],
  Jinx: ['bot'],
  KSante: ['top'],
  Kaisa: ['bot'],
  Kalista: ['bot'],
  Karma: ['support'],
  Karthus: ['jungle'],
  Kassadin: ['mid'],
  Katarina: ['mid'],
  Kayle: ['top'],
  Kayn: ['jungle'],
  Kennen: ['top'],
  Khazix: ['jungle'],
  Kindred: ['jungle'],
  Kled: ['top'],
  KogMaw: ['bot'],
  Leblanc: ['mid'],
  LeeSin: ['jungle'],
  Leona: ['support'],
  Lillia: ['jungle'],
  Lissandra: ['mid'],
  Lucian: ['bot'],
  Lulu: ['support'],
  Lux: ['support', 'mid'],
  Malphite: ['top'],
  Malzahar: ['mid'],
  Maokai: ['top', 'jungle', 'support'],
  MasterYi: ['jungle'],
  Milio: ['support'],
  MissFortune: ['bot'],
  Mordekaiser: ['top'],
  Morgana: ['support'],
  Naafiri: ['mid'],
  Nami: ['support'],
  Nasus: ['top'],
  Nautilus: ['support'],
  Neeko: ['mid'],
  Nidalee: ['jungle'],
  Nilah: ['bot'],
  Nocturne: ['jungle'],
  Nunu: ['jungle'],
  Olaf: ['top'],
  Orianna: ['mid'],
  Ornn: ['top'],
  Pantheon: ['support'],
  Poppy: ['top'],
  Pyke: ['support'],
  Qiyana: ['mid'],
  Quinn: ['top'],
  Rakan: ['support'],
  Rammus: ['jungle'],
  RekSai: ['jungle'],
  Rell: ['support'],
  Renata: ['support'],
  Renekton: ['top'],
  Rengar: ['jungle'],
  Riven: ['top'],
  Rumble: ['top'],
  Ryze: ['mid'],
  Samira: ['bot'],
  Sejuani: ['jungle'],
  Senna: ['support'],
  Seraphine: ['support'],
  Sett: ['top'],
  Shaco: ['jungle'],
  Shen: ['top'],
  Shyvana: ['jungle'],
  Singed: ['top'],
  Sion: ['top'],
  Sivir: ['bot'],
  Skarner: ['jungle'],
  Smolder: ['bot'],
  Sona: ['support'],
  Soraka: ['support'],
  Swain: ['mid'],
  Sylas: ['mid'],
  Syndra: ['mid'],
  TahmKench: ['support'],
  Taliyah: ['jungle'],
  Talon: ['mid'],
  Taric: ['support'],
  Teemo: ['top'],
  Thresh: ['support'],
  Tristana: ['bot'],
  Trundle: ['top'],
  Tryndamere: ['top'],
  TwistedFate: ['mid'],
  Twitch: ['bot'],
  Udyr: ['jungle'],
  Urgot: ['top'],
  Varus: ['bot'],
  Vayne: ['bot'],
  Veigar: ['mid'],
  Velkoz: ['support'],
  Vex: ['mid'],
  Vi: ['jungle'],
  Viego: ['jungle'],
  Viktor: ['mid'],
  Vladimir: ['mid'],
  Volibear: ['top', 'jungle'],
  Warwick: ['top', 'jungle'],
  MonkeyKing: ['jungle'],
  Xayah: ['bot'],
  Xerath: ['support'],
  XinZhao: ['jungle'],
  Yasuo: ['mid'],
  Yone: ['mid'],
  Yorick: ['top'],
  Yuumi: ['support'],
  Zac: ['jungle'],
  Zed: ['mid'],
  Zeri: ['bot'],
  Ziggs: ['mid'],
  Zilean: ['support'],
  Zoe: ['mid'],
  Zyra: ['support'],
}

// Fallback role mapping from DDragon tags to our roles
function getDefaultRolesFromTags(tags: string[]): ChampionRole[] {
  const roles: ChampionRole[] = []

  if (tags.includes('Marksman')) {
    roles.push('bot')
  }
  if (tags.includes('Support')) {
    roles.push('support')
  }
  if (tags.includes('Tank') && !roles.length) {
    roles.push('top')
  }
  if (tags.includes('Fighter') && !roles.length) {
    roles.push('top')
  }
  if (tags.includes('Assassin') && !roles.length) {
    roles.push('mid')
  }
  if (tags.includes('Mage') && !roles.length) {
    roles.push('mid')
  }

  // If we still have no roles, default to mid
  if (!roles.length) {
    roles.push('mid')
  }

  return roles
}

export async function getChampions(): Promise<Champion[]> {
  if (championsCache) {
    return championsCache
  }

  await initDDragon()

  try {
    const response = await fetch(`${DDRAGON_BASE_URL}/champion.json`)
    const data: ChampionResponse = await response.json()

    // Convert from object to array and sort by name
    championsCache = Object.values(data.data)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(champion => {
        const explicitRoles = championRoles[champion.id]
        if (!explicitRoles) {
          const fallbackRoles = getDefaultRolesFromTags(champion.tags)
          // Try multiple console methods to ensure visibility
          console.error('🚨 MISSING ROLES 🚨')
          console.error('================')
          console.error(`Champion: ${champion.name} (${champion.id})`)
          console.error(`Tags: ${champion.tags.join(', ')}`)
          console.error(`Fallback roles: ${fallbackRoles.join(', ')}`)
          console.error('================')
          return {
            ...champion,
            roles: fallbackRoles,
          }
        }
        return {
          ...champion,
          roles: explicitRoles,
        }
      })

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
