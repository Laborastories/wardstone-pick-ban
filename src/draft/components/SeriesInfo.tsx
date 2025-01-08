import { Link } from 'wasp/client/router'
import { type Game, type Series } from 'wasp/entities'
import { Button } from '../../client/components/ui/button'
import { Trophy } from '@phosphor-icons/react'
import { useSocket } from 'wasp/client/webSocket'
import { getChampionImageUrl, getChampions } from '../services/championService'
import { useEffect } from 'react'

type SeriesInfoProps = {
  series: Series & {
    games: (Game & {
      actions: {
        type: string
        champion: string
      }[]
    })[]
  }
  currentGameNumber: number
  side?: 'team1' | 'team2'
}

export function SeriesInfo({ series, currentGameNumber, side }: SeriesInfoProps) {
  const { socket } = useSocket()

  // Load champion data on mount
  useEffect(() => {
    getChampions()
  }, [])

  if (!series?.games) {
    return null
  }

  // Find the current game in the series games array
  const currentGame = series.games.find(g => g.gameNumber === currentGameNumber)
  
  if (!currentGame) {
    return null
  }

  const team1Wins = series.games.filter(g => 
    (g.status === 'COMPLETED' && g.winner === 'BLUE' && g.blueSide === series.team1Name) || 
    (g.status === 'COMPLETED' && g.winner === 'RED' && g.redSide === series.team1Name)
  ).length

  const team2Wins = series.games.filter(g => 
    (g.status === 'COMPLETED' && g.winner === 'BLUE' && g.blueSide === series.team2Name) || 
    (g.status === 'COMPLETED' && g.winner === 'RED' && g.redSide === series.team2Name)
  ).length

  const gamesNeeded = series.format === 'BO5' ? 3 : series.format === 'BO3' ? 2 : 1

  const handleSetWinner = async (winner: 'BLUE' | 'RED') => {
    if (!socket || !currentGame) return
    socket.emit('setWinner', {
      gameId: currentGame.id,
      winner
    })
  }

  return (
    <div className='space-y-6 p-6 bg-card rounded-lg border border-border'>
      {/* Team Indicator - Always show if a team is selected */}
      {side && (
        <div className='text-sm font-medium text-primary text-center mb-4'>
          Playing as {side === 'team1' ? series.team1Name : series.team2Name}
        </div>
      )}

      {/* Header */}
      <div className='text-center'>
        <h2 className='text-xl font-bold mb-4'>{series.matchName}</h2>
        
        {/* Game Navigation */}
        <div className='flex justify-center gap-2 mb-4'>
          {series.games.map(game => (
            <Link
              key={game.id}
              to="/draft/:seriesId/:gameNumber/:team?/:auth?"
              params={{
                seriesId: series.id,
                gameNumber: game.gameNumber.toString(),
                team: side || '',
                auth: side ? (side === 'team1' ? series.team1AuthToken : series.team2AuthToken) : ''
              }}
              className={`
                px-4 py-2 rounded-lg font-medium transition-colors
                ${game.gameNumber === currentGameNumber
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
                }
              `}
            >
              Game {game.gameNumber}
            </Link>
          ))}
        </div>

        {/* Score Display */}
        <div className='flex items-center justify-center gap-8 text-xl font-bold'>
          <div className='flex-1 flex justify-end'>
            {series.team1Name}
          </div>
          <div className='min-w-[80px] px-6 py-2 bg-muted rounded-lg text-center shrink-0'>
            {team1Wins} - {team2Wins}
          </div>
          <div className='flex-1 flex justify-start'>
            {series.team2Name}
          </div>
        </div>
      </div>

      {/* Game Status - Only show if not completed */}
      {currentGame.status === 'PENDING' && (
        <div className='text-sm text-muted-foreground text-center'>
          {side ? `You are playing as ${side === 'team1' ? series.team1Name : series.team2Name}` : 'Spectating'}
        </div>
      )}

      {/* Draft Complete - Select Winner */}
      {currentGame.status === 'DRAFT_COMPLETE' && side && (
        <div className='space-y-4'>
          <div className='text-lg font-bold'>Draft Complete!</div>
          <div className='text-sm text-muted-foreground'>Select the winner:</div>
          <div className='flex gap-4'>
            <Button
              onClick={() => handleSetWinner('BLUE')}
              variant='outline'
              className='flex-1 text-blue-500 hover:text-blue-600'
            >
              {currentGame.blueSide} Wins
            </Button>
            <Button
              onClick={() => handleSetWinner('RED')}
              variant='outline'
              className='flex-1 text-red-500 hover:text-red-600'
            >
              {currentGame.redSide} Wins
            </Button>
          </div>
        </div>
      )}

      {currentGame.status === 'COMPLETED' && currentGame.winner && (
        <div className='space-y-4'>
          <div className='flex items-center gap-2 text-lg font-bold'>
            <Trophy weight='fill' className='text-yellow-500' />
            {currentGame.winner === 'BLUE' ? currentGame.blueSide : currentGame.redSide} wins!
          </div>
          {team1Wins < gamesNeeded && team2Wins < gamesNeeded && series.games.length > currentGameNumber && (
            <Link
              to="/draft/:seriesId/:gameNumber/:team?/:auth?"
              params={{
                seriesId: series.id,
                gameNumber: (currentGameNumber + 1).toString(),
                team: side || '',
                auth: side ? (side === 'team1' ? series.team1AuthToken : series.team2AuthToken) : ''
              }}
              className='inline-block'
            >
              <Button>Next Game</Button>
            </Link>
          )}
          {(team1Wins >= gamesNeeded || team2Wins >= gamesNeeded) && (
            <div className='text-lg font-bold'>
              Series Winner: {series.winner === 'BLUE' ? series.team1Name : series.team2Name}!
            </div>
          )}
        </div>
      )}

      {/* Previous Game Champions */}
      {currentGameNumber > 1 && series.fearlessDraft && (
        <div className='space-y-3'>
          <h3 className='text-sm font-medium text-muted-foreground'>
            Previously Picked Champions (Unavailable)
          </h3>
          <div className='grid grid-cols-10 gap-2'>
            {series.games
              .filter(g => g.gameNumber < currentGameNumber)
              .flatMap(g => g.actions)
              .filter(a => a.type === 'PICK')
              .filter((action, index, self) => 
                index === self.findIndex(a => a.champion === action.champion)
              )
              .sort((a, b) => a.champion.localeCompare(b.champion))
              .map(a => (
                <div
                  key={a.champion}
                  className='relative aspect-square w-full overflow-hidden rounded group'
                  title={a.champion}
                >
                  <img
                    src={getChampionImageUrl(a.champion)}
                    alt={a.champion}
                    className='w-full h-full object-cover rounded scale-[115%] grayscale'
                    loading='lazy'
                  />
                  <div className='absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center'>
                    <span className='text-[10px] font-medium text-white text-center px-0.5 leading-tight'>
                      {a.champion}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
} 
