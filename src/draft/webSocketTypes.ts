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

export interface ServerToClientEvents {
  readyStateUpdate: (data: ReadyStateUpdate) => void
  draftStart: (data: DraftStart) => void
}

export interface ClientToServerEvents {
  joinGame: (gameId: string) => void
  readyState: (data: ReadyState) => void
}

export interface InterServerEvents {} 
