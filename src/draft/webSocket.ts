import type { WebSocketDefinition, WaspSocketData } from 'wasp/server/webSocket'
import { prisma } from 'wasp/server'
import { type DraftAction } from 'wasp/entities'
import { getChampions, type Champion } from '../draft/services/championService'

export interface ServerToClientEvents {
  readyStateUpdate: (data: { gameId: string, readyStates: { blue?: boolean, red?: boolean } }) => void
  draftStart: (data: { gameId: string, startTime: number }) => void
  draftActionUpdate: (data: { gameId: string, action: DraftAction }) => void
  timerUpdate: (data: { gameId: string, timeRemaining: number }) => void
  gameUpdated: (data: { gameId: string, status: string, winner?: 'BLUE' | 'RED' }) => void
  gameCreated: (data: { gameId: string, seriesId: string, gameNumber: number }) => void
  seriesUpdated: (data: { seriesId: string, status: string, winner?: 'team1' | 'team2' }) => void
  championPreview: (data: { gameId: string, position: number, champion: string | null }) => void
}

interface ClientToServerEvents {
  joinGame: (gameId: string) => void
  readyState: (data: { gameId: string, side: 'blue' | 'red', isReady: boolean }) => void
  draftAction: (data: { gameId: string, type: 'PICK' | 'BAN', phase: number, team: 'BLUE' | 'RED', champion: string, position: number }) => void
  setWinner: (data: { gameId: string, winner: 'BLUE' | 'RED' }) => void
  selectSide: (data: { seriesId: string, gameNumber: number, side: 'blue' | 'red', auth: string }) => void
  previewChampion: (data: { gameId: string, position: number, champion: string | null }) => void
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

// Store ready states and timers in memory
const gameReadyStates: Record<string, { blue?: boolean; red?: boolean }> = {}
const gameTimers: Record<string, {
  timeRemaining: number;
  intervalId?: NodeJS.Timeout;
}> = {}

const PHASE_TIME_LIMIT = 30 // 30 seconds per pick/ban

export const webSocketFn: WebSocketFn = (io) => {
  console.log('WebSocket server initialized')
  
  io.on('connection', (socket) => {
    console.log('Client connected, socket id:', socket.id, 'auth:', socket.data?.token)

    socket.on('joinGame', (gameId: string) => {
      console.log(`[WS] Client joined game ${gameId.slice(0, 8)}...`)
      socket.join(gameId)
    })

    socket.on('readyState', async ({ gameId, side, isReady }) => {
      console.log(`[WS] Ready state: ${side} team ${isReady ? 'ready' : 'not ready'}`)

      // Initialize game ready state if not exists
      if (!gameReadyStates[gameId]) {
        gameReadyStates[gameId] = {}
      }

      // Update ready state
      gameReadyStates[gameId][side] = isReady

      // Emit ready state to all clients in the game room
      io.to(gameId).emit('readyStateUpdate', {
        gameId,
        readyStates: gameReadyStates[gameId]
      })

      // If both teams are ready, start the draft
      const bothTeamsReady = gameReadyStates[gameId].blue === true && gameReadyStates[gameId].red === true
      console.log('Ready states:', gameReadyStates[gameId], 'Both teams ready:', bothTeamsReady)
      
      if (bothTeamsReady) {
        console.log('Both teams ready, starting draft for game:', gameId)
        try {
          // Update game status to IN_PROGRESS
          await prisma.game.update({
            where: { id: gameId },
            data: { status: 'IN_PROGRESS' }
          })

          // Start the timer
          startTimer(io, gameId)

          // Emit draft start event
          io.to(gameId).emit('draftStart', {
            gameId,
            startTime: Date.now()
          })

          // Clear ready states
          delete gameReadyStates[gameId]
        } catch (error) {
          console.error('Error starting draft:', error)
        }
      }
    })

    socket.on('draftAction', async ({ gameId, type, phase, team, champion, position }) => {
      console.log(`[WS] Draft action: ${team} ${type} ${champion} (pos: ${position})`)

      try {
        // Get the game and its actions to validate the draft action
        const game = await prisma.game.findUnique({
          where: { id: gameId },
          include: {
            series: true,
            actions: {
              orderBy: {
                position: 'asc'
              }
            }
          }
        })

        if (!game) {
          console.log(`[WS] ❌ Game ${gameId.slice(0, 8)}... not found`)
          return
        }
        console.log('✓ Game found:', { 
          id: game.id, 
          status: game.status,
          currentActions: game.actions.length 
        })

        // Validate game is in progress
        if (game.status !== 'IN_PROGRESS') {
          console.log(`[WS] ❌ Game ${game.id.slice(0, 8)}... is not in progress`)
          return
        }
        console.log('✓ Game is in progress')

        // Validate champion
        const champions = await getChampions()
        if (!champions.find((c: Champion) => c.id === champion)) {
          console.log(`[WS] ❌ Invalid champion: ${champion}`)
          return
        }
        console.log('✓ Champion is available')

        // Check fearless draft rules
        const series = await prisma.series.findUnique({
          where: { id: game.seriesId },
          include: {
            games: {
              include: { actions: true }
            }
          }
        })

        if (series?.fearlessDraft) {
          const isChampionUsed = series.games
            .filter(g => g.gameNumber < game.gameNumber)
            .some(g => g.actions.some(a => a.type === 'PICK' && a.champion === champion))

          if (isChampionUsed) {
            console.log(`[WS] ❌ Champion ${champion} already used in series (fearless draft)`)
            return
          }
        }
        console.log('✓ Champion is valid for fearless draft')

        // Create the draft action
        const draftAction = await prisma.draftAction.create({
          data: {
            gameId,
            type,
            phase,
            team,
            champion,
            position
          }
        })
        console.log('✓ Draft action created:', draftAction)

        // Emit the action to all clients in the game room
        console.log('Emitting draftActionUpdate event...')
        io.to(gameId).emit('draftActionUpdate', {
          gameId,
          action: draftAction
        })
        console.log('✓ draftActionUpdate emitted')

        // Check if this was the last action (position 19 is Red Pick 5 in 0-based indexing)
        if (position === 19) {
          console.log('\n=== Last Action Detected ===')
          console.log('Current game state:', {
            gameId,
            position,
            currentStatus: game.status,
            totalActions: game.actions.length + 1,
            team,
            type
          })

          try {
            console.log('Updating game status to DRAFT_COMPLETE...')
            // Update game status to DRAFT_COMPLETE
            const updatedGame = await prisma.game.update({
              where: { id: gameId },
              data: { status: 'DRAFT_COMPLETE' },
              include: {
                actions: true,
                series: true
              }
            })
            console.log('✓ Game status updated:', {
              id: updatedGame.id,
              status: updatedGame.status,
              actionsCount: updatedGame.actions.length,
              lastAction: updatedGame.actions[updatedGame.actions.length - 1]
            })

            // Clear the timer if it exists
            if (gameTimers[gameId]?.intervalId) {
              console.log('Clearing timer for game:', gameId)
              clearInterval(gameTimers[gameId].intervalId)
              delete gameTimers[gameId]
              console.log('✓ Timer cleared')
            }

            // Emit game updated event after everything else is done
            console.log('Emitting gameUpdated event...')
            io.to(gameId).emit('gameUpdated', {
              gameId,
              status: updatedGame.status
            })
            console.log('✓ gameUpdated event emitted')
          } catch (error) {
            console.error('❌ Error updating game status to DRAFT_COMPLETE:', error)
          }
        } else {
          // Reset timer for next action
          console.log('Resetting timer for next action...')
          resetTimer(io, gameId)
          console.log('✓ Timer reset')
        }
      } catch (error) {
        console.error('❌ Error handling draft action:', error)
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
                games: true
              }
            }
          }
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
            winner
          },
          include: {
            series: true
          }
        })

        console.log('✓ Game updated with winner:', {
          id: updatedGame.id,
          status: updatedGame.status,
          winner: updatedGame.winner
        })

        // Emit game updated event
        io.to(gameId).emit('gameUpdated', {
          gameId,
          status: updatedGame.status,
          winner: updatedGame.winner as 'BLUE' | 'RED' | undefined
        })

        // If game is completed, check if we need to create next game
        const series = game.series
        // Count wins for each team by checking if they were on the winning side in each game
        const team1Wins = series.games.filter(g => 
          (g.status === 'COMPLETED' && g.winner === 'BLUE' && g.blueSide === series.team1Name) || 
          (g.status === 'COMPLETED' && g.winner === 'RED' && g.redSide === series.team1Name)
        ).length + (
          (winner === 'BLUE' && game.blueSide === series.team1Name) || 
          (winner === 'RED' && game.redSide === series.team1Name) ? 1 : 0
        )
        const team2Wins = series.games.filter(g => 
          (g.status === 'COMPLETED' && g.winner === 'BLUE' && g.blueSide === series.team2Name) || 
          (g.status === 'COMPLETED' && g.winner === 'RED' && g.redSide === series.team2Name)
        ).length + (
          (winner === 'BLUE' && game.blueSide === series.team2Name) || 
          (winner === 'RED' && game.redSide === series.team2Name) ? 1 : 0
        )
        const gamesNeeded = series.format === 'BO5' ? 3 : (series.format === 'BO3' ? 2 : 1)

        console.log('Win counts:', {
          team1: series.team1Name,
          team2: series.team2Name,
          team1Wins,
          team2Wins,
          currentGame: {
            winner,
            blueSide: game.blueSide,
            redSide: game.redSide
          }
        })

        // Check if someone has won the series
        if (team1Wins >= gamesNeeded || team2Wins >= gamesNeeded) {
          // Update series as completed
          const updatedSeries = await prisma.series.update({
            where: { id: series.id },
            data: {
              status: 'COMPLETED',
              winner: team1Wins > team2Wins ? 'team1' : 'team2'
            }
          })

          console.log('✓ Series completed:', {
            id: updatedSeries.id,
            status: updatedSeries.status,
            winner: updatedSeries.winner,
            team1Wins,
            team2Wins,
            gamesNeeded
          })

          // Emit series updated event
          io.emit('seriesUpdated', {
            seriesId: series.id,
            status: updatedSeries.status,
            winner: updatedSeries.winner as 'team1' | 'team2' | undefined
          })
        } else if (series.games.length < (series.format === 'BO5' ? 5 : (series.format === 'BO3' ? 3 : 1))) {
          // Only create next game if we haven't reached the maximum number of games
          const nextGameNumber = series.games.length + 1
          const nextGame = await prisma.game.create({
            data: {
              seriesId: series.id,
              gameNumber: nextGameNumber,
              blueSide: '',
              redSide: '',
              status: 'PENDING'
            }
          })

          console.log('✓ Created next game:', {
            id: nextGame.id,
            gameNumber: nextGame.gameNumber,
            maxGames: series.format === 'BO5' ? 5 : (series.format === 'BO3' ? 3 : 1),
            currentGames: series.games.length + 1
          })

          // Emit game created event
          io.emit('gameCreated', {
            gameId: nextGame.id,
            seriesId: series.id,
            gameNumber: nextGameNumber
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
            gameNumber
          },
          include: {
            series: true
          }
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
          isTeam1
        })

        // The team making the selection is choosing which side they want to play on
        const updatedGame = await prisma.game.update({
          where: { 
            id: currentGame.id
          },
          data: {
            // If team1 is selecting:
            //   - blue side -> team1 on blue, team2 on red
            //   - red side -> team2 on blue, team1 on red
            // If team2 is selecting:
            //   - blue side -> team2 on blue, team1 on red
            //   - red side -> team1 on blue, team2 on red
            blueSide: isTeam1 
              ? (side === 'blue' ? currentGame.series.team1Name : currentGame.series.team2Name)
              : (side === 'blue' ? currentGame.series.team2Name : currentGame.series.team1Name),
            redSide: isTeam1
              ? (side === 'blue' ? currentGame.series.team2Name : currentGame.series.team1Name)
              : (side === 'blue' ? currentGame.series.team1Name : currentGame.series.team2Name)
          }
        })

        io.emit('gameUpdated', {
          gameId: updatedGame.id,
          status: updatedGame.status
        })
      } catch (error) {
        console.error('Error selecting side:', error)
      }
    })

    socket.on('previewChampion', ({ gameId, position, champion }) => {
      console.log(`[WS] Champion preview: ${champion || 'cleared'} for position ${position}`)
      // Broadcast preview to all other clients in the game room
      socket.to(gameId).emit('championPreview', {
        gameId,
        position,
        champion
      })
    })

    socket.on('disconnect', () => {
      console.log('Client disconnected')
    })
  })
}

// Timer management functions
function startTimer(io: any, gameId: string) {
  // Clear existing timer if any
  if (gameTimers[gameId]?.intervalId) {
    clearInterval(gameTimers[gameId].intervalId)
  }

  // Initialize timer state
  gameTimers[gameId] = {
    timeRemaining: PHASE_TIME_LIMIT,
    intervalId: setInterval(() => {
      // Decrement timer
      gameTimers[gameId].timeRemaining--

      // Emit timer update
      io.to(gameId).emit('timerUpdate', {
        gameId,
        timeRemaining: gameTimers[gameId].timeRemaining
      })

      // Stop at 0 but don't clear the timer
      if (gameTimers[gameId].timeRemaining <= 0) {
        clearInterval(gameTimers[gameId].intervalId)
        gameTimers[gameId].intervalId = undefined
      }
    }, 1000)
  }
}

function resetTimer(io: any, gameId: string) {
  startTimer(io, gameId)
} 
