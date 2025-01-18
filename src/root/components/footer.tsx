import { Link } from 'wasp/client/router'
import { motion } from 'motion/react'
import { fadeIn } from '../../motion/transitionPresets'
import { Strategy, User as UserIcon } from '@phosphor-icons/react'
import { usePrefetch } from '../../lib/utils'
import { Button } from '../../client/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../client/components/ui/dropdown-menu'
import { Skeleton } from '../../client/components/ui/skeleton'
import { logout } from 'wasp/client/auth'
import { type User } from 'wasp/entities'
import { useState } from 'react'

interface FooterProps {
  user?: User | null
  userLoading?: boolean
}

const ScrollToTopLink = ({
  to,
  children,
  className,
}: {
  to: '/'
  children: React.ReactNode
  className?: string
}) => {
  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const prefetch = usePrefetch()

  return (
    <Link
      to={to}
      className={className}
      onClick={handleClick}
      onMouseEnter={() => prefetch(to, undefined, { assets: true })}
    >
      {children}
    </Link>
  )
}

const navigation = {
  main: [{ name: 'Home', href: '/' as const }],
  social: [
    {
      name: 'GitHub',
      href: 'https://github.com/Laborastories/wardstone-pick-ban',
      icon: 'GithubLogo',
    },
  ],
}

export function Footer({ user, userLoading }: FooterProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)

  return (
    <motion.div
      variants={fadeIn}
      initial='initial'
      animate='animate'
      className='relative z-50 mx-auto max-w-7xl'
    >
      <div className='px-4 py-2'>
        {/* Main footer container */}
        <div className='flex flex-col items-center gap-4'>
          {/* Work in Progress Banner */}
          <div className='text-center'>
            <span className='inline-flex items-center gap-2 rounded-md bg-muted/50 px-3 py-1 text-xs text-muted-foreground'>
              🚧 Scout Ahead is a work in progress. Please submit feedback via
              our{' '}
              <a
                href='https://github.com/Laborastories/wardstone-pick-ban/issues'
                target='_blank'
                rel='noopener noreferrer'
                className='font-medium text-foreground hover:underline'
              >
                GitHub repository
              </a>
              .
            </span>
          </div>

          {/* Bottom row with logo, links, and buttons */}
          <div className='flex items-center gap-4'>
            {/* Logo and copyright */}
            <div className='flex items-center gap-2'>
              <Strategy size={16} weight='fill' />
              <span className='text-xs text-muted-foreground'>
                &copy; {new Date().getFullYear()} SCOUT AHEAD
              </span>
            </div>

            {/* Navigation */}
            <nav className='flex gap-4' aria-label='Footer'>
              {navigation.main.map(item => (
                <ScrollToTopLink
                  key={item.name}
                  to={item.href}
                  className='text-xs text-muted-foreground transition-colors hover:text-foreground'
                >
                  {item.name}
                </ScrollToTopLink>
              ))}
            </nav>

            {/* Coffee button and user menu */}
            <div className='flex items-center gap-2'>
              <a
                href='https://www.buymeacoffee.com/wardbox'
                aria-label='Buy me a coffee'
              >
                <img
                  src='https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=☕&slug=wardbox&button_colour=404040&font_colour=ffffff&font_family=Inter&outline_colour=ffffff&coffee_colour=FFDD00'
                  alt='Buy me a coffee'
                />
              </a>

              {/* User Menu */}
              {userLoading ? (
                <div className='flex items-center'>
                  <Skeleton className='h-8 w-8' />
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
                        <Button
                          variant='outline'
                          size='icon'
                          aria-label='User menu'
                        >
                          <UserIcon size={16} />
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
                          <UserIcon size={16} />
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
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default Footer
