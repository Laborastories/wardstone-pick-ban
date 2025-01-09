import { useSocket } from 'wasp/client/webSocket'
import { type Series } from 'wasp/entities'

type SideSelectionProps = {
  series: Series
  gameNumber: number
  side?: 'team1' | 'team2'
}

export function SideSelection({ series, gameNumber, side }: SideSelectionProps) {
  const { socket } = useSocket()

  const handleSideSelect = (selectedSide: 'blue' | 'red') => {
    if (!socket) return
    socket.emit('selectSide', {
      seriesId: series.id,
      gameNumber,
      side: selectedSide,
      auth: side === 'team1' ? series.team1AuthToken : series.team2AuthToken
    })
  }

  return (
    <div className='space-y-6'>
      <h3 className='text-lg font-medium text-center'>Select Side</h3>
      <div className='grid grid-cols-2 gap-4'>
        <button
          onClick={() => handleSideSelect('blue')}
          className='p-6 rounded-lg bg-[hsl(var(--team-blue))] hover:scale-[1.02] transition-transform'
        >
          <div className='text-[hsl(var(--team-blue-foreground))] font-medium'>Blue Side</div>
          <div className='text-sm text-[hsl(var(--team-blue-foreground))/0.8]'>Click to play on Blue Side</div>
        </button>
        <button
          onClick={() => handleSideSelect('red')}
          className='p-6 rounded-lg bg-[hsl(var(--team-red))] hover:scale-[1.02] transition-transform'
        >
          <div className='text-[hsl(var(--team-red-foreground))] font-medium'>Red Side</div>
          <div className='text-sm text-[hsl(var(--team-red-foreground))/0.8]'>Click to play on Red Side</div>
        </button>
      </div>
    </div>
  )
} 
