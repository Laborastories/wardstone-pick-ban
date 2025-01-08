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
import { getCurrentTurn, getNextAction, isTeamTurn, getPhaseDescription, getCurrentPhase } from '../utils/draftSequence'

type DraftParams = {
  seriesId: string
  gameNumber: string
  side?: 'blue' | 'red'
  auth?: string
}

type GameWithRelations = Game & {
  series: Series
  actions: DraftAction[]
}

type ReadyStates = {
  blue?: boolean
  red?: boolean
}

export function DraftPage() {
  // Get URL params from pathname since useParams isn't available
  const pathParts = window.location.pathname.split('/')
  const seriesId = pathParts[2]
  const gameNumber = pathParts[3]
  const side = pathParts[4] as 'blue' | 'red' | undefined
  const auth = pathParts[5]

  const [champions, setChampions] = useState<Champion[]>([])

  // Fetch champions on mount
  useEffect(() => {
    getChampions().then(setChampions)
  }, [])

  const { data: game, isLoading, error, refetch } = useQuery(getGame, {
    seriesId,
    gameNumber,
    side,
    auth
  } as DraftParams)

  const { socket, isConnected } = useSocket()
  const [readyStates, setReadyStates] = useState<ReadyStates>({})
  const [isReady, setIsReady] = useState(false)

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

  // Listen for ready state updates
  useSocketListener('readyStateUpdate', (data: ServerToClientPayload<'readyStateUpdate'>) => {
    setReadyStates(data.readyStates)
  })

  // Listen for draft start
  useSocketListener('draftStart', (data: ServerToClientPayload<'draftStart'>) => {
    console.log('Draft starting!', data.gameId)
  })

  // Listen for draft action updates
  useSocketListener('draftActionUpdate', () => {
    // Refetch game data to get the latest actions
    refetch()
  })

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

  const gameWithRelations = game as GameWithRelations
  const currentTurn = getCurrentTurn(gameWithRelations.actions)
  const currentPhase = getCurrentPhase(currentTurn)
  const nextAction = getNextAction(currentTurn)

  return (
    <div className='min-h-screen bg-background text-foreground p-4'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='max-w-7xl mx-auto flex flex-col gap-8'
      >
        <header className='text-center mb-8'>
          <h1 className='text-3xl font-bold mb-2'>{gameWithRelations.series.matchName} - Game {gameWithRelations.gameNumber}</h1>
          <p className='text-muted-foreground'>{gameWithRelations.series.blueTeamName} vs {gameWithRelations.series.redTeamName}</p>
          <div className='mt-4 text-lg font-semibold'>
            Draft Status: {gameWithRelations.status}
          </div>
          {/* Draft Phase - Only show when IN_PROGRESS */}
          {gameWithRelations.status === 'IN_PROGRESS' && currentPhase && (
            <div className='mt-4 space-y-2'>
              <div className='text-lg font-medium'>
                {getPhaseDescription(currentPhase)}
              </div>
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
              {/* Bans */}
              <div className='col-span-5 grid grid-cols-5 gap-2'>
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
                            className='w-full h-full object-cover scale-[115%]'
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
              {/* Picks */}
              <div className='col-span-5 grid grid-cols-5 gap-2'>
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
          </div>

          {/* Red Side */}
          <div className='space-y-6'>
            <h2 className='text-xl font-bold text-red-500'>{gameWithRelations.series.redTeamName}</h2>
            <div className='grid grid-cols-5 gap-4'>
              {/* Bans */}
              <div className='col-span-5 grid grid-cols-5 gap-2'>
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
                            className='w-full h-full object-cover scale-[115%]'
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
              {/* Picks */}
              <div className='col-span-5 grid grid-cols-5 gap-2'>
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
          </div>
        </div>
        {/* Champion Selection - Only show when it's your turn */}
        {gameWithRelations.status === 'IN_PROGRESS' && (
          <div className='mb-8'>
            <ChampionGrid 
              onSelect={handleChampionSelect}
              disabled={!side || !isTeamTurn(side.toUpperCase() as 'BLUE' | 'RED', currentTurn)}
              usedChampions={gameWithRelations.actions.map(a => a.champion)}
            />
          </div>
        )}
      </motion.div>
    </div>
  )
} 
