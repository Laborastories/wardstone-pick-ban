import { HttpError } from 'wasp/server'
import { type Game, type Series } from 'wasp/entities'
import {
  type CreateSeries,
  type GetGame,
  type GetSeries,
} from 'wasp/server/operations'

type SeriesArgs = {
  team1Name: string
  team2Name: string
  matchName: string
  format: 'BO1' | 'BO3' | 'BO5'
  fearlessDraft: boolean
  scrimBlock: boolean
}

export const getSeries: GetSeries<{ seriesId: string }, Series> = async (
  args,
  context,
) => {
  const series = await context.entities.Series.findUnique({
    where: { id: args.seriesId },
    include: {
      games: {
        include: {
          actions: {
            select: {
              type: true,
              champion: true,
              team: true,
              position: true,
            },
          },
        },
      },
    },
  })

  if (!series) {
    throw new HttpError(404, 'Series not found')
  }

  return series as Series
}

export const createSeries: CreateSeries<SeriesArgs, Series> = async (
  args,
  context,
) => {
  // Generate random auth tokens
  const team1AuthToken = Math.random().toString(36).substring(2, 15)
  const team2AuthToken = Math.random().toString(36).substring(2, 15)

  const series = await context.entities.Series.create({
    data: {
      team1Name: args.team1Name,
      team2Name: args.team2Name,
      matchName: args.matchName,
      format: args.format,
      fearlessDraft: args.fearlessDraft,
      scrimBlock: args.scrimBlock,
      team1AuthToken: team1AuthToken,
      team2AuthToken: team2AuthToken,
      status: 'PENDING',
      ...(context.user && {
        creatorId: context.user.id,
      }),
      games: {
        create: [
          {
            gameNumber: 1,
            blueSide: '',
            redSide: '',
            status: 'PENDING',
          },
        ],
      },
    },
    include: {
      games: true,
      creator: true,
    },
  })

  return series
}

export const getGame: GetGame<
  { seriesId: string; gameNumber: string },
  Game
> = async ({ seriesId, gameNumber }, context) => {
  const game = await context.entities.Game.findFirst({
    where: {
      seriesId,
      gameNumber: parseInt(gameNumber),
    },
    include: {
      series: {
        include: {
          games: {
            include: {
              actions: {
                select: {
                  type: true,
                  champion: true,
                  team: true,
                  position: true,
                },
              },
            },
          },
        },
      },
      actions: {
        select: {
          type: true,
          champion: true,
          team: true,
          position: true,
        },
      },
    },
  })

  if (!game) {
    throw new HttpError(404, 'Game not found')
  }

  return game as Game
}

export const getUserSeries = async (args: void, context: any) => {
  if (!context.user) {
    throw new HttpError(401)
  }

  const series = await context.entities.Series.findMany({
    where: {
      creatorId: context.user.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      games: {
        orderBy: {
          gameNumber: 'asc',
        },
      },
    },
  })

  return series
}
