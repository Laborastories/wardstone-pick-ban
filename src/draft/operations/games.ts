import { HttpError } from 'wasp/server'
import { type Game } from 'wasp/entities'
import { type GetGame, type UpdateGame } from 'wasp/server/operations'
import { type UpdateGameArgs } from './types'

type GetGameArgs = {
  seriesId: string
  gameNumber: string
  side?: 'blue' | 'red'
  auth?: string
}

export const getGame: GetGame<GetGameArgs, Game> = async (args, context) => {
  const { seriesId, gameNumber } = args

  // Get the game and its series
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
              actions: true,
            },
            orderBy: {
              gameNumber: 'asc',
            },
          },
        },
      },
      actions: {
        orderBy: {
          position: 'asc',
        },
      },
    },
  })

  if (!game) {
    throw new HttpError(404, 'Game not found')
  }

  console.log('Game data:', {
    id: game.id,
    status: game.status,
    seriesId: game.seriesId,
    gameNumber: game.gameNumber,
    seriesGames: game.series.games.length,
    actions: game.actions.length,
  })

  return game
}

export const updateGame: UpdateGame<UpdateGameArgs, Game> = async (
  args,
  context,
) => {
  const { gameId, status, winner } = args

  const game = await context.entities.Game.update({
    where: { id: gameId },
    data: {
      status,
      winner,
    },
    include: {
      series: true,
      actions: true,
    },
  })

  // If game is completed, create next game in series if needed
  if (status === 'COMPLETED' && winner) {
    const series = await context.entities.Series.findUnique({
      where: { id: game.seriesId },
      include: { games: true },
    })

    if (!series) throw new HttpError(404, 'Series not found')

    // Count wins for each team
    const blueWins = series.games.filter(
      (g: Game) => g.winner === 'BLUE',
    ).length
    const redWins = series.games.filter((g: Game) => g.winner === 'RED').length

    // Calculate games needed to win based on format
    const gamesNeeded =
      series.format === 'BO5' ? 3 : series.format === 'BO3' ? 2 : 1

    // If neither team has won enough games yet, create next game
    if (blueWins < gamesNeeded && redWins < gamesNeeded) {
      const nextGameNumber = series.games.length + 1
      await context.entities.Game.create({
        data: {
          seriesId: series.id,
          gameNumber: nextGameNumber,
          // Swap sides for next game
          blueSide: game.redSide,
          redSide: game.blueSide,
          status: 'PENDING',
        },
      })
    } else {
      // Update series as completed with winner
      await context.entities.Series.update({
        where: { id: series.id },
        data: {
          status: 'COMPLETED',
          winner: blueWins > redWins ? 'BLUE' : 'RED',
        },
      })
    }
  }

  return game
}
