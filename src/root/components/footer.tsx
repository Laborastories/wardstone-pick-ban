import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { fadeIn } from '../../motion/transitionPresets'
import { GithubLogo, Strategy } from '@phosphor-icons/react'
import { usePrefetch } from '../../lib/utils'

const ScrollToTopLink = ({
  to,
  children,
  className,
}: {
  to: string
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
  main: [{ name: 'Home', href: '/' }],
  social: [
    {
      name: 'GitHub',
      href: 'https://github.com/Laborastories/wardstone-pick-ban',
      icon: 'GithubLogo',
    },
  ],
}

export function Footer() {
  return (
    <motion.div
      variants={fadeIn}
      initial='initial'
      animate='animate'
      className='relative z-50 mx-auto max-w-7xl'
    >
      <div className='px-4 py-2'>
        {/* Single row layout */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <Strategy size={16} weight='fill' />
            <span className='text-xs text-muted-foreground'>
              &copy; {new Date().getFullYear()} SCOUT AHEAD
            </span>
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
          </div>
          <div className='flex items-center gap-4'>
            <a
              href='https://www.buymeacoffee.com/wardbox'
              aria-label='Buy me a coffee'
            >
              <img
                src='https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=☕&slug=wardbox&button_colour=404040&font_colour=ffffff&font_family=Inter&outline_colour=ffffff&coffee_colour=FFDD00'
                alt='Buy me a coffee'
              />
            </a>

            <div className='flex gap-4'>
              {navigation.social.map(item => (
                <a
                  key={item.name}
                  href={item.href}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-muted-foreground transition-colors hover:text-foreground'
                  aria-label={item.name}
                >
                  <GithubLogo size={16} weight='fill' />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default Footer
