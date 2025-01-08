import { HttpError } from 'wasp/server'
import { type Series } from 'wasp/entities'
import { type GetSeries, type CreateSeries } from 'wasp/server/operations'

type SeriesArgs = {
  blueTeamName: string
  redTeamName: string
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
  const blueAuthToken = Math.random().toString(36).substring(2, 15)
  const redAuthToken = Math.random().toString(36).substring(2, 15)

  const series = await context.entities.Series.create({
    data: {
      blueTeamName: args.blueTeamName,
      redTeamName: args.redTeamName,
      matchName: args.matchName,
      format: args.format,
      fearlessDraft: args.fearlessDraft,
      blueAuthToken,
      redAuthToken,
      status: 'PENDING',
      games: {
        create: [
          {
            gameNumber: 1,
            blueSide: args.blueTeamName,
            redSide: args.redTeamName,
            status: 'PENDING'
          }
        ]
      }
    },
    include: {
      games: true
    }
  })

  return series
} 
