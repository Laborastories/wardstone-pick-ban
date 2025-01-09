import { useQuery } from 'wasp/client/operations'
import { getGame, getSeries } from 'wasp/client/operations'
import { motion, AnimatePresence } from 'motion/react'
import { type Game, type Series } from 'wasp/entities'
import { useEffect, useState } from 'react'
import { useSocket, useSocketListener, ServerToClientPayload } from 'wasp/client/webSocket'
import { Button } from '../../client/components/ui/button'
import { X } from '@phosphor-icons/react'
import { ChampionGrid } from '../components/ChampionGrid'
import { getChampionImageUrl, type Champion } from '../services/championService'
import { getCurrentTurn, getNextAction, isTeamTurn } from '../utils/draftSequence'
import { SeriesInfo } from '../components/SeriesInfo'
import { useParams } from 'react-router-dom'
import { SideSelection } from '../components/SideSelection'
import { cn } from '../../lib/utils'

type GameWithRelations = Game & {
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
  actions: {
    type: string
    champion: string
    team: 'BLUE' | 'RED'
    position: number
  }[]
}

export function DraftPage() {
  const params = useParams()
  const team = params.team as 'team1' | 'team2' | undefined
  const { seriesId = '', gameNumber = '1', auth } = params
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [pendingAction, setPendingAction] = useState<{
    type: 'PICK' | 'BAN'
    champion: string
    position: number
    phase: number
    team: 'BLUE' | 'RED'
  } | null>(null)
  const { socket, isConnected } = useSocket()
  const [previewedChampions, setPreviewedChampions] = useState<Record<number, string | null>>({})
  const [readyStates, setReadyStates] = useState<{ blue?: boolean, red?: boolean }>({})

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

  // Socket event listeners
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

  useSocketListener('championPreview', (data: ServerToClientPayload<'championPreview'>) => {
    setPreviewedChampions(prev => ({
      ...prev,
      [data.position]: data.champion
    }))
  })

  useSocketListener('readyStateUpdate', (data: ServerToClientPayload<'readyStateUpdate'>) => {
    setReadyStates(data.readyStates)
  })

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

    // Set pending action and emit preview
    setPendingAction({
      type: nextAction.type,
      phase: nextAction.phase,
      team: nextAction.team,
      champion: champion.id,
      position: nextAction.position
    })

    // Emit preview to other clients
    socket.emit('previewChampion', {
      gameId: game.id,
      position: nextAction.position,
      champion: champion.id
    })
  }

  const handleConfirmAction = () => {
    if (!socket || !game || !pendingAction) return

    socket.emit('draftAction', {
      gameId: game.id,
      type: pendingAction.type,
      phase: pendingAction.phase,
      team: pendingAction.team,
      champion: pendingAction.champion,
      position: pendingAction.position
    })

    // Clear preview when confirming
    socket.emit('previewChampion', {
      gameId: game.id,
      position: pendingAction.position,
      champion: null
    })

    setPendingAction(null)
  }

  const handleReadyClick = () => {
    if (!socket || !gameSide || !gameWithRelations) return
    socket.emit('readyState', {
      gameId: gameWithRelations.id,
      side: gameSide,
      isReady: !readyStates[gameSide]
    })
  }

  const renderSlot = (
    type: 'PICK' | 'BAN',
    position: number,
    index: number,
    team: 'BLUE' | 'RED',
    action?: { champion: string }
  ) => {
    const isActive = !action && getCurrentTurn(gameWithRelations.actions) === position
    const isPending = !action && pendingAction?.position === position
    const isPreviewed = !action && !isPending && previewedChampions[position]

    return (
      <div
        key={`${team.toLowerCase()}-${type.toLowerCase()}-${position}`}
        className='group relative'
      >
        <div
          className={cn(
            'relative overflow-hidden border rounded-sm',
            type === 'PICK' ? 'h-full' : 'aspect-square w-24',
            isActive && 'ring-2 ring-primary shadow-[0_0_15px_rgba(var(--primary)/0.5)]',
            (isPending || isPreviewed) && 'ring-2 ring-primary',
            !isActive && !isPending && !isPreviewed && 'border-border',
            isActive && 'animate-[glow_3s_ease-in-out_infinite]'
          )}
        >
          <AnimatePresence mode='wait'>
            {action ? (
              <motion.div
                key='locked'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'absolute inset-0',
                  type === 'BAN' && action && 'opacity-75 grayscale'
                )}
              >
                <motion.div
                  initial={{ filter: 'brightness(2)', opacity: 0.8 }}
                  animate={{ filter: 'brightness(1)', opacity: 1 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className='absolute inset-0 bg-primary/20'
                />
                <motion.img
                  initial={{ filter: 'brightness(2)' }}
                  animate={{ filter: 'brightness(1)' }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  src={getChampionImageUrl(action.champion, type === 'PICK' ? 'splash' : 'icon')}
                  alt={action.champion}
                  className={cn(
                    'absolute inset-0 w-full h-full scale-110',
                    type === 'PICK' ? 'object-cover object-[center_-80%] scale-150' : 'object-contain'
                  )}
                  loading='lazy'
                />
                {type === 'BAN' && (
                  <motion.div 
                    initial={{ opacity: 0, filter: 'brightness(2)' }}
                    animate={{ opacity: 1, filter: 'brightness(1)' }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className='absolute inset-0 bg-black/50 flex items-center justify-center'
                  >
                    <X size={24} weight='bold' className='text-white' />
                  </motion.div>
                )}
              </motion.div>
            ) : isPending ? (
              <motion.div
                key='pending'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className='absolute inset-0'
              >
                <motion.img
                  src={getChampionImageUrl(pendingAction.champion, type === 'PICK' ? 'splash' : 'icon')}
                  alt={pendingAction.champion}
                  className={cn(
                    'absolute inset-0 w-full h-full',
                    type === 'PICK' ? 'object-cover object-[center_-80%] scale-150 saturate-50' : 'object-contain'
                  )}
                  loading='lazy'
                />
                {type === 'BAN' && (
                  <motion.div 
                    className='absolute inset-0 bg-black/25 flex items-center justify-center'
                  >
                    <X size={24} weight='bold' className='text-white' />
                  </motion.div>
                )}
              </motion.div>
            ) : isPreviewed && previewedChampions[position] ? (
              <motion.div
                key='preview'
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                className='absolute inset-0'
              >
                <motion.img
                  src={getChampionImageUrl(previewedChampions[position], type === 'PICK' ? 'splash' : 'icon')}
                  alt={previewedChampions[position]}
                  className={cn(
                    'absolute inset-0 w-full h-full',
                    type === 'PICK' ? 'object-cover object-[center_-80%] scale-150 saturate-50' : 'object-contain'
                  )}
                  loading='lazy'
                />
                {type === 'BAN' && (
                  <motion.div 
                    className='absolute inset-0 bg-black/25 flex items-center justify-center'
                  >
                    <X size={24} weight='bold' className='text-white' />
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key='empty'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className='absolute inset-0 flex items-center justify-center text-muted-foreground'
              >
                {type === 'PICK' ? `${team[0]}${index + 1}` : `Ban ${index + 1}`}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    )
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
  const nextAction = getNextAction(currentTurn)
  const gameSide = getTeamSide(team, gameWithRelations)
  const isCurrentTeam = gameSide?.toUpperCase() === nextAction?.team

  return (
    <div className='h-screen overflow-hidden bg-background p-12'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='h-full flex flex-col p-2'
      >
        {/* Main Draft UI */}
        <div className='h-full flex flex-col gap-4'>
          {/* Top Section: Picks and Series Info */}
          <div className='flex-1 min-h-0 flex gap-4 pb-2'>
            {/* Blue Side - Vertical */}
            <div className='w-[20%] min-w-[16rem] flex flex-col min-h-0 rounded-sm bg-gradient-to-b from-blue-400/30 to-transparent p-6'>
              <motion.h2 
                className={cn(
                  'text-2xl font-bold text-center uppercase tracking-wider mb-1 flex-none',
                  gameWithRelations.series.winner === gameWithRelations.blueSide 
                    ? 'text-blue-400' 
                    : 'text-blue-500'
                )}
                animate={gameWithRelations.series.winner === gameWithRelations.blueSide ? {
                  textShadow: [
                    '0 0 4px rgb(59 130 246 / 0.5)',
                    '0 0 8px rgb(59 130 246 / 0.5)',
                    '0 0 4px rgb(59 130 246 / 0.5)'
                  ]
                } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                {gameWithRelations.blueSide || 'Blue Side'}
              </motion.h2>

              {/* Blue Picks */}
              <div className='flex-1 grid grid-rows-5 gap-2'>
                {[6, 9, 10, 17, 18].map((i, index) => {
                  const action = gameWithRelations.actions.find(a => a.type === 'PICK' && a.position === i)
                  return renderSlot('PICK', i, index, 'BLUE', action)
                })}
              </div>
            </div>

            {/* Center Content */}
            <div className='flex flex-col gap-4 flex-1'>
              {/* Series Info */}
              <div className='flex-none'>
                {(game as GameWithRelations)?.series && (
                  <SeriesInfo
                    series={(game as GameWithRelations).series}
                    currentGameNumber={parseInt(gameNumber)}
                    side={team}
                  />
                )}
              </div>

              {/* Side Selection or Draft Content */}
              <div className='flex-1 min-h-0 flex flex-col'>
                {gameWithRelations.status === 'PENDING' && (!gameWithRelations.blueSide || !gameWithRelations.redSide) ? (
                  <div className='flex-1 min-h-0 flex items-center justify-center'>
                    <SideSelection
                      series={gameWithRelations.series}
                      gameNumber={parseInt(gameNumber)}
                      side={team}
                    />
                  </div>
                ) : (
                  <>
                    {/* Timer and Phase */}
                    <div className='text-center mb-2 space-y-1 flex-none h-[72px] flex flex-col justify-center'>
                      {gameWithRelations.status === 'IN_PROGRESS' ? (
                        <>
                          {timeRemaining !== null && (
                            <div className={cn(
                              'text-4xl font-bold tracking-tight',
                              timeRemaining <= 5 ? 'text-destructive animate-pulse' : 
                              timeRemaining <= 10 ? 'text-destructive' : 
                              'text-foreground'
                            )}>
                              {timeRemaining}
                            </div>
                          )}
                          <div className='text-sm font-medium'>
                            {nextAction ? (
                              <span className={nextAction.team === 'BLUE' ? 'text-blue-500' : 'text-red-500'}>
                                {nextAction.team === 'BLUE' ? gameWithRelations.blueSide : gameWithRelations.redSide}
                                &apos;s turn to {nextAction.type.toLowerCase()}
                              </span>
                            ) : (
                              'Draft Complete'
                            )}
                          </div>
                        </>
                      ) : gameWithRelations.status === 'COMPLETE' || 
                          gameWithRelations.status === 'DRAFT_COMPLETE' || 
                          gameWithRelations.series.winner || 
                          gameWithRelations.actions.length >= 20 ? (
                        <div className='text-2xl font-bold text-primary'>
                          Draft Complete!
                        </div>
                      ) : gameWithRelations.status === 'PENDING' && gameWithRelations.blueSide && gameWithRelations.redSide ? (
                        <div className='flex flex-col items-center gap-2'>
                          <div className='text-sm font-medium text-muted-foreground'>
                            {gameSide ? (
                              readyStates[gameSide] ? 'Waiting for other team...' : 'Click ready to start'
                            ) : (
                              'Waiting for teams to ready up...'
                            )}
                          </div>
                          {gameSide && (
                            <Button
                              size='sm'
                              variant={readyStates[gameSide] ? 'destructive' : 'default'}
                              onClick={handleReadyClick}
                            >
                              {readyStates[gameSide] ? 'Cancel' : 'Ready'}
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className='text-sm font-medium text-muted-foreground'>
                          Waiting for draft to start...
                        </div>
                      )}
                    </div>

                    {/* Champion Grid */}
                    <div className='flex-1 min-h-0 flex justify-center'>
                      <div className='w-fit'>
                        <ChampionGrid 
                          onSelect={handleChampionSelect}
                          disabled={
                            gameWithRelations.status !== 'IN_PROGRESS' || 
                            !gameSide || 
                            !isTeamTurn(gameSide.toUpperCase() as 'BLUE' | 'RED', currentTurn)
                          }
                          bannedChampions={gameWithRelations.actions
                            .filter(a => a.type === 'BAN')
                            .map(a => a.champion)
                          }
                          usedChampions={[
                            ...gameWithRelations.actions
                              .filter(a => a.type === 'PICK')
                              .map(a => a.champion),
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
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Red Side - Vertical */}
            <div className='w-[20%] min-w-[16rem] flex flex-col min-h-0 rounded-lg bg-gradient-to-b from-red-400/40 to-transparent p-6'>
              <motion.h2 
                className={cn(
                  'text-2xl font-bold text-center uppercase tracking-wider mb-1 flex-none',
                  gameWithRelations.series.winner === gameWithRelations.redSide 
                    ? 'text-red-400' 
                    : 'text-red-500'
                )}
                animate={gameWithRelations.series.winner === gameWithRelations.redSide ? {
                  textShadow: [
                    '0 0 4px rgb(239 68 68 / 0.5)',
                    '0 0 8px rgb(239 68 68 / 0.5)',
                    '0 0 4px rgb(239 68 68 / 0.5)'
                  ]
                } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                {gameWithRelations.redSide || 'Red Side'}
              </motion.h2>

              {/* Red Picks */}
              <div className='flex-1 grid grid-rows-5 gap-2'>
                {[7, 8, 11, 16, 19].map((i, index) => {
                  const action = gameWithRelations.actions.find(a => a.type === 'PICK' && a.position === i)
                  return renderSlot('PICK', i, index, 'RED', action)
                })}
              </div>
            </div>
          </div>

          {/* Bottom Section: Bans and Actions */}
          <div className='flex-none flex items-center justify-between gap-4 mt-0'>
            {/* Blue Bans */}
            <div className='flex gap-0.5 justify-center'>
              {[0, 2, 4, 13, 15].map((i, index) => {
                const action = gameWithRelations.actions.find(a => a.type === 'BAN' && a.position === i)
                return (
                  <div key={i}>
                    {renderSlot('BAN', i, index, 'BLUE', action)}
                  </div>
                )
              })}
            </div>

            {/* Center Actions */}
            <div className='flex-none'>
              {/* Confirmation Button */}
              {pendingAction && isCurrentTeam && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className='flex justify-center'
                >
                  <Button
                    size='lg'
                    onClick={handleConfirmAction}
                    className='min-w-[200px] font-medium'
                  >
                    Lock In
                  </Button>
                </motion.div>
              )}
            </div>

            {/* Red Bans */}
            <div className='flex gap-0.5 justify-center'>
              {[1, 3, 5, 12, 14].map((i, index) => {
                const action = gameWithRelations.actions.find(a => a.type === 'BAN' && a.position === i)
                return (
                  <div key={i}>
                    {renderSlot('BAN', i, index, 'RED', action)}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
} 
