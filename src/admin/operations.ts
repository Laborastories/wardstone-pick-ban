import { HttpError } from 'wasp/server'
import { type GetAdminStats } from 'wasp/server/operations'
import { subHours } from 'date-fns'

type UserWithSeries = {
  id: string
  username: string
  email: string
  createdAt: Date
  updatedAt: Date
  createdSeries: {
    _count: {
      games: number
    }
  }[]
}

type SeriesWithTeams = {
  id: string
  createdAt: Date
  team1Name: string
  team2Name: string
  format: string
  status: string
}

type AdminStatsPayload = {
  totalUsers: number
  totalDrafts: number
  totalGamesPlayed: number
  activeUsers24h: number
  users: {
    id: string
    username: string
    email: string
    createdAt: string
    lastLoginAt: string
    totalDrafts: number
    totalGames: number
  }[]
  recentDrafts: {
    id: string
    createdAt: string
    team1Name: string
    team2Name: string
    format: string
    status: string
  }[]
}

export const getAdminStats: GetAdminStats<void, AdminStatsPayload> = async (
  args,
  context,
) => {
  if (!context.user?.isAdmin) {
    throw new HttpError(401, 'Unauthorized')
  }

  // Get all users with their draft and game counts
  const users = (await context.entities.User.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      createdAt: true,
      updatedAt: true,
      createdSeries: {
        select: {
          _count: {
            select: {
              games: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })) as UserWithSeries[]

  // Get recent drafts
  const recentDrafts = (await context.entities.Series.findMany({
    select: {
      id: true,
      createdAt: true,
      team1Name: true,
      team2Name: true,
      format: true,
      status: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  })) as SeriesWithTeams[]

  // Get active users in last 24h
  const activeUsers24h = await context.entities.User.count({
    where: {
      updatedAt: {
        gte: subHours(new Date(), 24),
      },
    },
  })

  // Get total games played
  const totalGamesPlayed = await context.entities.Game.count({
    where: {
      status: 'COMPLETED',
    },
  })

  // Get total drafts
  const totalDrafts = await context.entities.Series.count()

  return {
    totalUsers: users.length,
    totalDrafts,
    totalGamesPlayed,
    activeUsers24h,
    users: users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.updatedAt.toISOString(),
      totalDrafts: user.createdSeries.length,
      totalGames: user.createdSeries.reduce(
        (acc, series) => acc + series._count.games,
        0,
      ),
    })),
    recentDrafts: recentDrafts.map(draft => ({
      id: draft.id,
      createdAt: draft.createdAt.toISOString(),
      team1Name: draft.team1Name,
      team2Name: draft.team2Name,
      format: draft.format,
      status: draft.status,
    })),
  }
}

export type { AdminStatsPayload as AdminStats }
