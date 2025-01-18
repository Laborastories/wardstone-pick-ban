import { useAuth } from 'wasp/client/auth'
import { motion } from 'motion/react'
import { fadeIn } from './motion/transitionPresets'
import { useQuery } from 'wasp/client/operations'
import { getUserSeries } from 'wasp/client/operations'
import { Link } from 'wasp/client/router'
import { Crown } from '@phosphor-icons/react'

export default function Profile() {
  const { data: user } = useAuth()
  const { data: series, isLoading } = useQuery(getUserSeries)

  return (
    <motion.div
      initial='initial'
      animate='animate'
      exit='exit'
      variants={fadeIn}
      className='mx-auto flex max-w-7xl flex-col gap-8 bg-background px-4 py-12 sm:px-6 sm:py-16 lg:px-8'
    >
      <h1 className='text-4xl font-bold'>Profile</h1>
      <div className='space-y-4'>
        <p>Username: {user?.username}</p>
        <p>Email: {user?.email}</p>
      </div>

      <div className='space-y-4'>
        <h2 className='text-2xl font-bold'>Your Drafts</h2>
        {isLoading ? (
          <div className='text-muted-foreground'>Loading drafts...</div>
        ) : !series?.length ? (
          <div className='text-muted-foreground'>No drafts found</div>
        ) : (
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {series.map(
              (s: {
                id: string
                games: Array<{
                  status: string
                  winner?: 'BLUE' | 'RED'
                  blueSide?: string
                  redSide?: string
                }>
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
              }) => {
                const team1Wins = s.games.filter(
                  (g: {
                    status: string
                    winner?: 'BLUE' | 'RED'
                    blueSide?: string
                    redSide?: string
                  }) =>
                    (g.status === 'COMPLETED' &&
                      g.winner === 'BLUE' &&
                      g.blueSide === s.team1Name) ||
                    (g.status === 'COMPLETED' &&
                      g.winner === 'RED' &&
                      g.redSide === s.team1Name),
                ).length

                const team2Wins = s.games.filter(
                  (g: {
                    status: string
                    winner?: 'BLUE' | 'RED'
                    blueSide?: string
                    redSide?: string
                  }) =>
                    (g.status === 'COMPLETED' &&
                      g.winner === 'BLUE' &&
                      g.blueSide === s.team2Name) ||
                    (g.status === 'COMPLETED' &&
                      g.winner === 'RED' &&
                      g.redSide === s.team2Name),
                ).length

                const gamesNeeded =
                  s.format === 'BO5' ? 3 : s.format === 'BO3' ? 2 : 1
                const isTeam1 = s.creatorId === user?.id
                const userTeamName = isTeam1 ? s.team1Name : s.team2Name
                const opponentName = isTeam1 ? s.team2Name : s.team1Name
                const userWins = isTeam1 ? team1Wins : team2Wins
                const opponentWins = isTeam1 ? team2Wins : team1Wins
                const hasWon = userWins >= gamesNeeded
                const hasLost = opponentWins >= gamesNeeded
                const authToken = isTeam1 ? s.team1AuthToken : s.team2AuthToken

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
                    className='group relative overflow-hidden rounded-lg border border-border bg-card p-6 shadow-md transition-all duration-200 hover:scale-[1.02] hover:border-primary hover:shadow-xl'
                  >
                    <div className='space-y-4'>
                      {/* Match Name */}
                      <div className='space-y-1'>
                        <div
                          className='truncate text-lg font-medium'
                          title={s.matchName}
                        >
                          {s.matchName}
                        </div>
                        <div className='text-sm text-muted-foreground'>
                          {new Date(s.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>

                      {/* Teams & Score */}
                      <div className='flex items-center justify-between gap-4'>
                        <div className='flex items-center gap-2'>
                          <span
                            className={`max-w-[100px] truncate font-medium ${hasWon ? 'text-green-500' : hasLost ? 'text-destructive' : ''}`}
                            title={userTeamName}
                          >
                            {userTeamName}
                          </span>
                          {hasWon && (
                            <Crown
                              className='text-green-500'
                              size={16}
                              weight='fill'
                            />
                          )}
                        </div>
                        <div className='font-bold'>
                          {userWins} - {opponentWins}
                        </div>
                        <div className='flex items-center gap-2'>
                          {hasLost && (
                            <Crown
                              className='text-destructive'
                              size={16}
                              weight='fill'
                            />
                          )}
                          <span
                            className={`max-w-[100px] truncate font-medium ${hasLost ? 'text-destructive' : ''}`}
                            title={opponentName}
                          >
                            {opponentName}
                          </span>
                        </div>
                      </div>

                      {/* Format & Status */}
                      <div className='flex items-center justify-between text-sm text-muted-foreground'>
                        <div className='flex items-center gap-2'>
                          <span>{s.format}</span>
                          {s.fearlessDraft && (
                            <span className='rounded bg-yellow-500/20 px-1.5 py-0.5 text-xs font-medium text-yellow-500'>
                              Fearless
                            </span>
                          )}
                          {s.scrimBlock && (
                            <span className='rounded bg-primary/20 px-1.5 py-0.5 text-xs font-medium text-primary'>
                              Scrim
                            </span>
                          )}
                        </div>
                        <span>{s.status}</span>
                      </div>
                    </div>
                  </Link>
                )
              },
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
