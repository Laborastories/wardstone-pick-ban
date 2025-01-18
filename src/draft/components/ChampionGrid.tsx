import { useState, useEffect } from 'react'
import { Input } from '../../client/components/ui/input'
import { MagnifyingGlass } from '@phosphor-icons/react'
import {
  type Champion,
  type ChampionRole,
  getChampions,
  filterChampions,
  getChampionImageUrl,
} from '../services/championService'
import { Button } from '../../client/components/ui/button'

// Track which splash arts have been prefetched
const prefetchedSplashArts = new Set<string>()

// Helper function to prefetch an image using link tags
const prefetchImage = (src: string) => {
  if (prefetchedSplashArts.has(src)) return

  // Create a link element for better browser prefetching
  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.as = 'image'
  link.href = src
  document.head.appendChild(link)

  prefetchedSplashArts.add(src)
}

export interface ChampionGridProps {
  onSelect: (champion: Champion) => void
  disabled?: boolean
  bannedChampions?: string[]
  usedChampions?: string[]
}

const POSITION_ICONS_BASE_URL =
  'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions'

const roleIcons: Record<ChampionRole, string> = {
  top: `${POSITION_ICONS_BASE_URL}/icon-position-top.png`,
  jungle: `${POSITION_ICONS_BASE_URL}/icon-position-jungle.png`,
  mid: `${POSITION_ICONS_BASE_URL}/icon-position-middle.png`,
  bot: `${POSITION_ICONS_BASE_URL}/icon-position-bottom.png`,
  support: `${POSITION_ICONS_BASE_URL}/icon-position-utility.png`,
}

export function ChampionGrid({
  onSelect,
  disabled = false,
  bannedChampions = [],
  usedChampions = [],
}: ChampionGridProps) {
  const [champions, setChampions] = useState<Champion[]>([])
  const [filteredChampions, setFilteredChampions] = useState<Champion[]>([])
  const [search, setSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState<ChampionRole | null>(null)

  // Cleanup prefetch links on unmount
  useEffect(() => {
    return () => {
      document
        .querySelectorAll('link[rel="prefetch"][as="image"]')
        .forEach(link => {
          link.remove()
        })
    }
  }, [])

  useEffect(() => {
    // Get champions from cache
    getChampions().then(data => {
      setChampions(data)
      setFilteredChampions(data)

      // Prefetch the first 10 champion splash arts
      data.slice(0, 10).forEach(champion => {
        prefetchImage(getChampionImageUrl(champion.id, 'splash'))
      })
    })
  }, [])

  useEffect(() => {
    let filtered = filterChampions(champions, search)
    if (selectedRole) {
      filtered = filtered.filter(champion =>
        champion.roles.includes(selectedRole),
      )
    }
    setFilteredChampions(filtered)
  }, [search, champions, selectedRole])

  return (
    <div className='flex h-full w-full flex-col rounded-md bg-muted p-2'>
      {/* Search and Filters */}
      <div className='flex items-center gap-2 p-2'>
        {/* Search */}
        <div className='relative'>
          <MagnifyingGlass
            className='absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground'
            size={14}
          />
          <Input
            type='text'
            placeholder='Search champions...'
            value={search}
            onChange={e => setSearch(e.target.value)}
            className='h-8 pl-7 text-sm'
          />
        </div>

        {/* Role Filter */}
        <div className='flex gap-2'>
          {Object.entries(roleIcons).map(([role, iconUrl]) => (
            <Button
              key={role}
              variant={selectedRole === role ? 'secondary' : 'ghost'}
              size='icon'
              className='h-8 w-8 p-1'
              onClick={() =>
                setSelectedRole(
                  selectedRole === role ? null : (role as ChampionRole),
                )
              }
            >
              <img
                src={iconUrl}
                alt={role}
                className={
                  selectedRole === role
                    ? 'brightness-125'
                    : 'opacity-75 hover:opacity-100'
                }
              />
            </Button>
          ))}
        </div>
      </div>

      {/* Grid Container */}
      <div className='flex min-h-0 overflow-y-auto p-2'>
        <div className='flex flex-wrap gap-2'>
          {filteredChampions.map(champion => {
            const isUsed = usedChampions.includes(champion.id)
            const isBanned = bannedChampions.includes(champion.id)
            const isDisabled = disabled || isUsed || isBanned
            return (
              <button
                key={champion.id}
                onClick={() => onSelect(champion)}
                onMouseEnter={() => {
                  prefetchImage(getChampionImageUrl(champion.id, 'splash'))
                }}
                disabled={isDisabled}
                className={`3xl:w-24 group relative flex aspect-square w-16 flex-col items-center justify-center rounded transition-colors hover:bg-accent xl:w-20 ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} `}
                title={`${champion.name}${isUsed ? ' (Already picked in this series)' : isBanned ? ' (Banned this game)' : ''}`}
              >
                <div className='relative h-full w-full overflow-hidden rounded'>
                  <img
                    src={getChampionImageUrl(champion)}
                    alt={champion.name}
                    className={`absolute inset-0 h-full w-full object-cover object-center ${isUsed ? 'grayscale' : isBanned ? 'brightness-50' : ''} `}
                    loading='lazy'
                  />
                  <div
                    className={`absolute inset-0 bg-black/50 ${isUsed || isBanned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} flex items-center justify-center rounded p-1 transition-opacity`}
                  >
                    <span>
                      {isUsed && (
                        <div className='champion-name text-[0.8rem] font-bold text-red-400'>
                          Already Picked
                        </div>
                      )}
                      {isBanned && (
                        <div className='champion-name text-[0.8rem] font-bold text-yellow-400'>
                          Banned
                        </div>
                      )}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
