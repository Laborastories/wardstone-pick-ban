import { Button } from '../../client/components/ui/button'
import { type Series } from 'wasp/entities'
import { useSocket } from 'wasp/client/webSocket'

interface SideSelectionProps {
  series: Series & {
    games: {
      gameNumber: number
      blueSide: string
      redSide: string
    }[]
  }
  gameNumber: number
  side?: 'team1' | 'team2'
}

export function SideSelection({ series, gameNumber, side }: SideSelectionProps) {
  const { socket } = useSocket()
  const currentGame = series.games.find(g => g.gameNumber === gameNumber)

  const handleSideSelect = (selectedSide: 'blue' | 'red') => {
    if (!socket) return
    socket.emit('selectSide', {
      seriesId: series.id,
      gameNumber,
      side: selectedSide,
      auth: side === 'team1' ? series.team1AuthToken : series.team2AuthToken
    })
  }

  // Determine which team the current user represents
  const isTeam1 = side === 'team1'
  const isTeam2 = side === 'team2'
  // Get the current team's name based on their team identity (team1/team2)
  const currentTeamName = isTeam1 ? series.team1Name : isTeam2 ? series.team2Name : null

  // Check if this team has selected a side
  const isSelectedBlue = currentGame && side !== undefined && (
    (isTeam1 && currentGame.blueSide === series.team1Name) || 
    (isTeam2 && currentGame.blueSide === series.team2Name)
  )
  const isSelectedRed = currentGame && side !== undefined && (
    (isTeam1 && currentGame.redSide === series.team1Name) || 
    (isTeam2 && currentGame.redSide === series.team2Name)
  )

  return (
    <div className='space-y-8 p-8 bg-card rounded-lg border border-border'>
      <div className='text-center space-y-2'>
        <h3 className='text-lg font-medium'>Select Side</h3>
        <p className='text-sm text-muted-foreground'>
          Game {gameNumber} - {currentTeamName ? `Select your side` : 'Waiting for team to select side'}
        </p>
      </div>

      {currentTeamName && (
        <div className='space-y-6'>
          <div className='text-center text-sm font-medium'>
            Playing as: {currentTeamName}
          </div>
          
          <div className='grid grid-cols-2 gap-4'>
            <Button
              variant='outline'
              size='lg'
              className={`py-8 relative flex-col gap-2 ${
                isSelectedBlue ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-background' : ''
              }`}
              onClick={() => handleSideSelect('blue')}
            >
              <div className='text-blue-500 font-medium'>Blue Side</div>
              <div className='text-sm text-muted-foreground'>Click to play on Blue Side</div>
            </Button>

            <Button
              variant='outline'
              size='lg'
              className={`py-8 relative flex-col gap-2 ${
                isSelectedRed ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-background' : ''
              }`}
              onClick={() => handleSideSelect('red')}
            >
              <div className='text-red-500 font-medium'>Red Side</div>
              <div className='text-sm text-muted-foreground'>Click to play on Red Side</div>
            </Button>
          </div>

          <div className='text-center text-sm text-muted-foreground'>
            You ({currentTeamName}) will play on {isSelectedBlue ? 'Blue' : isSelectedRed ? 'Red' : 'No'} Side
          </div>
        </div>
      )}

      {!currentTeamName && (
        <div className='text-center text-sm text-muted-foreground'>
          Spectating - Waiting for teams to select sides
        </div>
      )}
    </div>
  )
} 
