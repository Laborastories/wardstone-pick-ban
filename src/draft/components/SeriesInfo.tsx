import { type Series, type Game } from 'wasp/entities'
import { cn } from '../../lib/utils'
import { Button } from '../../client/components/ui/button'
import { Copy } from '@phosphor-icons/react'
import { useToast } from '../../hooks/use-toast'
import { useSocket } from 'wasp/client/webSocket'
import { Link } from 'wasp/client/router'

interface SeriesInfoProps {
  series: Series & {
    games: (Game & {
      actions: {
        type: string
        champion: string
        team: 'BLUE' | 'RED'
        position: number
      }[]
    })[]
  }
  currentGameNumber: number
  side?: 'team1' | 'team2'
  gameStatus?: string
  blueSide?: string
  redSide?: string
  gameId?: string
}

export function SeriesInfo({ 
  series, 
  currentGameNumber, 
  side,
  gameStatus,
  blueSide,
  redSide,
  gameId
}: SeriesInfoProps) {
  const { toast } = useToast()
  const { socket } = useSocket()
  
  const team1Wins = series.games.filter(game => {
    if (game.status !== 'COMPLETED') return false
    return (game.winner === 'BLUE' && game.blueSide === series.team1Name) ||
           (game.winner === 'RED' && game.redSide === series.team1Name)
  }).length

  const team2Wins = series.games.filter(game => {
    if (game.status !== 'COMPLETED') return false
    return (game.winner === 'BLUE' && game.blueSide === series.team2Name) ||
           (game.winner === 'RED' && game.redSide === series.team2Name)
  }).length

  const gamesNeeded = series.format === 'BO5' ? 3 : series.format === 'BO3' ? 2 : 1
  const isSeriesOver = team1Wins >= gamesNeeded || team2Wins >= gamesNeeded

  const handleCopyUrl = () => {
    const baseUrl = window.location.origin
    const urls = `${series.team1Name}:
${baseUrl}/draft/${series.id}/${currentGameNumber}/team1/${series.team1AuthToken}

${series.team2Name}:
${baseUrl}/draft/${series.id}/${currentGameNumber}/team2/${series.team2AuthToken}

Spectator URL:
${baseUrl}/draft/${series.id}/${currentGameNumber}`

    navigator.clipboard.writeText(urls).then(() => {
      toast({
        title: 'URLs Copied',
        description: 'All draft URLs have been copied to your clipboard.',
      })
    })
  }

  const handleSetWinner = async (winner: 'BLUE' | 'RED') => {
    if (!socket || !gameId) return
    socket.emit('setWinner', {
      gameId,
      winner,
    })
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex h-16 items-center justify-between rounded-lg bg-card px-6 shadow'>
        <div className='flex-1' />
        <div className='flex flex-col items-center gap-2'>
          <div className='flex items-center gap-8'>
            {/* Team 1 */}
            <div
              className={cn(
                'text-lg font-semibold',
                side === 'team1' && 'text-primary',
              )}
            >
              {series.team1Name}
            </div>

            {/* Score */}
            <div className='flex items-center gap-2 text-xl font-bold'>
              <span
                className={cn(
                  'min-w-[1.5ch] text-center',
                  team1Wins > team2Wins && 'text-primary',
                )}
              >
                {team1Wins}
              </span>
              <span className='text-muted-foreground'>-</span>
              <span
                className={cn(
                  'min-w-[1.5ch] text-center',
                  team2Wins > team1Wins && 'text-primary',
                )}
              >
                {team2Wins}
              </span>
            </div>

            {/* Team 2 */}
            <div
              className={cn(
                'text-lg font-semibold',
                side === 'team2' && 'text-primary',
              )}
            >
              {series.team2Name}
            </div>
          </div>

          {/* Game Navigation */}
          <div className='flex gap-2'>
            {Array.from({
              length: series.format === 'BO5' ? 5 : series.format === 'BO3' ? 3 : 1,
            }).map((_, i) => {
              const gameNum = i + 1
              const isCurrentGame = gameNum === currentGameNumber
              const isPreviousGame = gameNum < currentGameNumber
              const game = series.games.find(g => g.gameNumber === gameNum)
              const isNextGame = !isSeriesOver && gameNum === Math.max(...series.games.filter(g => g.status === 'COMPLETED').map(g => g.gameNumber)) + 1
              const isDisabled = !isCurrentGame && !isNextGame && !game?.status && (isSeriesOver || (!isPreviousGame && !isCurrentGame))

              return (
                <Link
                  key={gameNum}
                  to='/draft/:seriesId/:gameNumber/:team?/:auth?'
                  params={{
                    seriesId: series.id,
                    gameNumber: gameNum.toString(),
                    team: side || '',
                    auth: side ? side === 'team1' ? series.team1AuthToken : series.team2AuthToken : '',
                  }}
                  className={cn(
                    'rounded px-3 py-1 text-sm transition-colors',
                    isCurrentGame ? 'bg-accent text-accent-foreground' : 
                    isNextGame ? 'animate-pulse bg-accent text-accent-foreground' :
                    isDisabled ? 'cursor-not-allowed text-muted-foreground opacity-50' :
                    'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    game?.status === 'COMPLETED' && !isCurrentGame && 'ring-2 ring-accent'
                  )}
                  onClick={e => {
                    if (isDisabled) {
                      e.preventDefault()
                    }
                  }}
                >
                  Game {gameNum}
                  {game?.status === 'COMPLETED' && (
                    <div className='mt-0.5 text-xs opacity-75'>
                      {game.winner === 'BLUE' ? game.blueSide : game.redSide}
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        <div className='flex flex-1 items-center justify-end gap-4'>
          {/* Copy URL Button */}
          <Button
            variant='ghost'
            size='icon'
            onClick={handleCopyUrl}
            className='h-8 w-8'
            title='Copy all draft URLs'
          >
            <Copy className='h-4 w-4' />
          </Button>
        </div>
      </div>

      {/* Winner Selection */}
      {gameStatus === 'DRAFT_COMPLETE' && side && (
        <div className='flex flex-col items-center gap-2 rounded-lg bg-card px-6 py-4 shadow'>
          <div className='text-sm font-medium text-muted-foreground'>
            Select the winner:
          </div>
          <div className='flex gap-4'>
            <button
              onClick={() => handleSetWinner('BLUE')}
              className='rounded-lg bg-[hsl(var(--team-blue))] px-6 py-2 text-sm transition-transform hover:scale-[1.02]'
            >
              <div className='font-medium text-[hsl(var(--team-blue-foreground))]'>
                {blueSide} Wins
              </div>
            </button>
            <button
              onClick={() => handleSetWinner('RED')}
              className='rounded-lg bg-[hsl(var(--team-red))] px-6 py-2 text-sm transition-transform hover:scale-[1.02]'
            >
              <div className='font-medium text-[hsl(var(--team-red-foreground))]'>
                {redSide} Wins
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
