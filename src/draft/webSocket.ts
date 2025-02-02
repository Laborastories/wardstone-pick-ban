import type { WaspSocketData, WebSocketDefinition } from 'wasp/server/webSocket'
import { prisma } from 'wasp/server'
import { type DraftAction } from 'wasp/entities'
import { type Champion } from '../draft/services/championService'
import {
  getGameReadyState,
  setGameReadyState,
  clearGameReadyState,
  getGameTimer,
  setGameTimer,
  clearGameTimer,
  getGamePreviews,
  setChampionPreview,
} from '../lib/redis'

export interface ServerToClientEvents {
  readyStateUpdate: (data: {
    gameId: string
    readyStates: { blue?: boolean; red?: boolean }
  }) => void
  draftStart: (data: { gameId: string; startTime: number }) => void
  draftActionUpdate: (data: { gameId: string; action: DraftAction }) => void
  timerUpdate: (data: { gameId: string; timeRemaining: number }) => void
  gameUpdated: (data: {
    gameId: string
    status: string
    winner?: 'BLUE' | 'RED'
    blueSide?: string
    redSide?: string
  }) => void
  gameCreated: (data: {
    gameId: string
    seriesId: string
    gameNumber: number
  }) => void
  seriesUpdated: (data: {
    seriesId: string
    status: string
    winner?: 'team1' | 'team2'
  }) => void
  championPreview: (data: {
    gameId: string
    position: number
    champion: string | null
  }) => void
  error: (data: { message: string }) => void
}

interface ClientToServerEvents {
  joinGame: (gameId: string) => void
  readyState: (data: {
    gameId: string
    side: 'blue' | 'red'
    isReady: boolean
  }) => void
  draftAction: (data: {
    gameId: string
    type: 'PICK' | 'BAN'
    phase: number
    team: 'BLUE' | 'RED'
    champion: string
    position: number
  }) => void
  setWinner: (data: { gameId: string; winner: 'BLUE' | 'RED' }) => void
  selectSide: (data: {
    seriesId: string
    gameNumber: number
    side: 'blue' | 'red'
    auth: string
  }) => void
  previewChampion: (data: {
    gameId: string
    position: number
    champion: string | null
  }) => void
}

interface InterServerEvents {}

interface SocketData extends WaspSocketData {
  token?: string
}

type WebSocketFn = WebSocketDefinition<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>

const PHASE_TIME_LIMIT = 30 // 30 seconds per pick/ban

// Keep track of active timers
const activeTimers: Record<string, NodeJS.Timeout> = {}

// Helper function to broadcast timer update
async function broadcastTimerUpdate(io: any, gameId: string, timeRemaining: number) {
  io.to(gameId).emit('timerUpdate', {
    gameId,
    timeRemaining,
  })
}

// Helper function to manage timers with Redis
async function startTimer(io: any, gameId: string) {
  // Clear existing interval if any
  if (activeTimers[gameId]) {
    clearInterval(activeTimers[gameId])
    delete activeTimers[gameId]
  }

  // Store the turn start time in Redis
  await setGameTimer(gameId, {
    turnStartedAt: Date.now(),
    phaseTimeLimit: PHASE_TIME_LIMIT,
  })

  // Emit initial timer state
  await broadcastTimerUpdate(io, gameId, PHASE_TIME_LIMIT)

  // Create interval to broadcast time updates
  const intervalId = setInterval(async () => {
    const timer = await getGameTimer(gameId)
    if (!timer) {
      clearInterval(activeTimers[gameId])
      delete activeTimers[gameId]
      return
    }

    const elapsed = Math.floor((Date.now() - timer.turnStartedAt) / 1000)
    const timeRemaining = Math.max(0, timer.phaseTimeLimit - elapsed)

    await broadcastTimerUpdate(io, gameId, timeRemaining)

    // Clear interval if time is up
    if (timeRemaining <= 0) {
      clearInterval(activeTimers[gameId])
      delete activeTimers[gameId]
      await clearGameTimer(gameId)
    }
  }, 1000)

  // Store the new interval
  activeTimers[gameId] = intervalId
}

// Helper function to reset timer
async function resetTimer(io: any, gameId: string) {
  await startTimer(io, gameId)
}

// Clean up function to clear all timers
function clearAllTimers() {
  Object.entries(activeTimers).forEach(([gameId, intervalId]) => {
    clearInterval(intervalId)
    delete activeTimers[gameId]
  })
}

interface GameWithRelations {
  id: string
  status: string
  gameNumber: number
  seriesId: string
  series?: {
    id: string
    fearlessDraft: boolean
    games: {
      gameNumber: number
      actions: {
        type: string
        champion: string
      }[]
    }[]
  }
  actions: {
    type: string
    champion: string
    position: number
  }[]
}

// Helper function to determine whose turn it is based on position
function getTeamForPosition(position: number): 'BLUE' | 'RED' {
  // Draft order: BLUE BAN, RED BAN, BLUE BAN, RED BAN, BLUE BAN, RED BAN
  //              BLUE PICK, RED PICK x2, BLUE PICK x2, RED PICK x2, BLUE PICK x2, RED PICK
  const draftOrder: ('BLUE' | 'RED')[] = [
    // First Ban Phase (0-5)
    'BLUE', 'RED', 'BLUE', 'RED', 'BLUE', 'RED',
    // First Pick Phase (6-11)
    'BLUE', 'RED', 'RED', 'BLUE', 'BLUE', 'RED',
    // Second Ban Phase (12-15)
    'RED', 'BLUE', 'RED', 'BLUE',
    // Second Pick Phase (16-19)
    'RED', 'BLUE', 'BLUE', 'RED'
  ]
  return draftOrder[position]
}

// Helper function to validate game state
async function validateGameState(gameId: string): Promise<GameWithRelations> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      series: {
        include: {
          games: {
            include: { actions: true },
          },
        },
      },
      actions: {
        orderBy: {
          position: 'asc',
        },
      },
    },
  })

  if (!game) {
    throw new Error('Game not found')
  }

  if (game.status !== 'IN_PROGRESS') {
    throw new Error('Game is not in progress')
  }

  return game as GameWithRelations
}

// Helper function to check if champion is valid for fearless draft
async function validateChampionForFearlessDraft(
  champion: string,
  game: GameWithRelations,
  type: 'PICK' | 'BAN',
) {
  if (game.series?.fearlessDraft && type === 'PICK') {
    const isChampionUsedInSeries = game.series.games
      .filter(g => g.gameNumber < game.gameNumber)
      .some(g =>
        g.actions.some(
          a => a.type === 'PICK' && a.champion === champion,
        ),
      )

    if (isChampionUsedInSeries) {
      throw new Error('Champion already used in series (fearless draft)')
    }
  }
}

// Helper function to validate draft action
async function validateDraftAction(
  game: GameWithRelations,
  team: 'BLUE' | 'RED',
  position: number,
) {
  // Validate position is next in sequence
  if (game.actions.length !== position) {
    throw new Error('Invalid draft position')
  }

  // Validate it's this team's turn
  const expectedTeam = getTeamForPosition(position)
  if (team !== expectedTeam) {
    throw new Error(`Not ${team}'s turn to draft. It's ${expectedTeam}'s turn.`)
  }
}

export const webSocketFn: WebSocketFn = (io, context) => {
  console.log('WebSocket server initialized')

  // Clean up any existing timers on server restart
  clearAllTimers()

  io.on('connection', async socket => {
    console.log('Client connected, socket id:', socket.id)

    socket.on('joinGame', async (gameId: string) => {
      console.log(`[WS] Client joined game ${gameId.slice(0, 8)}...`)
      socket.join(gameId)
      
      // Send current ready state to newly joined client
      const readyState = await getGameReadyState(gameId)
      io.to(gameId).emit('readyStateUpdate', {
        gameId,
        readyStates: readyState,
      })

      // Send current timer state if exists
      const timer = await getGameTimer(gameId)
      if (timer) {
        const elapsed = Math.floor((Date.now() - timer.turnStartedAt) / 1000)
        const timeRemaining = Math.max(0, timer.phaseTimeLimit - elapsed)
        await broadcastTimerUpdate(io, gameId, timeRemaining)
      }

      // Send current preview state if exists
      const previews = await getGamePreviews(gameId)
      Object.entries(previews).forEach(([position, champion]) => {
        // Emit to everyone in the room to ensure state is synced
        io.to(gameId).emit('championPreview', {
          gameId,
          position: parseInt(position),
          champion: champion as string | null,
        })
      })
    })

    socket.on('readyState', async ({ gameId, side, isReady }) => {
      console.log(
        `[WS] Ready state: ${side} team ${isReady ? 'ready' : 'not ready'}`,
      )

      // Get current ready state from Redis
      const readyState = await getGameReadyState(gameId)
      
      // Update ready state
      readyState[side] = isReady
      await setGameReadyState(gameId, readyState)

      // Emit ready state to all clients in the game room
      io.to(gameId).emit('readyStateUpdate', {
        gameId,
        readyStates: readyState,
      })

      // If both teams are ready, start the draft
      const bothTeamsReady = readyState.blue === true && readyState.red === true
      console.log(
        'Ready states:',
        readyState,
        'Both teams ready:',
        bothTeamsReady,
      )

      if (bothTeamsReady) {
        console.log('Both teams ready, starting draft for game:', gameId)
        try {
          // Update game status to IN_PROGRESS
          await prisma.game.update({
            where: { id: gameId },
            data: { status: 'IN_PROGRESS' },
          })

          // Start the timer
          await startTimer(io, gameId)

          // Emit draft start event
          io.to(gameId).emit('draftStart', {
            gameId,
            startTime: Date.now(),
          })

          // Clear ready states
          await clearGameReadyState(gameId)
        } catch (error) {
          console.error('Error starting draft:', error)
        }
      }
    })

    socket.on('draftAction', async ({ gameId, type, phase, team, champion, position }) => {
      console.log(`[WS] Draft action: ${team} ${type} ${champion} (pos: ${position})`)

      try {
        const game = await validateGameState(gameId)
        
        // Validate it's this team's turn
        await validateDraftAction(game, team, position)

        // Validate champion
        const champions = await context.entities.Champion.findMany()
        if (!champions.find((c: Champion) => c.id === champion)) {
          throw new Error('Invalid champion')
        }

        await validateChampionForFearlessDraft(champion, game, type)

        // Create the draft action
        const draftAction = await prisma.draftAction.create({
          data: {
            gameId,
            type,
            phase,
            team,
            champion,
            position,
          },
        })

        // Clear the preview for this position
        await setChampionPreview(gameId, position, null)

        // Emit the action
        io.to(gameId).emit('draftActionUpdate', {
          gameId,
          action: draftAction,
        })

        // Handle last action
        if (position === 19) {
          await handleLastAction(io, gameId)
        } else {
          await resetTimer(io, gameId)
        }
      } catch (error) {
        console.error('❌ Error handling draft action:', error)
        // Emit error back to client
        socket.emit('error', {
          message: error instanceof Error ? error.message : 'An error occurred during draft action',
        })
      }
    })

    socket.on('setWinner', async ({ gameId, winner }) => {
      try {
        // Get the game to validate it's in DRAFT_COMPLETE state
        const game = await prisma.game.findUnique({
          where: { id: gameId },
          include: {
            series: {
              include: {
                games: true,
              },
            },
          },
        })

        if (!game) {
          console.error('❌ Game not found')
          return
        }

        if (game.status !== 'DRAFT_COMPLETE') {
          console.error('❌ Game is not in DRAFT_COMPLETE state')
          return
        }

        console.log('✓ Game found and validated')

        // Update game with winner
        const updatedGame = await prisma.game.update({
          where: { id: gameId },
          data: {
            status: 'COMPLETED',
            winner,
          },
          include: {
            series: true,
          },
        })

        console.log('✓ Game updated with winner:', {
          id: updatedGame.id,
          status: updatedGame.status,
          winner: updatedGame.winner,
        })

        // Emit game updated event
        io.to(gameId).emit('gameUpdated', {
          gameId,
          status: updatedGame.status,
          winner: updatedGame.winner as 'BLUE' | 'RED' | undefined,
          blueSide: updatedGame.blueSide,
          redSide: updatedGame.redSide
        })

        // If game is completed, check if we need to create next game
        const series = game.series
        // Count wins for each team by checking if they were on the winning side in each game
        const team1Wins =
          series.games.filter(
            g =>
              (g.status === 'COMPLETED' &&
                g.winner === 'BLUE' &&
                g.blueSide === series.team1Name) ||
              (g.status === 'COMPLETED' &&
                g.winner === 'RED' &&
                g.redSide === series.team1Name),
          ).length +
          ((winner === 'BLUE' && game.blueSide === series.team1Name) ||
          (winner === 'RED' && game.redSide === series.team1Name)
            ? 1
            : 0)
        const team2Wins =
          series.games.filter(
            g =>
              (g.status === 'COMPLETED' &&
                g.winner === 'BLUE' &&
                g.blueSide === series.team2Name) ||
              (g.status === 'COMPLETED' &&
                g.winner === 'RED' &&
                g.redSide === series.team2Name),
          ).length +
          ((winner === 'BLUE' && game.blueSide === series.team2Name) ||
          (winner === 'RED' && game.redSide === series.team2Name)
            ? 1
            : 0)
        const gamesNeeded =
          series.format === 'BO5' ? 3 : series.format === 'BO3' ? 2 : 1

        console.log('Win counts:', {
          team1: series.team1Name,
          team2: series.team2Name,
          team1Wins,
          team2Wins,
          currentGame: {
            winner,
            blueSide: game.blueSide,
            redSide: game.redSide,
          },
        })

        // Check if someone has won the series (only if not in scrim block mode)
        if (
          !series.scrimBlock &&
          (team1Wins >= gamesNeeded || team2Wins >= gamesNeeded)
        ) {
          // Update series as completed
          const updatedSeries = await prisma.series.update({
            where: { id: series.id },
            data: {
              status: 'COMPLETED',
              winner: team1Wins > team2Wins ? 'team1' : 'team2',
            },
          })

          console.log('✓ Series completed:', {
            id: updatedSeries.id,
            status: updatedSeries.status,
            winner: updatedSeries.winner,
            team1Wins,
            team2Wins,
            gamesNeeded,
          })

          // Emit series updated event
          io.emit('seriesUpdated', {
            seriesId: series.id,
            status: updatedSeries.status,
            winner: updatedSeries.winner as 'team1' | 'team2' | undefined,
          })
        } else if (
          series.games.length <
          (series.format === 'BO5' ? 5 : series.format === 'BO3' ? 3 : 1)
        ) {
          // Only create next game if we haven't reached the maximum number of games
          const nextGameNumber = series.games.length + 1
          const nextGame = await prisma.game.create({
            data: {
              seriesId: series.id,
              gameNumber: nextGameNumber,
              blueSide: '',
              redSide: '',
              status: 'PENDING',
            },
          })

          console.log('✓ Created next game:', {
            id: nextGame.id,
            gameNumber: nextGame.gameNumber,
            maxGames:
              series.format === 'BO5' ? 5 : series.format === 'BO3' ? 3 : 1,
            currentGames: series.games.length + 1,
          })

          // Initialize ready states for the new game
          await setGameReadyState(nextGame.id, {})

          // Emit game created event
          io.emit('gameCreated', {
            gameId: nextGame.id,
            seriesId: series.id,
            gameNumber: nextGameNumber,
          })

          // Emit ready state update for the new game
          io.emit('readyStateUpdate', {
            gameId: nextGame.id,
            readyStates: {},
          })
        }
      } catch (error) {
        console.error('❌ Error setting winner:', error)
      }
    })

    socket.on('selectSide', async ({ seriesId, gameNumber, side, auth }) => {
      try {
        // First get the current game and series
        const currentGame = await prisma.game.findFirst({
          where: {
            seriesId,
            gameNumber,
          },
          include: {
            series: true,
          },
        })

        if (!currentGame) {
          console.error('Game not found')
          return
        }

        // Get the team making the selection from the auth token
        const isTeam1 = auth === currentGame.series.team1AuthToken
        console.log('Side selection:', {
          auth,
          team1Token: currentGame.series.team1AuthToken,
          team2Token: currentGame.series.team2AuthToken,
          isTeam1,
        })

        // The team making the selection is choosing which side they want to play on
        const updatedGame = await prisma.game.update({
          where: {
            id: currentGame.id,
          },
          data: {
            // If team1 is selecting:
            //   - blue side -> team1 on blue, team2 on red
            //   - red side -> team2 on blue, team1 on red
            // If team2 is selecting:
            //   - blue side -> team2 on blue, team1 on red
            //   - red side -> team1 on blue, team2 on red
            blueSide: isTeam1
              ? side === 'blue'
                ? currentGame.series.team1Name
                : currentGame.series.team2Name
              : side === 'blue'
                ? currentGame.series.team2Name
                : currentGame.series.team1Name,
            redSide: isTeam1
              ? side === 'blue'
                ? currentGame.series.team2Name
                : currentGame.series.team1Name
              : side === 'blue'
                ? currentGame.series.team1Name
                : currentGame.series.team2Name,
          },
        })

        // Emit a more complete game update
        io.emit('gameUpdated', {
          gameId: updatedGame.id,
          status: updatedGame.status,
          blueSide: updatedGame.blueSide,
          redSide: updatedGame.redSide
        })
      } catch (error) {
        console.error('Error selecting side:', error)
      }
    })

    socket.on('previewChampion', async ({ gameId, position, champion }) => {
      console.log(
        `[WS] Champion preview: ${
          champion || 'cleared'
        } for position ${position}`,
      )

      // Store preview in Redis
      await setChampionPreview(gameId, position, champion)

      // Broadcast preview to all clients in the game room (including sender)
      io.to(gameId).emit('championPreview', {
        gameId,
        position,
        champion,
      })
    })

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })
  })
}

async function handleLastAction(io: any, gameId: string) {
  try {
    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: { status: 'DRAFT_COMPLETE' },
      include: {
        actions: true,
        series: true,
      },
    })

    await clearGameTimer(gameId)

    io.to(gameId).emit('gameUpdated', {
      gameId,
      status: updatedGame.status,
    })
  } catch (error) {
    console.error('❌ Error updating game status to DRAFT_COMPLETE:', error)
  }
}
