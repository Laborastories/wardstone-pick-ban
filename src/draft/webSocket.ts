import type { WebSocketDefinition, WaspSocketData } from 'wasp/server/webSocket'
import { prisma } from 'wasp/server'

type WebSocketFn = WebSocketDefinition<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  WaspSocketData
>

interface ServerToClientEvents {
  readyStateUpdate: (data: { gameId: string, readyStates: { blue?: boolean, red?: boolean } }) => void
  draftStart: (data: { gameId: string }) => void
}

interface ClientToServerEvents {
  joinGame: (gameId: string) => void
  readyState: (data: { gameId: string, side: 'blue' | 'red', isReady: boolean }) => void
}

interface InterServerEvents {}

// Store ready states in memory
const gameReadyStates: Record<string, { blue?: boolean; red?: boolean }> = {}

export const webSocketFn: WebSocketFn = (io) => {
  console.log('WebSocket server initialized')
  
  io.on('connection', (socket) => {
    console.log('Client connected, socket id:', socket.id)

    socket.on('joinGame', (gameId: string) => {
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

    socket.on('readyState', async (data) => {
      console.log('Ready state update:', data)
      const { gameId, side, isReady } = data

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

    socket.on('disconnect', () => {
      console.log('Client disconnected')
    })
  })
} 
