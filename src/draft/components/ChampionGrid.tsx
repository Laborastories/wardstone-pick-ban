import { useState, useEffect } from 'react'
import { Input } from '../../client/components/ui/input'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { type Champion, getChampions, filterChampions, getChampionImageUrl } from '../services/championService'

interface ChampionGridProps {
  onSelect?: (champion: Champion) => void
  disabled?: boolean
  usedChampions?: string[] // Array of champion IDs that are already used
}

export function ChampionGrid({ onSelect, disabled, usedChampions = [] }: ChampionGridProps) {
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
    <div className='space-y-4'>
      {/* Search */}
      <div className='relative'>
        <MagnifyingGlass className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground' size={16} />
        <Input
          type='text'
          placeholder='Search champions...'
          value={search}
          onChange={e => setSearch(e.target.value)}
          className='pl-9'
        />
      </div>

      {/* Grid */}
      <div className='grid grid-cols-12 gap-3 max-h-96 overflow-y-auto p-1'>
        {filteredChampions.map(champion => {
          const isUsed = usedChampions.includes(champion.id)
          return (
            <button
              key={champion.id}
              onClick={() => onSelect?.(champion)}
              disabled={disabled || isUsed}
              className={`
                aspect-square rounded hover:bg-accent transition-colors
                flex flex-col items-center justify-center group relative
                ${(disabled || isUsed) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              title={`${champion.name}${isUsed ? ' (Already used)' : ''}`}
            >
              <div className='relative aspect-square w-full overflow-hidden rounded'>
                <img
                  src={getChampionImageUrl(champion)}
                  alt={champion.name}
                  className='w-full h-full object-cover rounded scale-[115%]'
                  loading='lazy'
                />
                <div className='absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center'>
                  <span className='text-[10px] font-medium text-white text-center px-0.5 leading-tight'>
                    {champion.name}
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
