import { type Game, type DraftAction } from 'wasp/entities'
import type { WaspSocketData } from 'wasp/server/webSocket'

declare module 'wasp/server/webSocket' {
  interface WaspSocketData {
    token?: string
  }
}

export type CreateSeries = {
  team1Name: string
  team2Name: string
  matchName: string
  format: 'BO1' | 'BO3' | 'BO5'
  fearlessDraft: boolean
}

export type UpdateGameArgs = {
  gameId: string
  status: Game['status']
  winner?: 'BLUE' | 'RED'
}

export type CreateDraftAction = {
  gameId: string
  type: 'PICK' | 'BAN'
  phase: 1 | 2 | 3 | 4
  team: 'BLUE' | 'RED'
  champion: string
  position: number
}

declare module 'wasp/server' {
  interface Context {
    entities: {
      Game: any
      Series: any
      DraftAction: any
    }
    user?: any
    webSocket?: WaspSocketData
  }
}

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
}
