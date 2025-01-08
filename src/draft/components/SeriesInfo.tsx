import { Link } from 'wasp/client/router'
import { type Game, type Series } from 'wasp/entities'
import { Button } from '../../client/components/ui/button'
import { Trophy } from '@phosphor-icons/react'
import { useSocket } from 'wasp/client/webSocket'

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
  side?: 'blue' | 'red'
}

export function SeriesInfo({ series, currentGameNumber, side }: SeriesInfoProps) {
  const { socket } = useSocket()

  console.log('SeriesInfo props:', { 
    series, 
    currentGameNumber, 
    side,
    seriesGames: series?.games?.length,
    currentGameStatus: series?.games?.find(g => g.gameNumber === currentGameNumber)?.status
  })

  if (!series?.games) {
    console.log('No series or games')
    return null
  }

  // Find the current game in the series games array
  const currentGame = series.games.find(g => g.gameNumber === currentGameNumber)
  
  if (!currentGame) {
    console.log('No current game found')
    return null
  }

  console.log('Current game:', { 
    gameNumber: currentGame.gameNumber,
    status: currentGame.status,
    side,
    shouldShowWinner: currentGame.status === 'DRAFT_COMPLETE' && side,
    actions: currentGame.actions?.length
  })

  const blueWins = series.games.filter(g => g.winner === 'BLUE').length
  const redWins = series.games.filter(g => g.winner === 'RED').length
  const gamesNeeded = series.format === 'BO5' ? 3 : series.format === 'BO3' ? 2 : 1

  const handleSetWinner = async (winner: 'BLUE' | 'RED') => {
    if (!socket || !currentGame) return

    console.log('Setting winner:', { gameId: currentGame.id, winner })
    socket.emit('setWinner', {
      gameId: currentGame.id,
      winner
    })
  }

  return (
    <div className='space-y-6 p-4 bg-card rounded-lg border border-border'>
      <div className='flex items-center justify-between'>
        <h2 className='text-xl font-bold'>{series.matchName}</h2>
        <div className='text-2xl font-bold'>
          <span className='text-blue-500'>{blueWins}</span>
          <span className='mx-2'>-</span>
          <span className='text-red-500'>{redWins}</span>
        </div>
      </div>

      {/* Game Navigation */}
      <div className='flex gap-2'>
        {series.games.map(game => (
          <Link
            key={game.id}
            to="/draft/:seriesId/:gameNumber/:side/:auth?"
            params={{
              seriesId: series.id,
              gameNumber: game.gameNumber.toString(),
              side: side || '',
              auth: side ? (side === 'blue' ? series.blueAuthToken : series.redAuthToken) : ''
            }}
            className={`
              px-4 py-2 rounded-lg font-medium
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

      {/* Game Status */}
      {currentGame.status === 'PENDING' && (
        <div className='space-y-4'>
          <div className='text-sm text-muted-foreground'>
            <div>Blue Side: {currentGame.blueSide}</div>
            <div>Red Side: {currentGame.redSide}</div>
          </div>
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
          {blueWins < gamesNeeded && redWins < gamesNeeded && series.games.length > currentGameNumber && (
            <Link
              to="/draft/:seriesId/:gameNumber/:side/:auth?"
              params={{
                seriesId: series.id,
                gameNumber: (currentGameNumber + 1).toString(),
                side: side || '',
                auth: side ? (side === 'blue' ? series.blueAuthToken : series.redAuthToken) : ''
              }}
              className='inline-block'
            >
              <Button>Next Game</Button>
            </Link>
          )}
          {(blueWins >= gamesNeeded || redWins >= gamesNeeded) && (
            <div className='text-lg font-bold'>
              Series Winner: {series.winner === 'BLUE' ? series.blueTeamName : series.redTeamName}!
            </div>
          )}
        </div>
      )}

      {/* Previous Game Champions */}
      {series.fearlessDraft && currentGame.status === 'PENDING' && currentGameNumber > 1 && (
        <div className='space-y-2'>
          <h3 className='text-sm font-medium text-muted-foreground'>
            Previously Picked Champions (Unavailable)
          </h3>
          <div className='flex flex-wrap gap-2'>
            {series.games
              .filter(g => g.gameNumber < currentGameNumber)
              .flatMap(g => g.actions)
              .filter(a => a.type === 'PICK')
              .map(a => (
                <div
                  key={a.champion}
                  className='px-2 py-1 text-sm bg-muted rounded'
                >
                  {a.champion}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
} 
