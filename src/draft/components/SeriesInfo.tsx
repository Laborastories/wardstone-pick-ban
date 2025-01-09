import { useSocket } from 'wasp/client/webSocket'
import { type Series, type Game } from 'wasp/entities'
import { Crown, CaretDown, Copy } from '@phosphor-icons/react'
import { Link } from 'wasp/client/router'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { getChampions, getChampionImageUrl } from '../services/championService'
import { Button } from '../../client/components/ui/button'
import { useToast } from '../../hooks/use-toast'

type SeriesInfoProps = {
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
}

export function SeriesInfo({ series, currentGameNumber, side }: SeriesInfoProps) {
  const { socket } = useSocket()
  const [showPreviousGames, setShowPreviousGames] = useState(false)
  const { toast } = useToast()

  // Load champion data on mount
  useEffect(() => {
    getChampions()
  }, [])

  const handleCopyUrls = () => {
    const baseUrl = window.location.origin
    const urls = `${series.team1Name}:
${baseUrl}/draft/${series.id}/1/team1/${series.team1AuthToken}

${series.team2Name}:
${baseUrl}/draft/${series.id}/1/team2/${series.team2AuthToken}

Spectator URL:
${baseUrl}/draft/${series.id}/1`

    navigator.clipboard.writeText(urls).then(() => {
      toast({
        title: "URLs Copied",
        description: "All draft URLs have been copied to your clipboard."
      })
    })
  }

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
    <div className='space-y-8 p-6 bg-card rounded-lg border border-border max-w-4xl mx-auto'>
      {/* Series Header */}
      <div className='space-y-4'>
        {/* Match Name and Score */}
        <div className='relative'>
          <div className='absolute right-0 top-0'>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopyUrls}
              className='h-8 w-8'
            >
              <Copy size={14} />
            </Button>
          </div>
          <div className='flex items-center justify-center gap-8 text-xl'>
            <div className='w-[200px] flex justify-end'>
              <div className='flex items-center gap-2'>
                <motion.span 
                  className={`font-bold uppercase tracking-wider ${
                    team1Wins >= gamesNeeded 
                      ? 'text-[hsl(var(--team-blue))] opacity-100' 
                      : 'text-[hsl(var(--team-blue))] opacity-90'
                  }`}
                  animate={team1Wins >= gamesNeeded ? {
                    textShadow: [
                      '0 0 4px hsl(var(--team-blue) / 0.7)',
                      '0 0 8px hsl(var(--team-blue) / 0.7)',
                      '0 0 4px hsl(var(--team-blue) / 0.7)'
                    ]
                  } : {}}
                  transition={{
                    repeat: Infinity,
                    duration: 2
                  }}
                >
                  {series.team1Name}
                </motion.span>
                {team1Wins >= gamesNeeded && <Crown className='text-[hsl(var(--team-blue))]' size={20} weight='fill' />}
              </div>
            </div>
            <div className='min-w-[80px] px-6 py-2 bg-muted rounded-lg text-center font-bold shrink-0'>
              {team1Wins} - {team2Wins}
            </div>
            <div className='w-[200px] flex justify-start'>
              <div className='flex items-center gap-2'>
                {team2Wins >= gamesNeeded && <Crown className='text-[hsl(var(--team-red))]' size={20} weight='fill' />}
                <motion.span 
                  className={`font-bold uppercase tracking-wider ${
                    team2Wins >= gamesNeeded 
                      ? 'text-[hsl(var(--team-red))] opacity-100' 
                      : 'text-[hsl(var(--team-red))] opacity-90'
                  }`}
                  animate={team2Wins >= gamesNeeded ? {
                    textShadow: [
                      '0 0 4px hsl(var(--team-red) / 0.7)',
                      '0 0 8px hsl(var(--team-red) / 0.7)',
                      '0 0 4px hsl(var(--team-red) / 0.7)'
                    ]
                  } : {}}
                  transition={{
                    repeat: Infinity,
                    duration: 2
                  }}
                >
                  {series.team2Name}
                </motion.span>
              </div>
            </div>
          </div>
        </div>

        {/* Game Navigation */}
        <div className='flex justify-center gap-2'>
          {Array.from({ length: series.format === 'BO5' ? 5 : series.format === 'BO3' ? 3 : 1 }).map((_, i) => {
            const gameNum = i + 1
            const isCurrentGame = gameNum === currentGameNumber
            const isPreviousGame = gameNum < currentGameNumber
            const isSeriesOver = team1Wins >= gamesNeeded || team2Wins >= gamesNeeded
            const game = series.games.find(g => g.gameNumber === gameNum)
            const isNextGame = !isSeriesOver && 
              gameNum === Math.max(...series.games
                .filter(g => g.status === 'COMPLETED')
                .map(g => g.gameNumber)) + 1
            const isCompleted = game?.status === 'COMPLETED'
            const isDisabled = !isCurrentGame && !isNextGame && !isCompleted && 
              (isSeriesOver || (!isPreviousGame && !isCurrentGame))

            return (
              <Link
                key={gameNum}
                to="/draft/:seriesId/:gameNumber/:team?/:auth?"
                params={{
                  seriesId: series.id,
                  gameNumber: gameNum.toString(),
                  team: side || '',
                  auth: side ? (side === 'team1' ? series.team1AuthToken : series.team2AuthToken) : ''
                }}
                className={`
                  w-[120px] px-4 py-2 rounded-lg font-medium transition-all
                  ${isCurrentGame
                    ? 'bg-accent text-accent-foreground'
                    : isNextGame
                      ? 'bg-[hsl(var(--accent))] text-accent-foreground animate-pulse'
                      : isDisabled
                        ? 'bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50'
                        : 'bg-muted hover:bg-accent hover:text-accent-foreground'
                  }
                  ${game?.status === 'COMPLETED' && !isCurrentGame ? 'ring-2 ring-accent' : ''}
                `}
                onClick={e => {
                  if (isDisabled) {
                    e.preventDefault()
                  }
                }}
              >
                <div className='text-sm'>Game {gameNum}</div>
                {game?.status === 'COMPLETED' && (
                  <div className='text-xs mt-1 opacity-75 truncate'>
                    {game.winner === 'BLUE' ? game.blueSide : game.redSide}
                  </div>
                )}
              </Link>
            )
          })}
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
          <div className='text-lg font-bold text-center'>Draft Complete!</div>
          <div className='text-sm text-muted-foreground text-center'>Select the winner:</div>
          <div className='grid grid-cols-2 gap-4'>
            <button
              onClick={() => handleSetWinner('BLUE')}
              className='p-6 rounded-lg bg-[hsl(var(--team-blue))] hover:scale-[1.02] transition-transform'
            >
              <div className='text-[hsl(var(--team-blue-foreground))] font-medium'>{currentGame.blueSide} Wins</div>
            </button>
            <button
              onClick={() => handleSetWinner('RED')}
              className='p-6 rounded-lg bg-[hsl(var(--team-red))] hover:scale-[1.02] transition-transform'
            >
              <div className='text-[hsl(var(--team-red-foreground))] font-medium'>{currentGame.redSide} Wins</div>
            </button>
          </div>
        </div>
      )}

      {/* Previous Games */}
      {currentGameNumber > 1 && (
        <div className='space-y-2'>
          <button 
            onClick={() => setShowPreviousGames(!showPreviousGames)}
            className='w-full flex items-center justify-between px-4 py-2 bg-card/50 rounded-lg hover:bg-card/80 transition-colors'
          >
            <h3 className='text-sm font-medium text-muted-foreground'>
              Previous Games
            </h3>
            <motion.div
              animate={{ rotate: showPreviousGames ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <CaretDown className='text-muted-foreground' size={16} />
            </motion.div>
          </button>
          
          <AnimatePresence>
            {showPreviousGames && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className='overflow-hidden'
              >
                <div className='space-y-3 w-fit mx-auto pt-2'>
                  {series.games
                    .filter(g => g.status === 'COMPLETED' && g.gameNumber < currentGameNumber)
                    .sort((a, b) => a.gameNumber - b.gameNumber)
                    .map(g => {
                      const blueWon = g.winner === 'BLUE'
                      return (
                        <div key={g.id} className='bg-card/50 rounded-lg p-3'>
                          <div className='flex items-start gap-6'>
                            {/* Blue Side */}
                            <div className={`${blueWon ? 'opacity-100' : 'opacity-70'}`}>
                              {/* Blue Team Name */}
                              <div className='flex items-center gap-2 mb-2 w-[200px] justify-end'>
                                <div className={`text-xs font-medium ${blueWon ? 'text-[hsl(var(--team-blue))]' : 'text-muted-foreground'}`}>
                                  {g.blueSide}
                                </div>
                                {blueWon && <Crown className='text-[hsl(var(--team-blue))]' size={16} weight='fill' />}
                              </div>
                              {/* Blue Picks & Bans */}
                              <div className='space-y-2'>
                                {/* Blue Picks */}
                                <div className='flex gap-1 justify-end'>
                                  {g.actions
                                    .filter(a => a.type === 'PICK' && a.team === 'BLUE')
                                    .sort((a, b) => a.position - b.position)
                                    .map(a => (
                                      <motion.div
                                        key={a.position}
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ 
                                          type: "spring",
                                          stiffness: 400,
                                          damping: 25
                                        }}
                                        className='relative w-9 h-9 overflow-hidden rounded-sm group'
                                        title={a.champion}
                                      >
                                        <img
                                          src={getChampionImageUrl(a.champion)}
                                          alt={a.champion}
                                          className='w-full h-full object-cover scale-[115%]'
                                          loading='lazy'
                                        />
                                        <div className='absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center'>
                                          <span className='text-[8px] font-medium text-white text-center px-0.5 leading-tight'>
                                            {a.champion}
                                          </span>
                                        </div>
                                      </motion.div>
                                    ))}
                                </div>
                                {/* Blue Bans */}
                                <div className='flex gap-1 justify-end'>
                                  {g.actions
                                    .filter(a => a.type === 'BAN' && a.team === 'BLUE')
                                    .sort((a, b) => a.position - b.position)
                                    .map(a => (
                                      <motion.div
                                        key={a.position}
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 0.75 }}
                                        transition={{ 
                                          type: "spring",
                                          stiffness: 400,
                                          damping: 25
                                        }}
                                        className='relative w-9 h-9 overflow-hidden rounded-sm group'
                                        title={`Ban: ${a.champion}`}
                                      >
                                        <img
                                          src={getChampionImageUrl(a.champion)}
                                          alt={a.champion}
                                          className='w-full h-full object-cover scale-[115%] grayscale'
                                          loading='lazy'
                                        />
                                      </motion.div>
                                    ))}
                                </div>
                              </div>
                            </div>

                            {/* Game Number */}
                            <div className='text-xs font-medium text-muted-foreground min-w-[60px] text-center mt-2'>
                              Game {g.gameNumber}
                            </div>

                            {/* Red Side */}
                            <div className={`${!blueWon ? 'opacity-100' : 'opacity-70'}`}>
                              {/* Red Team Name */}
                              <div className='flex items-center gap-2 mb-2 w-[200px]'>
                                {!blueWon && <Crown className='text-[hsl(var(--team-red))]' size={16} weight='fill' />}
                                <div className={`text-xs font-medium ${!blueWon ? 'text-[hsl(var(--team-red))]' : 'text-muted-foreground'}`}>
                                  {g.redSide}
                                </div>
                              </div>
                              {/* Red Picks & Bans */}
                              <div className='space-y-2'>
                                {/* Red Picks */}
                                <div className='flex gap-1'>
                                  {g.actions
                                    .filter(a => a.type === 'PICK' && a.team === 'RED')
                                    .sort((a, b) => a.position - b.position)
                                    .map(a => (
                                      <motion.div
                                        key={a.position}
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ 
                                          type: "spring",
                                          stiffness: 400,
                                          damping: 25
                                        }}
                                        className='relative w-9 h-9 overflow-hidden rounded-sm group'
                                        title={a.champion}
                                      >
                                        <img
                                          src={getChampionImageUrl(a.champion)}
                                          alt={a.champion}
                                          className='w-full h-full object-cover scale-[115%]'
                                          loading='lazy'
                                        />
                                        <div className='absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center'>
                                          <span className='text-[8px] font-medium text-white text-center px-0.5 leading-tight'>
                                            {a.champion}
                                          </span>
                                        </div>
                                      </motion.div>
                                    ))}
                                </div>
                                {/* Red Bans */}
                                <div className='flex gap-1'>
                                  {g.actions
                                    .filter(a => a.type === 'BAN' && a.team === 'RED')
                                    .sort((a, b) => a.position - b.position)
                                    .map(a => (
                                      <motion.div
                                        key={a.position}
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 0.75 }}
                                        transition={{ 
                                          type: "spring",
                                          stiffness: 400,
                                          damping: 25
                                        }}
                                        className='relative w-9 h-9 overflow-hidden rounded-sm group'
                                        title={`Ban: ${a.champion}`}
                                      >
                                        <img
                                          src={getChampionImageUrl(a.champion)}
                                          alt={a.champion}
                                          className='w-full h-full object-cover scale-[115%] grayscale'
                                          loading='lazy'
                                        />
                                      </motion.div>
                                    ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
} 
