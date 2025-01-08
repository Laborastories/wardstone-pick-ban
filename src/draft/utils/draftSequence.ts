// Draft sequence from instructions.md
const DRAFT_SEQUENCE = [
  // Phase 1: First Ban Phase (6 bans)
  { phase: 1, type: 'BAN', team: 'BLUE', position: 0 },
  { phase: 1, type: 'BAN', team: 'RED', position: 1 },
  { phase: 1, type: 'BAN', team: 'BLUE', position: 2 },
  { phase: 1, type: 'BAN', team: 'RED', position: 3 },
  { phase: 1, type: 'BAN', team: 'BLUE', position: 4 },
  { phase: 1, type: 'BAN', team: 'RED', position: 5 },

  // Phase 2: First Pick Phase (6 picks)
  { phase: 2, type: 'PICK', team: 'BLUE', position: 6 },
  { phase: 2, type: 'PICK', team: 'RED', position: 7 },
  { phase: 2, type: 'PICK', team: 'RED', position: 8 },
  { phase: 2, type: 'PICK', team: 'BLUE', position: 9 },
  { phase: 2, type: 'PICK', team: 'BLUE', position: 10 },
  { phase: 2, type: 'PICK', team: 'RED', position: 11 },

  // Phase 3: Second Ban Phase (4 bans)
  { phase: 3, type: 'BAN', team: 'RED', position: 12 },
  { phase: 3, type: 'BAN', team: 'BLUE', position: 13 },
  { phase: 3, type: 'BAN', team: 'RED', position: 14 },
  { phase: 3, type: 'BAN', team: 'BLUE', position: 15 },

  // Phase 4: Second Pick Phase (4 picks)
  { phase: 4, type: 'PICK', team: 'RED', position: 16 },
  { phase: 4, type: 'PICK', team: 'BLUE', position: 17 },
  { phase: 4, type: 'PICK', team: 'BLUE', position: 18 },
  { phase: 4, type: 'PICK', team: 'RED', position: 19 },
] as const

export type DraftAction = typeof DRAFT_SEQUENCE[number]
export type DraftPhase = 1 | 2 | 3 | 4
export type DraftTeam = 'BLUE' | 'RED'
export type DraftType = 'PICK' | 'BAN'

export function getCurrentTurn(actions: { position: number }[]): number {
  return actions.length
}

export function getNextAction(position: number): DraftAction | undefined {
  return DRAFT_SEQUENCE[position]
}

export function isTeamTurn(side: DraftTeam, position: number): boolean {
  const action = getNextAction(position)
  return action?.team === side
}

export function getPhaseDescription(phase: DraftPhase): string {
  switch (phase) {
    case 1:
      return 'First Ban Phase'
    case 2:
      return 'First Pick Phase'
    case 3:
      return 'Second Ban Phase'
    case 4:
      return 'Second Pick Phase'
    default:
      return 'Unknown Phase'
  }
}

export function getCurrentPhase(position: number): DraftPhase | undefined {
  return DRAFT_SEQUENCE[position]?.phase
}

export function getActionType(position: number): DraftType | undefined {
  return DRAFT_SEQUENCE[position]?.type
}

export function isPhaseComplete(phase: DraftPhase, actions: { phase: number }[]): boolean {
  return actions.filter(a => a.phase === phase).length === DRAFT_SEQUENCE.filter(a => a.phase === phase).length
}

export function isDraftComplete(actions: { position: number }[]): boolean {
  return actions.length === DRAFT_SEQUENCE.length
} 
