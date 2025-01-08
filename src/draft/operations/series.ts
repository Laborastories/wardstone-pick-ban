import { HttpError } from 'wasp/server'
import { type Series } from 'wasp/entities'
import { type GetSeries, type CreateSeries } from 'wasp/server/operations'

type SeriesArgs = {
  team1Name: string
  team2Name: string
  matchName: string
  format: 'BO1' | 'BO3' | 'BO5'
  fearlessDraft: boolean
}

export const getSeries: GetSeries<{ seriesId: string }, Series> = async (args, context) => {
  const { seriesId } = args

  const series = await context.entities.Series.findUnique({
    where: { id: seriesId },
    include: {
      games: {
        include: {
          actions: true
        }
      }
    }
  })

  if (!series) {
    throw new HttpError(404, 'Series not found')
  }

  return series
}

export const createSeries: CreateSeries<SeriesArgs, Series> = async (args, context) => {
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
      team1AuthToken: team1AuthToken,
      team2AuthToken: team2AuthToken,
      status: 'PENDING',
      ...(context.user && {
        creatorId: context.user.id
      }),
      games: {
        create: [
          {
            gameNumber: 1,
            blueSide: '',
            redSide: '',
            status: 'PENDING'
          }
        ]
      }
    },
    include: {
      games: true,
      creator: true
    }
  })

  return series
} 
