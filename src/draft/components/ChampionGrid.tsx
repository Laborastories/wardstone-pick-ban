import { useState, useEffect } from 'react'
import { Input } from '../../client/components/ui/input'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { type Champion, getChampions, filterChampions } from '../services/championService'

interface ChampionGridProps {
  onSelect?: (champion: Champion) => void
  disabled?: boolean
}

export function ChampionGrid({ onSelect, disabled }: ChampionGridProps) {
  const [champions, setChampions] = useState<Champion[]>([])
  const [filteredChampions, setFilteredChampions] = useState<Champion[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadChampions() {
      const data = await getChampions()
      setChampions(data)
      setFilteredChampions(data)
      setIsLoading(false)
    }
    loadChampions()
  }, [])

  useEffect(() => {
    setFilteredChampions(filterChampions(champions, search))
  }, [search, champions])

  if (isLoading) {
    return (
      <div className='h-96 flex items-center justify-center'>
        <div className='text-muted-foreground'>Loading champions...</div>
      </div>
    )
  }

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
      <div className='grid grid-cols-8 gap-2 max-h-96 overflow-y-auto p-2'>
        {filteredChampions.map(champion => (
          <button
            key={champion.id}
            onClick={() => onSelect?.(champion)}
            disabled={disabled}
            className={`
              aspect-square p-1 rounded bg-card hover:bg-accent transition-colors
              flex flex-col items-center justify-center gap-1
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            title={champion.name}
          >
            <div className='text-xs font-medium truncate w-full text-center'>
              {champion.name}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
} 
