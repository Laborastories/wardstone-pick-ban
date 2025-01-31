import { useAuth } from 'wasp/client/auth'
import { motion } from 'motion/react'
import { fadeIn } from './motion/transitionPresets'
import { useQuery } from 'wasp/client/operations'
import { getUserSeries } from 'wasp/client/operations'
import { Link } from 'wasp/client/router'
import { Crown, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { Button } from './client/components/ui/button'
import { useState } from 'react'

interface Game {
  status: string
  winner?: 'BLUE' | 'RED'
  blueSide?: string
  redSide?: string
}

interface Series {
  id: string
  games: Game[]
  team1Name: string
  team2Name: string
  format: string
  creatorId: string
  team1AuthToken: string
  team2AuthToken: string
  matchName: string
  createdAt: string
  status: string
  fearlessDraft: boolean
  scrimBlock: boolean
}

export default function Profile() {
  const { data: user } = useAuth()
  const { data: series, isLoading } = useQuery(getUserSeries)
  const [currentPage, setCurrentPage] = useState(1)
  const gamesPerPage = 10

  // Group series by week
  const groupedSeries = series?.reduce((acc: Record<string, Series[]>, s: Series) => {
    const date = new Date(s.createdAt)
    const weekStart = new Date(date)
    weekStart.setHours(0, 0, 0, 0)
    weekStart.setDate(date.getDate() - date.getDay()) // Start of week (Sunday)
    const weekKey = weekStart.toISOString()

    if (!acc[weekKey]) {
      acc[weekKey] = []
    }
    acc[weekKey].push(s)
    return acc
  }, {})

  // Flatten and sort all series for pagination
  const allSeries = (Object.entries(groupedSeries || {}) as [string, Series[]][])
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
    .flatMap(([, weekSeries]) =>
      weekSeries.sort(
        (a: Series, b: Series) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    )

  const totalPages = Math.ceil((allSeries?.length || 0) / gamesPerPage)
  const startIndex = (currentPage - 1) * gamesPerPage
  const currentSeries = allSeries?.slice(startIndex, startIndex + gamesPerPage)

  // Group current page series by week
  const currentGroupedSeries = currentSeries?.reduce(
    (acc: Record<string, Series[]>, s: Series) => {
      const date = new Date(s.createdAt)
      const weekStart = new Date(date)
      weekStart.setHours(0, 0, 0, 0)
      weekStart.setDate(date.getDate() - date.getDay())
      const weekKey = weekStart.toISOString()

      if (!acc[weekKey]) {
        acc[weekKey] = []
      }
      acc[weekKey].push(s)
      return acc
    },
    {},
  )

  return (
    <motion.div
      initial='initial'
      animate='animate'
      exit='exit'
      variants={fadeIn}
      className='mx-auto flex max-w-[600px] flex-col gap-24 bg-background px-4 py-12'
    >
      {/* Profile Header */}
      <div className='space-y-6'>
        <h1 className='text-2xl sm:text-4xl font-bold'>Welcome back, {user?.username}!</h1>
      </div>

      {/* Drafts Section */}
      <div className='space-y-8'>
        <h2 className='text-xl font-bold'>Your Drafts</h2>
        {isLoading ? (
          <div className='text-center text-muted-foreground'>Loading drafts...</div>
        ) : !series?.length ? (
          <div className='text-center text-muted-foreground'>No drafts found</div>
        ) : (
          <div className='space-y-8'>
            {/* Draft List */}
            <div className='space-y-8'>
              {Object.entries(currentGroupedSeries || {})
                .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                .map(([weekStart, weekSeries]: [string, Series[]]) => (
                  <div key={weekStart} className='space-y-3'>
                    <h3 className='text-sm font-medium text-muted-foreground'>
                      Week of{' '}
                      {new Date(weekStart).toLocaleDateString(undefined, {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </h3>
                    <div className='divide-y divide-border rounded-lg border border-border bg-card'>
                      {weekSeries
                        .sort(
                          (a: Series, b: Series) =>
                            new Date(b.createdAt).getTime() -
                            new Date(a.createdAt).getTime(),
                        )
                        .map((s: Series) => {
                          const team1Wins = s.games.filter(
                            (g: Game) =>
                              (g.status === 'COMPLETED' &&
                                g.winner === 'BLUE' &&
                                g.blueSide === s.team1Name) ||
                              (g.status === 'COMPLETED' &&
                                g.winner === 'RED' &&
                                g.redSide === s.team1Name),
                          ).length

                          const team2Wins = s.games.filter(
                            (g: Game) =>
                              (g.status === 'COMPLETED' &&
                                g.winner === 'BLUE' &&
                                g.blueSide === s.team2Name) ||
                              (g.status === 'COMPLETED' &&
                                g.winner === 'RED' &&
                                g.redSide === s.team2Name),
                          ).length

                          const isTeam1 = s.creatorId === user?.id
                          const userTeamName = isTeam1 ? s.team1Name : s.team2Name
                          const opponentName = isTeam1 ? s.team2Name : s.team1Name
                          const userWins = isTeam1 ? team1Wins : team2Wins
                          const opponentWins = isTeam1 ? team2Wins : team1Wins
                          const authToken = isTeam1
                            ? s.team1AuthToken
                            : s.team2AuthToken

                          return (
                            <Link
                              key={s.id}
                              to='/draft/:seriesId/:gameNumber/:team?/:auth?'
                              params={{
                                seriesId: s.id,
                                gameNumber: '1',
                                team: isTeam1 ? 'team1' : 'team2',
                                auth: authToken,
                              }}
                              className='group flex flex-col gap-3 p-3 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between sm:gap-4'
                            >
                              {/* Left side - Match info */}
                              <div className='flex w-full flex-col gap-1 sm:w-[180px]'>
                                <div
                                  className='truncate text-base font-bold'
                                  title={s.matchName}
                                >
                                  {s.matchName}
                                </div>
                                <div className='flex items-center gap-1.5 text-xs font-sans'>
                                  <span className='rounded-sm bg-zinc-800 px-1.5 py-0.5 font-medium text-zinc-400'>
                                    {s.format}
                                  </span>
                                  {s.fearlessDraft && (
                                    <span className='rounded-sm bg-amber-950 px-1.5 py-0.5 font-medium text-amber-500'>
                                      F
                                    </span>
                                  )}
                                  {s.scrimBlock && (
                                    <span className='rounded-sm bg-indigo-950 px-1.5 py-0.5 font-medium text-indigo-400'>
                                      S
                                    </span>
                                  )}
                                </div>
                                <div className='font-sans text-[11px] text-muted-foreground/75'>
                                  {new Date(s.createdAt).toLocaleDateString(undefined, {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                  {s.status !== 'COMPLETED' && (
                                    <span className='ml-1.5 text-muted-foreground/50'>
                                      • {s.status.toLowerCase()}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Scoreboard */}
                              <div className='flex items-center justify-between gap-3 sm:justify-end'>
                                {/* Left Team */}
                                <div className='flex w-[100px] items-center justify-end sm:w-[120px]'>
                                  <span
                                    className={`truncate text-sm font-medium font-sans ${s.status === 'COMPLETED'
                                      ? userWins > opponentWins
                                        ? 'text-green-500'
                                        : userWins < opponentWins
                                          ? 'text-destructive'
                                          : ''
                                      : ''
                                      }`}
                                    title={userTeamName}
                                  >
                                    {userTeamName}
                                  </span>
                                  {s.status === 'COMPLETED' && userWins > opponentWins && (
                                    <Crown
                                      className='ml-1.5 text-green-500 shrink-0'
                                      size={14}
                                      weight='fill'
                                    />
                                  )}
                                </div>

                                {/* Score */}
                                <div className='flex h-6 w-[48px] shrink-0 items-center justify-center rounded bg-zinc-800/50 px-2 font-mono text-sm font-bold tabular-nums'>
                                  {userWins}-{opponentWins}
                                </div>

                                {/* Right Team */}
                                <div className='flex w-[100px] items-center sm:w-[120px]'>
                                  {s.status === 'COMPLETED' && opponentWins > userWins && (
                                    <Crown
                                      className='mr-1.5 text-green-500 shrink-0'
                                      size={14}
                                      weight='fill'
                                    />
                                  )}
                                  <span
                                    className={`truncate text-sm font-medium font-sans ${s.status === 'COMPLETED'
                                      ? opponentWins > userWins
                                        ? 'text-green-500'
                                        : opponentWins < userWins
                                          ? 'text-destructive'
                                          : ''
                                      : ''
                                      }`}
                                    title={opponentName}
                                  >
                                    {opponentName}
                                  </span>
                                </div>
                              </div>
                            </Link>
                          )
                        })}
                    </div>
                  </div>
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className='flex items-center justify-between border-t border-border pt-4'>
                <div className='text-sm text-muted-foreground'>
                  Page {currentPage} of {totalPages}
                </div>
                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <CaretLeft className='mr-1' size={14} />
                    Previous
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <CaretRight className='ml-1' size={14} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
