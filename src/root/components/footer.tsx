import { Link } from 'wasp/client/router'
import { motion } from 'motion/react'
import { fadeIn } from '../../motion/transitionPresets'
import {
  Strategy,
  User as UserIcon,
  Coffee,
  DiscordLogo,
  Plus,
} from '@phosphor-icons/react'
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

export function Footer({ user, userLoading }: FooterProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)

  return (
    <motion.footer
      variants={fadeIn}
      initial='initial'
      animate='animate'
      className='relative z-50 w-full border-t bg-background'
    >
      <div className='mx-auto w-full max-w-7xl px-4 py-6'>
        {/* Wardstone CTA */}
        <div className='mb-6 flex justify-center'>
          <a
            href='https://wardstone.io'
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-2 rounded-md bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-700'
          >
            <img
              src='https://wardstone.io/favicon.ico'
              alt='Wardstone'
              className='h-4 w-4'
            />
            Manage your team with Wardstone
          </a>
        </div>

        <div className='flex flex-col items-center gap-6 sm:flex-row sm:justify-between'>
          {/* Logo and copyright */}
          <div className='flex flex-col items-center gap-2 sm:items-start'>
            <Link
              to='/'
              className='group flex items-center gap-3 transition-opacity hover:opacity-80'
            >
              <Strategy size={24} weight='fill' className='text-foreground' />
              <span className='text-base font-medium text-foreground'>
                SCOUT AHEAD
              </span>
            </Link>
            <span className='text-xs text-muted-foreground'>
              &copy; {new Date().getFullYear()} Scout Ahead
            </span>
          </div>

          {/* Primary Actions */}
          <div className='flex flex-col items-center gap-4 sm:flex-row sm:gap-6'>
            <Button
              size='default'
              variant='default'
              className='w-full font-sans font-medium tracking-wide sm:w-auto'
            >
              <ScrollToTopLink to='/' className='flex items-center gap-2'>
                <Plus size={16} />
                Start New Draft
              </ScrollToTopLink>
            </Button>

            {userLoading ? (
              <Skeleton className='h-9 w-24' />
            ) : (
              <div className='flex w-full items-center justify-center gap-2 sm:w-auto'>
                {user ? (
                  <DropdownMenu
                    open={dropdownOpen}
                    onOpenChange={setDropdownOpen}
                    modal={false}
                  >
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant='outline'
                        size='default'
                        className='w-full sm:w-auto'
                      >
                        <UserIcon size={16} className='mr-2' />
                        <span>My Profile</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end' className='w-56'>
                      <Link
                        to='/profile/:id'
                        params={{ id: user.id }}
                        onClick={() => setDropdownOpen(false)}
                      >
                        <DropdownMenuItem className='cursor-pointer'>
                          Profile
                        </DropdownMenuItem>
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
                  <div className='flex w-full gap-2 sm:w-auto'>
                    <Button
                      variant='outline'
                      size='default'
                      className='w-full sm:w-auto'
                      asChild
                    >
                      <Link to='/login'>Log in</Link>
                    </Button>
                    <Button
                      variant='outline'
                      size='default'
                      className='w-full sm:w-auto'
                      asChild
                    >
                      <Link to='/signup'>Sign up</Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Community and Support */}
          <div className='flex flex-col items-center gap-2 sm:items-end'>
            <a
              href='https://discord.gg/aPcNhT2mt6'
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground'
            >
              <DiscordLogo size={16} weight='fill' />
              Join Discord
            </a>
            <a
              href='https://www.buymeacoffee.com/wardbox'
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground'
            >
              <Coffee size={16} weight='fill' />
              <span>Buy me a coffee</span>
            </a>
          </div>
        </div>
      </div>
    </motion.footer>
  )
}

export default Footer
