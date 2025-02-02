import { type GetChampionsFromDb } from 'wasp/server/operations'
import { type Champion } from 'wasp/entities'

export const getChampionsFromDb: GetChampionsFromDb<void, Champion[]> = async (
  args,
  context,
) => {
  const champions = await context.entities.Champion.findMany({
    orderBy: {
      name: 'asc',
    },
  })
  return champions
}
