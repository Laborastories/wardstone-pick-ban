import { useQuery } from 'wasp/client/operations'
import { getGame, getSeries } from 'wasp/client/operations'
import { motion } from 'motion/react'
import { type Game, type Series, type DraftAction } from 'wasp/entities'
import { useEffect, useState } from 'react'
import { useSocket, useSocketListener, ServerToClientPayload } from 'wasp/client/webSocket'
import { Button } from '../../client/components/ui/button'
import { Check, X } from '@phosphor-icons/react'
import { ChampionGrid } from '../components/ChampionGrid'
import { getChampionImageUrl, type Champion } from '../services/championService'
import { getCurrentTurn, getNextAction, isTeamTurn, getCurrentPhase } from '../utils/draftSequence'
import { SeriesInfo } from '../components/SeriesInfo'
import { useParams } from 'react-router-dom'
import { SideSelection } from '../components/SideSelection'

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
  const params = useParams()
  const team = params.team as 'team1' | 'team2' | undefined
  const { seriesId = '', gameNumber = '1', auth } = params
  const [readyStates, setReadyStates] = useState<ReadyStates>({})
  const [isReady, setIsReady] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const { socket, isConnected } = useSocket()

  // Set auth token when socket connects
  useEffect(() => {
    if (socket && auth) {
      socket.auth = { token: auth }
      socket.connect()
    }
  }, [socket, auth])

  const { data: series } = useQuery(getSeries, { seriesId })
  const { data: game, isLoading, error, refetch } = useQuery(getGame, { seriesId, gameNumber })

  // Join game room when socket connects and game data is available
  useEffect(() => {
    if (!socket || !game || !isConnected) {
      return
    }
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

  // Socket event listeners
  useSocketListener('readyStateUpdate', (data: ServerToClientPayload<'readyStateUpdate'>) => {
    setReadyStates(data.readyStates)
  })

  useSocketListener('draftStart', (data: ServerToClientPayload<'draftStart'>) => {
    console.log('Draft starting!', data.gameId)
    refetch()
  })

  useSocketListener('draftActionUpdate', () => {
    refetch()
  })

  useSocketListener('timerUpdate', (data: ServerToClientPayload<'timerUpdate'>) => {
    setTimeRemaining(data.timeRemaining)
  })

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
  }, [socket, game?.id, game?.seriesId, refetch])

  // Convert team1/team2 to blue/red based on the selected sides in the current game
  const getTeamSide = (team: 'team1' | 'team2' | undefined, game: GameWithRelations): 'blue' | 'red' | undefined => {
    if (!team) return undefined
    if (!game.blueSide || !game.redSide) return undefined

    // If team1 is on blue side (their name matches blueSide), return blue, otherwise red
    if (team === 'team1') {
      return game.blueSide === series?.team1Name ? 'blue' : 'red'
    }
    // If team2 is on blue side (their name matches blueSide), return blue, otherwise red
    if (team === 'team2') {
      return game.blueSide === series?.team2Name ? 'blue' : 'red'
    }
    return undefined
  }

  // Validate auth token if provided
  const isValidAuth = auth && series && (
    (team === 'team1' && auth === series.team1AuthToken) ||
    (team === 'team2' && auth === series.team2AuthToken)
  )

  // If auth is provided but invalid, show error
  if (auth && !isValidAuth) {
    return (
      <div className='min-h-screen bg-background text-foreground flex items-center justify-center'>
        <div className='text-center space-y-2'>
          <h1 className='text-2xl font-bold'>Invalid Auth Token</h1>
          <p className='text-muted-foreground'>The provided auth token is not valid for this team.</p>
        </div>
      </div>
    )
  }

  const handleReadyClick = () => {
    if (!socket || !game || !team || !isConnected) return

    const newReadyState = !isReady
    setIsReady(newReadyState)
    const gameSide = getTeamSide(team, game as GameWithRelations)
    if (!gameSide) return

    socket.emit('readyState', {
      gameId: game.id,
      side: gameSide,
      isReady: newReadyState
    })
  }

  const handleChampionSelect = (champion: Champion) => {
    if (!socket || !game || !team || !isConnected) return

    const currentTurn = getCurrentTurn((game as GameWithRelations).actions)
    const nextAction = getNextAction(currentTurn)

    if (!nextAction) {
      return
    }

    const gameSide = getTeamSide(team, game as GameWithRelations)
    if (!gameSide) return

    if (!isTeamTurn(gameSide.toUpperCase() as 'BLUE' | 'RED', currentTurn)) {
      return
    }

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

  const gameWithRelations = game as GameWithRelations
  const currentTurn = getCurrentTurn(gameWithRelations.actions)
  const currentPhase = getCurrentPhase(currentTurn)
  const nextAction = getNextAction(currentTurn)
  const gameSide = getTeamSide(team, gameWithRelations)

  return (
    <div className='min-h-screen bg-background p-8'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='max-w-7xl mx-auto space-y-8'
      >
        {/* Series Info */}
        {(game as GameWithRelations)?.series && (
          <SeriesInfo
            series={(game as GameWithRelations).series}
            currentGameNumber={parseInt(gameNumber)}
            side={team}
          />
        )}

        {/* Side Selection - Show when game is new and sides haven't been selected */}
        {gameWithRelations.status === 'PENDING' && (!gameWithRelations.blueSide || !gameWithRelations.redSide || gameWithRelations.blueSide === '' || gameWithRelations.redSide === '') && (
          <SideSelection
            series={gameWithRelations.series}
            gameNumber={parseInt(gameNumber)}
            side={team}
          />
        )}

        {/* Only show the rest of the UI if sides have been selected */}
        {gameWithRelations.blueSide && (
          <>
            {/* Game Status Header */}
            <header className='text-center relative'>
              {/* Draft Status - Only show in development */}
              {process.env.NODE_ENV === 'development' && (
                <div className='absolute top-0 right-0 text-xs text-muted-foreground'>
                  Status: {gameWithRelations.status}
                </div>
              )}

              {/* Draft Phase - Only show when IN_PROGRESS */}
              {gameWithRelations.status === 'IN_PROGRESS' && currentPhase && (
                <div className='space-y-2'>
                  {/* Timer */}
                  {timeRemaining !== null && (
                    <div className={`text-6xl font-bold tracking-tight ${
                      timeRemaining <= 5 ? 'text-destructive animate-pulse' : 
                      timeRemaining <= 10 ? 'text-destructive' : 
                      'text-foreground'
                    }`}>
                      {timeRemaining}
                    </div>
                  )}
                  <div className='text-lg font-medium'>
                    {nextAction ? (
                      <span className={nextAction.team === 'BLUE' ? 'text-blue-500' : 'text-red-500'}>
                        {nextAction.team === 'BLUE' ? gameWithRelations.blueSide : gameWithRelations.redSide}
                        &apos;s turn to {nextAction.type.toLowerCase()}
                      </span>
                    ) : (
                      'Draft Complete'
                    )}
                  </div>
                </div>
              )}

              {/* Ready Status - Only show when PENDING */}
              {gameWithRelations.status === 'PENDING' && (
                <div className='space-y-6'>
                  <div className='flex justify-center gap-16'>
                    <div className='flex flex-col items-center gap-3'>
                      <div 
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                          readyStates.blue 
                            ? 'bg-blue-500 text-white ring-2 ring-blue-500 ring-offset-2 ring-offset-background' 
                            : 'bg-muted text-muted-foreground'
                        }`} 
                        title={`${gameWithRelations.blueSide} ${readyStates.blue ? 'Ready' : 'Not Ready'}`}
                      >
                        {readyStates.blue ? <Check size={24} weight="bold" /> : <X size={24} weight="bold" />}
                      </div>
                      <span className='text-sm font-medium text-blue-500'>{gameWithRelations.blueSide}</span>
                    </div>
                    <div className='flex flex-col items-center gap-3'>
                      <div 
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                          readyStates.red 
                            ? 'bg-red-500 text-white ring-2 ring-red-500 ring-offset-2 ring-offset-background' 
                            : 'bg-muted text-muted-foreground'
                        }`}
                        title={`Red Team ${readyStates.red ? 'Ready' : 'Not Ready'}`}
                      >
                        {readyStates.red ? <Check size={24} weight="bold" /> : <X size={24} weight="bold" />}
                      </div>
                      <span className='text-sm font-medium text-red-500'>{gameWithRelations.redSide}</span>
                    </div>
                  </div>
                  {/* Ready Button (only shown to team captains) */}
                  {team && (
                    <div>
                      <Button
                        onClick={handleReadyClick}
                        variant={isReady ? 'destructive' : 'default'}
                        size='lg'
                        className='min-w-[160px] font-medium'
                        disabled={!isConnected}
                      >
                        {isReady ? 'Not Ready' : 'Ready'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </header>

            {/* Champion Selection */}
            {gameWithRelations.status !== 'PENDING' && (
              <>
                {/* Draft Grid */}
                <div className='grid grid-cols-2 gap-12'>
                  {/* Blue Side */}
                  <div className='space-y-8'>
                    <h2 className='text-2xl font-bold text-blue-500 text-center'>{gameWithRelations.blueSide}</h2>
                    <div className='space-y-8'>
                      {/* Picks */}
                      <div>
                        <h3 className='text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider'>Picks</h3>
                        <div className='grid grid-cols-5 gap-3'>
                          {[6, 9, 10, 17, 18].map(i => {
                            const action = gameWithRelations.actions.find(a => a.type === 'PICK' && a.position === i)
                            return (
                              <div
                                key={`blue-pick-${i}`}
                                className='aspect-square bg-card rounded-lg border border-border overflow-hidden group relative'
                              >
                                {action ? (
                                  <img
                                    src={getChampionImageUrl(action.champion)}
                                    alt={action.champion}
                                    className='w-full h-full object-cover scale-[115%]'
                                    loading='lazy'
                                  />
                                ) : (
                                  <div className='w-full h-full flex items-center justify-center text-muted-foreground text-xs'>
                                    B{Math.floor(i/4) + 1}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      {/* Bans */}
                      <div>
                        <h3 className='text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider'>Bans</h3>
                        <div className='grid grid-cols-5 gap-3'>
                          {[0, 2, 4, 13, 15].map(i => {
                            const action = gameWithRelations.actions.find(a => a.type === 'BAN' && a.position === i)
                            return (
                              <div
                                key={`blue-ban-${i}`}
                                className='aspect-square bg-card rounded-lg border border-border overflow-hidden group relative'
                              >
                                {action ? (
                                  <>
                                      <img
                                        src={getChampionImageUrl(action.champion)}
                                        alt={action.champion}
                                        className='w-full h-full object-cover scale-[115%] opacity-75 grayscale'
                                        loading='lazy'
                                    />
                                    <div className='absolute inset-0 bg-black/50 flex items-center justify-center'>
                                      <X size={24} weight='bold' className='text-white' />
                                    </div>
                                  </>
                                ) : (
                                  <div className='w-full h-full flex items-center justify-center text-muted-foreground text-xs'>
                                    Ban {Math.floor(i/4) + 1}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Red Side */}
                  <div className='space-y-8'>
                    <h2 className='text-2xl font-bold text-red-500 text-center'>{gameWithRelations.redSide}</h2>
                    <div className='space-y-8'>
                      {/* Picks */}
                      <div>
                        <h3 className='text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider'>Picks</h3>
                        <div className='grid grid-cols-5 gap-3'>
                          {[7, 8, 11, 16, 19].map(i => {
                            const action = gameWithRelations.actions.find(a => a.type === 'PICK' && a.position === i)
                            return (
                              <div
                                key={`red-pick-${i}`}
                                className='aspect-square bg-card rounded-lg border border-border overflow-hidden group relative'
                              >
                                {action ? (
                                  <img
                                    src={getChampionImageUrl(action.champion)}
                                    alt={action.champion}
                                    className='w-full h-full object-cover scale-[115%]'
                                    loading='lazy'
                                  />
                                ) : (
                                  <div className='w-full h-full flex items-center justify-center text-muted-foreground text-xs'>
                                    R{Math.floor(i/4) + 1}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      {/* Bans */}
                      <div>
                        <h3 className='text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider'>Bans</h3>
                        <div className='grid grid-cols-5 gap-3'>
                          {[1, 3, 5, 12, 14].map(i => {
                            const action = gameWithRelations.actions.find(a => a.type === 'BAN' && a.position === i)
                            return (
                              <div
                                key={`red-ban-${i}`}
                                className='aspect-square bg-card rounded-lg border border-border overflow-hidden group relative'
                              >
                                {action ? (
                                  <>
                                    <img
                                      src={getChampionImageUrl(action.champion)}
                                      alt={action.champion}
                                      className='w-full h-full object-cover scale-[115%] opacity-75 grayscale'
                                      loading='lazy'
                                    />
                                    <div className='absolute inset-0 bg-black/50 flex items-center justify-center'>
                                      <X size={24} weight='bold' className='text-white' />
                                    </div>
                                  </>
                                ) : (
                                  <div className='w-full h-full flex items-center justify-center text-muted-foreground text-xs'>
                                    Ban {Math.floor(i/4) + 1}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Champion Selection - Only show in IN_PROGRESS */}
                {gameWithRelations.status === 'IN_PROGRESS' && (
                  <div className='mt-12'>
                    <ChampionGrid 
                      onSelect={handleChampionSelect}
                      disabled={!gameSide || !isTeamTurn(gameSide.toUpperCase() as 'BLUE' | 'RED', currentTurn)}
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
              </>
            )}
          </>
        )}
      </motion.div>
    </div>
  )
} 
