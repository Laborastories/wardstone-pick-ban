import type { WebSocketDefinition, WaspSocketData } from 'wasp/server/webSocket'
import { prisma } from 'wasp/server'

type WebSocketFn = WebSocketDefinition<
  {
    joinGame: (gameId: string) => void
    readyState: (data: { gameId: string, side: 'blue' | 'red', isReady: boolean }) => void
    draftAction: (data: { gameId: string, type: 'PICK' | 'BAN', phase: number, team: 'BLUE' | 'RED', champion: string, position: number }) => void
  },
  {
    readyStateUpdate: (data: { gameId: string, readyStates: { blue?: boolean, red?: boolean } }) => void
    draftStart: (data: { gameId: string }) => void
    draftActionUpdate: (data: { gameId: string, action: { gameId: string, type: string, phase: number, team: string, champion: string, position: number } }) => void
  },
  Record<string, never>,
  WaspSocketData
>

// Store ready states in memory
const gameReadyStates: Record<string, { blue?: boolean; red?: boolean }> = {}

export const webSocketFn: WebSocketFn = (io) => {
  console.log('WebSocket server initialized')
  
  io.on('connection', (socket) => {
    console.log('Client connected, socket id:', socket.id)

    socket.on('joinGame', (gameId) => {
      console.log('Client joining game:', gameId)
      socket.join(gameId)
      console.log('Client joined game:', gameId)
      
      // If there are existing ready states for this game, send them to the new client
      if (gameReadyStates[gameId]) {
        socket.emit('readyStateUpdate', {
          gameId,
          readyStates: gameReadyStates[gameId]
        })
      }
    })

    socket.on('readyState', async ({ gameId, side, isReady }) => {
      console.log('Ready state update:', { gameId, side, isReady })

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
      if (gameReadyStates[gameId].blue && gameReadyStates[gameId].red) {
        console.log('Both teams ready, starting draft for game:', gameId)
        // Update game status to IN_PROGRESS
        await prisma.game.update({
          where: { id: gameId },
          data: { status: 'IN_PROGRESS' }
        })

        // Emit draft start event
        io.to(gameId).emit('draftStart', { gameId })

        // Clear ready states
        delete gameReadyStates[gameId]
      }
    })

    socket.on('draftAction', async ({ gameId, type, phase, team, champion, position }) => {
      console.log('Draft action:', { gameId, type, phase, team, champion, position })

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
          console.error('Game not found')
          return
        }

        // Validate game is in progress
        if (game.status !== 'IN_PROGRESS') {
          console.error('Game is not in progress')
          return
        }

        // Validate champion hasn't been picked or banned
        const championUsed = game.actions.some(action => action.champion === champion)
        if (championUsed) {
          console.error('Champion has already been picked or banned')
          return
        }

        // If fearless draft is enabled, check if champion was used in previous games
        if (game.series.fearlessDraft && position <= 10) { // Only check for picks, not bans
          const previousGames = await prisma.game.findMany({
            where: {
              seriesId: game.series.id,
              gameNumber: { lt: game.gameNumber }
            },
            include: {
              actions: true
            }
          })

          const championUsedInSeries = previousGames.some(g => 
            g.actions.some(a => a.champion === champion && a.type === 'PICK')
          )

          if (championUsedInSeries) {
            console.error('Champion has already been picked in this series')
            return
          }
        }

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

        // Emit the action to all clients in the game room
        io.to(gameId).emit('draftActionUpdate', {
          gameId,
          action: draftAction
        })
      } catch (error) {
        console.error('Error creating draft action:', error)
      }
    })

    socket.on('disconnect', () => {
      console.log('Client disconnected')
    })
  })
} 
