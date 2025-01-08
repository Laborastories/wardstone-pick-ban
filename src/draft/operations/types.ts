export type CreateSeries = {
  blueTeamName: string
  redTeamName: string
  matchName: string
  format: 'BO1' | 'BO3' | 'BO5'
}

export type UpdateGame = {
  gameId: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
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
