import * as React from 'react'
import { useState } from 'react'
import { cn } from '../../lib/utils'
import { Link } from 'wasp/client/router'
import { Strategy, User as UserIcon, Copy } from '@phosphor-icons/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../client/components/ui/dropdown-menu'
import { Button } from '../../client/components/ui/button'
import { logout } from 'wasp/client/auth'
import { type User, type Series, type Game } from 'wasp/entities'
import { Skeleton } from '../../client/components/ui/skeleton'
import { useToast } from '../../hooks/use-toast'

interface NavProps extends React.HTMLAttributes<HTMLElement> {
  user?: User | null
  userLoading?: boolean
  series?: Series & {
    games: (Game & {
      actions: {
        type: string
        champion: string
        team: 'BLUE' | 'RED'
        position: number
      }[]
    })[]
  }
  currentGameNumber?: number
  side?: 'team1' | 'team2'
}

const Nav = React.forwardRef<HTMLElement, NavProps>(
  ({ user, userLoading, series, currentGameNumber, ...props }, ref) => {
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const { toast } = useToast()

    const handleCopyUrls = () => {
      if (!series) return
      const baseUrl = window.location.origin
      const urls = `${series.team1Name}:
${baseUrl}/draft/${series.id}/1/team1/${series.team1AuthToken}

${series.team2Name}:
${baseUrl}/draft/${series.id}/1/team2/${series.team2AuthToken}

Spectator URL:
${baseUrl}/draft/${series.id}/1`

      navigator.clipboard.writeText(urls).then(() => {
        toast({
          title: 'URLs Copied',
          description: 'All draft URLs have been copied to your clipboard.',
        })
      })
    }

    // Calculate series info
    const team1Wins = series?.games.filter(
      g =>
        (g.status === 'COMPLETED' &&
          g.winner === 'BLUE' &&
          g.blueSide === series.team1Name) ||
        (g.status === 'COMPLETED' &&
          g.winner === 'RED' &&
          g.redSide === series.team1Name),
    ).length || 0

    const team2Wins = series?.games.filter(
      g =>
        (g.status === 'COMPLETED' &&
          g.winner === 'BLUE' &&
          g.blueSide === series.team2Name) ||
        (g.status === 'COMPLETED' &&
          g.winner === 'RED' &&
          g.redSide === series.team2Name),
    ).length || 0

    return (
      <nav
        ref={ref}
        className={cn(
          'sticky top-0 z-50 mx-auto flex w-full max-w-7xl items-center justify-between bg-background p-3 px-4 lg:px-6',
          props.className,
        )}
        {...props}
      >
        <div className='flex items-center space-x-4 lg:space-x-8'>
          <Link to='/' className='flex items-center space-x-2'>
            <Strategy size={24} />
            <span className='font-bold'>SCOUT AHEAD</span>
          </Link>
        </div>

        {/* Series Info */}
        {series && currentGameNumber && (
          <div className='flex-1'>
            <div className='relative mx-auto max-w-2xl'>
              <div className='absolute right-0 top-0'>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={handleCopyUrls}
                  className='h-8 w-8'
                >
                  <Copy size={14} />
                </Button>
              </div>
              <div className='flex flex-col items-center justify-center gap-2'>
                {/* Score and Team Names */}
                <div className='flex items-center justify-center gap-4 text-xl'>
                  <div className='w-[120px] text-right font-bold text-[hsl(var(--team-blue))]'>
                    {series.team1Name}
                  </div>
                  <div className='flex min-w-[80px] items-center justify-center gap-2 font-bold'>
                    <span>{team1Wins}</span>
                    <span className='text-muted-foreground'>-</span>
                    <span>{team2Wins}</span>
                  </div>
                  <div className='w-[120px] text-left font-bold text-[hsl(var(--team-red))]'>
                    {series.team2Name}
                  </div>
                </div>

                {/* Game Numbers */}
                <div className='flex gap-2'>
                  {Array.from({
                    length: series.format === 'BO5' ? 5 : series.format === 'BO3' ? 3 : 1,
                  }).map((_, i) => {
                    const gameNum = i + 1
                    const isCurrentGame = gameNum === currentGameNumber
                    return (
                      <div
                        key={gameNum}
                        className={cn(
                          'rounded px-3 py-1 text-sm',
                          isCurrentGame
                            ? 'bg-accent text-accent-foreground'
                            : 'text-muted-foreground'
                        )}
                      >
                        Game {gameNum}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Menu */}
        <div className='flex items-center'>
          {userLoading ? (
            <div className='flex items-center'>
              <Skeleton className='h-10 w-10' />
            </div>
          ) : (
            <div className='flex items-center animate-in fade-in'>
              {user ? (
                <DropdownMenu
                  open={dropdownOpen}
                  onOpenChange={setDropdownOpen}
                  modal={false}
                >
                  <DropdownMenuTrigger asChild>
                    <Button variant='outline' size='icon' aria-label='User menu'>
                      <UserIcon size={24} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
                    <Link
                      to='/profile/:id'
                      params={{ id: user.id }}
                      onClick={() => setDropdownOpen(false)}
                      className='cursor-pointer'
                    >
                      <DropdownMenuItem>Profile</DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className='cursor-pointer text-red-600'
                      onClick={() => {
                        setDropdownOpen(false)
                        logout()
                      }}
                    >
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <DropdownMenu
                  open={dropdownOpen}
                  onOpenChange={setDropdownOpen}
                  modal={false}
                >
                  <DropdownMenuTrigger asChild>
                    <Button variant='outline' size='icon'>
                      <UserIcon size={24} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
                    <Link to='/login'>
                      <DropdownMenuItem
                        onClick={() => setDropdownOpen(false)}
                        className='cursor-pointer'
                      >
                        Log in
                      </DropdownMenuItem>
                    </Link>
                    <Link to='/signup'>
                      <DropdownMenuItem
                        onClick={() => setDropdownOpen(false)}
                        className='cursor-pointer'
                      >
                        Sign up
                      </DropdownMenuItem>
                    </Link>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
      </nav>
    )
  },
)

Nav.displayName = 'Nav'

export { Nav }
