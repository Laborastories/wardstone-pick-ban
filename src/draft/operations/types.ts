import { type Game } from 'wasp/entities'
import { type WaspSocketData } from 'wasp/server/webSocket'

export type CreateSeries = {
  blueTeamName: string
  redTeamName: string
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
