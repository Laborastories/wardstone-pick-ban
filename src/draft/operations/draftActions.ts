import { HttpError } from 'wasp/server'
import { type DraftAction, type Game } from 'wasp/entities'
import { type CreateDraftAction } from 'wasp/server/operations'

type DraftActionArgs = {
  gameId: string
  type: 'PICK' | 'BAN'
  phase: number
  team: 'BLUE' | 'RED'
  champion: string
  position?: number
}

type GameWithActions = Game & {
  series: {
    id: string
    fearlessDraft: boolean
  }
  actions: DraftAction[]
}


export const createDraftAction: CreateDraftAction<DraftActionArgs, DraftAction> = async (args, context) => {
  const { gameId, type, phase, team, champion, position } = args

  // Get the game and its actions to validate the draft action
  const game = await context.entities.Game.findUnique({
    where: { id: gameId },
    include: {
      series: true,
      actions: {
        orderBy: {
          position: 'asc'
        }
      }
    }
  }) as GameWithActions | null

  if (!game) {
    throw new HttpError(404, 'Game not found')
  }

  // Validate game is in progress
  if (game.status !== 'IN_PROGRESS') {
    throw new HttpError(400, 'Game is not in progress')
  }

  // Validate champion hasn't been picked or banned
  const championUsed = game.actions.some((action: DraftAction) => action.champion === champion)
  if (championUsed) {
    throw new HttpError(400, 'Champion has already been picked or banned')
  }

  // If fearless draft is enabled, check if champion was used in previous games
  if (game.series.fearlessDraft && position && position <= 10) { // Only check for picks, not bans
    const previousGames = await context.entities.Game.findMany({
      where: {
        seriesId: game.series.id,
        gameNumber: { lt: game.gameNumber }
      },
      include: {
        actions: true
      }
    }) as GameWithActions[]

    const championUsedInSeries = previousGames.some((g: GameWithActions) => 
      g.actions.some((a: DraftAction) => a.champion === champion && a.type === 'PICK')
    )

    if (championUsedInSeries) {
      throw new HttpError(400, 'Champion has already been picked in this series')
    }
  }

  // Create the draft action
  const draftAction = await context.entities.DraftAction.create({
    data: {
      gameId,
      type,
      phase,
      team,
      champion,
      position: position || 0 // Default to 0 if position is not provided
    }
  })

  return draftAction
} 
