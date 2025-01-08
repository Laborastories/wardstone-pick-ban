import { useQuery } from 'wasp/client/operations'
import { getGame } from 'wasp/client/operations'
import { motion } from 'motion/react'
import { type Game, type Series, type DraftAction } from 'wasp/entities'
import { useEffect, useState } from 'react'
import { useSocket, useSocketListener, ServerToClientPayload } from 'wasp/client/webSocket'
import { Button } from '../../client/components/ui/button'
import { Check, X } from '@phosphor-icons/react'
import { ChampionGrid } from '../components/ChampionGrid'
import { type Champion, getChampions, getChampionImageUrl } from '../services/championService'
import { getCurrentTurn, getNextAction, isTeamTurn, getCurrentPhase } from '../utils/draftSequence'
import { SeriesInfo } from '../components/SeriesInfo'
import { useParams } from 'react-router-dom'

type GameWithRelations = Game & {
  series: Series & {
    games: (Game & {
      actions: DraftAction[]
    })[]
  }
  actions: DraftAction[]
}

type ReadyStates = {
  blue?: boolean
  red?: boolean
}

export function DraftPage() {
  const { seriesId, gameNumber, side } = useParams() as {
    seriesId: string
    gameNumber: string
    side?: 'blue' | 'red'
  }

  const [champions, setChampions] = useState<Champion[]>([])

  // Fetch champions on mount
  useEffect(() => {
    getChampions().then(setChampions)
  }, [])

  const { data: game, isLoading, error, refetch } = useQuery(getGame, {
    seriesId,
    gameNumber
  })

  const { socket, isConnected } = useSocket()
  const [readyStates, setReadyStates] = useState<ReadyStates>({})
  const [isReady, setIsReady] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)

  // Join game room when socket connects and game data is available
  useEffect(() => {
    if (!socket || !game || !isConnected) {
      console.log('Cannot join game:', { 
        socketExists: !!socket, 
        gameExists: !!game, 
        isConnected 
      })
      return
    }
    console.log('Joining game room:', game.id)
    socket.emit('joinGame', game.id)
  }, [socket, game, isConnected])

  // Reset ready state when disconnected
  useEffect(() => {
    if (!isConnected) {
      setIsReady(false)
      setReadyStates({})
    }
  }, [isConnected])

  // Reset ready state when game number changes
  useEffect(() => {
    setIsReady(false)
    setReadyStates({})
  }, [gameNumber])

  // Listen for ready state updates
  useSocketListener('readyStateUpdate', (data: ServerToClientPayload<'readyStateUpdate'>) => {
    setReadyStates(data.readyStates)
  })

  // Listen for draft start
  useSocketListener('draftStart', (data: ServerToClientPayload<'draftStart'>) => {
    console.log('Draft starting!', data.gameId)
    // Refetch game data to get the updated status
    refetch()
  })

  // Listen for draft action updates
  useSocketListener('draftActionUpdate', () => {
    // Refetch game data to get the latest actions
    refetch()
  })

  // Listen for timer updates
  useSocketListener('timerUpdate', (data: ServerToClientPayload<'timerUpdate'>) => {
    setTimeRemaining(data.timeRemaining)
  })

  // Add this near the top where other socket events are handled
  useEffect(() => {
    if (!socket) return

    socket.on('gameUpdated', data => {
      if (data.gameId === game?.id) {
        refetch()
      }
    })

    socket.on('gameCreated', data => {
      if (data.seriesId === game?.seriesId) {
        refetch()
      }
    })

    socket.on('seriesUpdated', data => {
      if (data.seriesId === game?.seriesId) {
        refetch()
      }
    })

    return () => {
      socket.off('gameUpdated')
      socket.off('gameCreated')
      socket.off('seriesUpdated')
    }
  }, [socket, game?.id, game?.seriesId])

  const handleReadyClick = () => {
    if (!socket || !game || !side || !isConnected) return

    const newReadyState = !isReady
    setIsReady(newReadyState)
    console.log('Sending ready state:', { gameId: game.id, side, isReady: newReadyState })
    socket.emit('readyState', {
      gameId: game.id,
      side,
      isReady: newReadyState
    })
  }

  const handleChampionSelect = (champion: Champion) => {
    if (!socket || !game || !side || !isConnected) return

    const currentTurn = getCurrentTurn((game as GameWithRelations).actions)
    const nextAction = getNextAction(currentTurn)

    if (!nextAction) {
      console.log('Draft is complete')
      return
    }

    if (!isTeamTurn(side.toUpperCase() as 'BLUE' | 'RED', currentTurn)) {
      console.log('Not your turn')
      return
    }

    console.log('Selected champion:', champion, 'for action:', nextAction)
    socket.emit('draftAction', {
      gameId: game.id,
      type: nextAction.type,
      phase: nextAction.phase,
      team: nextAction.team,
      champion: champion.id,
      position: nextAction.position
    })
  }

  if (isLoading) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center'>
        <div className='text-foreground'>Loading draft...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center'>
        <div className='text-destructive'>Error: {error.message}</div>
      </div>
    )
  }

  if (!game) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center'>
        <div className='text-destructive'>Game not found</div>
      </div>
    )
  }

  console.log('Game data:', {
    id: game?.id,
    status: game?.status,
    seriesId: game?.seriesId,
    gameNumber: game?.gameNumber,
    seriesGames: (game as GameWithRelations)?.series?.games?.length,
    actions: (game as GameWithRelations)?.actions?.length
  })

  const gameWithRelations = game as GameWithRelations

  const currentTurn = getCurrentTurn(gameWithRelations.actions)
  const currentPhase = getCurrentPhase(currentTurn)
  const nextAction = getNextAction(currentTurn)

  return (
    <div className='min-h-screen bg-background p-8'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='max-w-6xl mx-auto space-y-8'
      >
        {/* Series Info */}
        {(game as GameWithRelations)?.series && (
          <SeriesInfo
            series={(game as GameWithRelations).series}
            currentGameNumber={parseInt(gameNumber)}
            side={side}
          />
        )}

        <header className='text-center mb-8'>
          <h1 className='text-3xl font-bold mb-2'>{gameWithRelations.series.matchName} - Game {gameWithRelations.gameNumber}</h1>
          <p className='text-muted-foreground'>{gameWithRelations.series.blueTeamName} vs {gameWithRelations.series.redTeamName}</p>
          
          {/* Draft Status - Only show in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className='mt-4 text-xs text-muted-foreground'>
              Status: {gameWithRelations.status}
            </div>
          )}

          {/* Draft Phase - Only show when IN_PROGRESS */}
          {gameWithRelations.status === 'IN_PROGRESS' && currentPhase && (
            <div className='mt-4 space-y-2'>
              {/* Timer */}
              {timeRemaining !== null && (
                <div className={`text-5xl font-bold ${
                  timeRemaining <= 5 ? 'text-destructive animate-pulse' : 
                  timeRemaining <= 10 ? 'text-destructive' : 
                  'text-foreground'
                }`}>
                  {timeRemaining}
                </div>
              )}
              <div className='text-sm text-muted-foreground'>
                {nextAction ? (
                  <>
                    {nextAction.team === 'BLUE' ? gameWithRelations.series.blueTeamName : gameWithRelations.series.redTeamName}
                    &apos;s turn to {nextAction.type.toLowerCase()}
                  </>
                ) : (
                  'Draft Complete'
                )}
              </div>
            </div>
          )}

          {/* Ready Status - Only show when PENDING */}
          {gameWithRelations.status === 'PENDING' && (
            <>
              <div className='mt-4 flex justify-center gap-12'>
                <div className='flex items-center gap-2'>
                  <div 
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                      readyStates.blue ? 'bg-blue-500 text-white' : 'bg-muted text-muted-foreground'
                    }`} 
                    title={`Blue Team ${readyStates.blue ? 'Ready' : 'Not Ready'}`}
                  >
                    {readyStates.blue ? <Check size={14} weight="bold" /> : <X size={14} weight="bold" />}
                  </div>
                  <span className='text-xs text-muted-foreground'>Blue</span>
                </div>
                <div className='flex items-center gap-2'>
                  <div 
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                      readyStates.red ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground'
                    }`}
                    title={`Red Team ${readyStates.red ? 'Ready' : 'Not Ready'}`}
                  >
                    {readyStates.red ? <Check size={14} weight="bold" /> : <X size={14} weight="bold" />}
                  </div>
                  <span className='text-xs text-muted-foreground'>Red</span>
                </div>
              </div>
              {/* Ready Button (only shown to team captains) */}
              {side && (
                <div className='mt-4'>
                  <Button
                    onClick={handleReadyClick}
                    variant={isReady ? 'destructive' : 'default'}
                    className='min-w-[120px]'
                    disabled={!isConnected}
                  >
                    {isReady ? 'Not Ready' : 'Ready'}
                  </Button>
                </div>
              )}
            </>
          )}
        </header>
        <div className='grid grid-cols-2 gap-8'>
          {/* Blue Side */}
          <div className='space-y-6'>
            <h2 className='text-xl font-bold text-blue-500'>{gameWithRelations.series.blueTeamName}</h2>
            <div className='grid grid-cols-5 gap-4'>
              {/* Picks */}
              <div className='col-span-5'>
                <h3 className='text-sm font-medium text-muted-foreground mb-2'>Picks</h3>
                <div className='grid grid-cols-5 gap-2'>
                  {[6, 9, 10, 17, 18].map(i => {
                    const action = gameWithRelations.actions.find(a => a.type === 'PICK' && a.position === i)
                    const champion = action ? champions.find(c => c.id === action.champion) : null
                    return (
                      <div
                        key={`blue-pick-${i}`}
                        className='aspect-square bg-card rounded-lg border border-border flex items-center justify-center relative overflow-hidden'
                      >
                        {champion && (
                          <img
                            src={getChampionImageUrl(champion)}
                            alt={champion.name}
                            className='w-full h-full object-cover scale-[115%]'
                            loading='lazy'
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
              {/* Bans */}
              <div className='col-span-5'>
                <h3 className='text-sm font-medium text-muted-foreground mb-2'>Bans</h3>
                <div className='grid grid-cols-5 gap-2'>
                  {[0, 2, 4, 13, 15].map(i => {
                    const action = gameWithRelations.actions.find(a => a.type === 'BAN' && a.position === i)
                    const champion = action ? champions.find(c => c.id === action.champion) : null
                    return (
                      <div
                        key={`blue-ban-${i}`}
                        className='aspect-square bg-card rounded-lg border border-border flex items-center justify-center relative overflow-hidden'
                      >
                        {champion && (
                          <>
                            <img
                              src={getChampionImageUrl(champion)}
                              alt={champion.name}
                              className='w-full h-full object-cover scale-[115%] opacity-75'
                              loading='lazy'
                            />
                            <div className='absolute inset-0 bg-black/50 flex items-center justify-center'>
                              <X size={24} weight='bold' className='text-white' />
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Red Side */}
          <div className='space-y-6'>
            <h2 className='text-xl font-bold text-red-500'>{gameWithRelations.series.redTeamName}</h2>
            <div className='grid grid-cols-5 gap-4'>
              {/* Picks */}
              <div className='col-span-5'>
                <h3 className='text-sm font-medium text-muted-foreground mb-2'>Picks</h3>
                <div className='grid grid-cols-5 gap-2'>
                  {[7, 8, 11, 16, 19].map(i => {
                    const action = gameWithRelations.actions.find(a => a.type === 'PICK' && a.position === i)
                    const champion = action ? champions.find(c => c.id === action.champion) : null
                    return (
                      <div
                        key={`red-pick-${i}`}
                        className='aspect-square bg-card rounded-lg border border-border flex items-center justify-center relative overflow-hidden'
                      >
                        {champion && (
                          <img
                            src={getChampionImageUrl(champion)}
                            alt={champion.name}
                            className='w-full h-full object-cover scale-[115%]'
                            loading='lazy'
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
              {/* Bans */}
              <div className='col-span-5'>
                <h3 className='text-sm font-medium text-muted-foreground mb-2'>Bans</h3>
                <div className='grid grid-cols-5 gap-2'>
                  {[1, 3, 5, 12, 14].map(i => {
                    const action = gameWithRelations.actions.find(a => a.type === 'BAN' && a.position === i)
                    const champion = action ? champions.find(c => c.id === action.champion) : null
                    return (
                      <div
                        key={`red-ban-${i}`}
                        className='aspect-square bg-card rounded-lg border border-border flex items-center justify-center relative overflow-hidden'
                      >
                        {champion && (
                          <>
                            <img
                              src={getChampionImageUrl(champion)}
                              alt={champion.name}
                              className='w-full h-full object-cover scale-[115%] opacity-75'
                              loading='lazy'
                            />
                            <div className='absolute inset-0 bg-black/50 flex items-center justify-center'>
                              <X size={24} weight='bold' className='text-white' />
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Champion Selection - Only show when it's your turn */}
        {gameWithRelations.status === 'IN_PROGRESS' && (
          <div className='mb-8'>
            <ChampionGrid 
              onSelect={handleChampionSelect}
              disabled={!side || !isTeamTurn(side.toUpperCase() as 'BLUE' | 'RED', currentTurn)}
              bannedChampions={gameWithRelations.actions
                .filter(a => a.type === 'BAN')
                .map(a => a.champion)
              }
              usedChampions={[
                // Current game picks
                ...gameWithRelations.actions
                  .filter(a => a.type === 'PICK')
                  .map(a => a.champion),
                // Previously picked champions in series if fearless draft is enabled
                ...(gameWithRelations.series.fearlessDraft 
                  ? gameWithRelations.series.games
                      .filter(g => g.gameNumber < gameWithRelations.gameNumber)
                      .flatMap(g => g.actions)
                      .filter(a => a.type === 'PICK')
                      .map(a => a.champion)
                  : [])
              ]}
            />
          </div>
        )}
      </motion.div>
    </div>
  )
} 
