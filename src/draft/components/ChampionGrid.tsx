import { useState, useEffect } from 'react'
import { Input } from '../../client/components/ui/input'
import { MagnifyingGlass } from '@phosphor-icons/react'
import {
  type Champion,
  getChampions,
  filterChampions,
  getChampionImageUrl,
} from '../services/championService'

export interface ChampionGridProps {
  onSelect: (champion: Champion) => void
  disabled?: boolean
  bannedChampions?: string[]
  usedChampions?: string[]
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

  useEffect(() => {
    // Get champions from cache
    getChampions().then(data => {
      setChampions(data)
      setFilteredChampions(data)
    })
  }, [])

  useEffect(() => {
    setFilteredChampions(filterChampions(champions, search))
  }, [search, champions])

  return (
    <div className='flex h-full flex-col space-y-2'>
      {/* Search */}
      <div className='relative flex-none'>
        <MagnifyingGlass
          className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'
          size={16}
        />
        <Input
          type='text'
          placeholder='Search champions...'
          value={search}
          onChange={e => setSearch(e.target.value)}
          className='h-8 pl-9 text-sm'
        />
      </div>

      {/* Grid */}
      <div className='grid min-h-0 flex-1 grid-cols-12 gap-4 overflow-y-auto p-1'>
        {filteredChampions.map(champion => {
          const isUsed = usedChampions.includes(champion.id)
          const isBanned = bannedChampions.includes(champion.id)
          const isDisabled = disabled || isUsed || isBanned
          return (
            <button
              key={champion.id}
              onClick={() => onSelect(champion)}
              disabled={isDisabled}
              className={`group relative flex h-16 w-16 flex-col items-center justify-center rounded transition-colors hover:bg-accent ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} `}
              title={`${champion.name}${isUsed ? ' (Already picked in this series)' : isBanned ? ' (Banned this game)' : ''}`}
            >
              <div className='relative aspect-square h-full w-full overflow-hidden rounded'>
                <img
                  src={getChampionImageUrl(champion)}
                  alt={champion.name}
                  className={`absolute inset-0 h-full w-full scale-[115%] rounded object-cover ${isUsed ? 'grayscale' : isBanned ? 'brightness-50' : ''} `}
                  loading='lazy'
                />
                <div
                  className={`absolute inset-0 bg-black/50 ${isUsed || isBanned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} flex items-center justify-center rounded p-1 transition-opacity`}
                >
                  <span className='text-center text-[10px] font-medium leading-tight text-white'>
                    {champion.name}
                    {isUsed && (
                      <div className='text-[9px] text-red-400'>
                        Already Picked
                      </div>
                    )}
                    {isBanned && (
                      <div className='text-[9px] text-yellow-400'>Banned</div>
                    )}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
