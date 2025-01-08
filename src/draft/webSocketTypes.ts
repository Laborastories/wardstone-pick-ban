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
  readyStateUpdate: (data: ReadyStateUpdate) => void
  draftStart: (data: DraftStart) => void
  draftActionUpdate: (data: DraftActionUpdate) => void
}

export type ClientToServerEvents = {
  joinGame: (gameId: string) => void
  readyState: (data: ReadyState) => void
  draftAction: (data: DraftAction) => void
}

export type InterServerEvents = Record<string, never>

export type WebSocketFn = WebSocketDefinition<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents
> 
