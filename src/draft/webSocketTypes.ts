import type { WebSocketDefinition } from 'wasp/server/webSocket'

export type ReadyState = {
  gameId: string
  side: 'blue' | 'red'
  isReady: boolean
}

export type ReadyStateUpdate = {
  gameId: string
  readyStates: {
    blue?: boolean
    red?: boolean
  }
}

export type DraftStart = {
  gameId: string
}

export type DraftAction = {
  gameId: string
  type: 'PICK' | 'BAN'
  phase: 1 | 2 | 3 | 4
  team: 'BLUE' | 'RED'
  champion: string
  position: number
}

export type DraftActionUpdate = {
  gameId: string
  action: DraftAction
}

export type ServerToClientEvents = {
  readyStateUpdate: (data: { readyStates: { blue?: boolean, red?: boolean } }) => void
  draftStart: (data: { gameId: string }) => void
  draftActionUpdate: (data: { gameId: string }) => void
  timerUpdate: (data: { timeRemaining: number }) => void
  gameUpdated: (data: { gameId: string }) => void
  gameCreated: (data: { seriesId: string }) => void
  seriesUpdated: (data: { seriesId: string }) => void
  sideSelected: (data: { seriesId: string, gameNumber: number }) => void
}

export type ClientToServerEvents = {
  joinGame: (gameId: string) => void
  readyState: (data: { gameId: string, side: 'blue' | 'red', isReady: boolean }) => void
  draftAction: (data: { gameId: string, type: 'PICK' | 'BAN', phase: number, team: 'BLUE' | 'RED', champion: string, position: number }) => void
  setWinner: (data: { gameId: string, winner: 'BLUE' | 'RED' }) => void
  selectSide: (data: { seriesId: string, gameNumber: number, side: 'blue' | 'red' }) => void
}

export type InterServerEvents = Record<string, never>

export type WebSocketFn = WebSocketDefinition<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents
> 
