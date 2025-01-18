import { type FormEvent, useState } from 'react'
import { createSeries } from 'wasp/client/operations'
import { motion } from 'motion/react'
import { Input } from '../../client/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../client/components/ui/select'
import { Button } from '../../client/components/ui/button'
import { Copy, Check, Info } from '@phosphor-icons/react'
import { Checkbox } from '../../client/components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../client/components/ui/tooltip'

type SeriesArgs = {
  team1Name: string
  team2Name: string
  matchName: string
  format: 'BO1' | 'BO3' | 'BO5'
  fearlessDraft: boolean
  scrimBlock: boolean
}

export function CreateSeriesPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [urls, setUrls] = useState<{
    blueUrl?: string
    redUrl?: string
    spectatorUrl?: string
    team1Name?: string
    team2Name?: string
  }>({})
  const [copied, setCopied] = useState(false)
  const [seriesFormat, setSeriesFormat] = useState<'BO1' | 'BO3' | 'BO5'>('BO3')
  const [fearlessDraft, setFearlessDraft] = useState(false)
  const [scrimBlock, setScrimBlock] = useState(false)

  const handleCopyAll = () => {
    const formatText = seriesFormat === 'BO5' ? 'best of 5' : seriesFormat === 'BO3' ? 'best of 3' : 'best of 1'
    const modeText = [
      fearlessDraft ? 'fearless' : '',
      scrimBlock ? 'scrim block' : ''
    ].filter(Boolean).join(' ')

    const description = `You've been invited to play a ${formatText}${modeText ? ` ${modeText}` : ''} draft via scoutahead.pro`

    const formattedLinks = `${description}

${urls.team1Name}:
${urls.blueUrl}

${urls.team2Name}:
${urls.redUrl}

Spectator:
${urls.spectatorUrl}`

    navigator.clipboard.writeText(formattedLinks)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setUrls({})

    const formData = new FormData(e.currentTarget)
    const team1Name = formData.get('team1Name') as string
    const team2Name = formData.get('team2Name') as string
    const matchName = formData.get('matchName') as string

    if (team1Name.toLowerCase() === team2Name.toLowerCase()) {
      setError('Team names must be different')
      setIsLoading(false)
      return
    }

    const data: SeriesArgs = {
      team1Name,
      team2Name,
      matchName,
      format: seriesFormat,
      fearlessDraft,
      scrimBlock,
    }

    try {
      const series = await createSeries(data)
      const baseUrl = window.location.origin
      setUrls({
        blueUrl: `${baseUrl}/draft/${series.id}/1/team1/${series.team1AuthToken}`,
        redUrl: `${baseUrl}/draft/${series.id}/1/team2/${series.team2AuthToken}`,
        spectatorUrl: `${baseUrl}/draft/${series.id}/1`,
        team1Name,
        team2Name,
      })
    } catch (err: any) {
      setError(err.message || 'Failed to create series')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='flex min-h-screen flex-col items-center justify-center bg-background p-8'>
      <div className='mb-12 text-center'>
        <h1 className='mb-4 text-6xl font-bold tracking-tight'>
          scout<span className='text-primary'>ahead</span>.pro
        </h1>
        <p className='max-w-3xl text-pretty text-lg text-muted-foreground'>
          League of Legends draft tool for teams, coaches, and players.
          <br />
          Create custom draft lobbies with advanced features like fearless draft
          and scrim blocks. Use a single link for the entire series.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='w-full max-w-md px-4'
      >
        <form
          onSubmit={handleSubmit}
          className='space-y-4 rounded-lg bg-card p-6 shadow-xl'
        >
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label htmlFor='team1Name' className='text-sm font-medium'>
                Team 1
              </label>
              <Input
                type='text'
                name='team1Name'
                id='team1Name'
                required
                className='mt-1'
                placeholder='e.g. Cloud9'
              />
            </div>

            <div>
              <label htmlFor='team2Name' className='text-sm font-medium'>
                Team 2
              </label>
              <Input
                type='text'
                name='team2Name'
                id='team2Name'
                required
                className='mt-1'
                placeholder='e.g. Team Liquid'
              />
            </div>
          </div>

          <div>
            <label htmlFor='matchName' className='text-sm font-medium'>
              Match Name
            </label>
            <Input
              type='text'
              name='matchName'
              id='matchName'
              required
              className='mt-1'
              placeholder='e.g. LCS Summer 2024 - Week 1'
            />
          </div>

          <div>
            <label htmlFor='format' className='text-sm font-medium'>
              Series Format
            </label>
            <Select
              name='format'
              value={seriesFormat}
              onValueChange={value => setSeriesFormat(value as 'BO1' | 'BO3' | 'BO5')}
            >
              <SelectTrigger className='mt-1'>
                <SelectValue placeholder='Select format' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='BO1'>Best of 1</SelectItem>
                <SelectItem value='BO3'>Best of 3</SelectItem>
                <SelectItem value='BO5'>Best of 5</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2 pt-2'>
            <div className='flex items-center space-x-2'>
              <Checkbox
                name='fearlessDraft'
                id='fearlessDraft'
                checked={fearlessDraft}
                onCheckedChange={checked => setFearlessDraft(checked === true)}
              />
              <div className='flex items-center gap-2'>
                <label htmlFor='fearlessDraft' className='text-sm'>
                  Enable Fearless Draft
                </label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className='h-4 w-4 text-muted-foreground transition-colors hover:text-foreground' />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className='flex items-center gap-2'>
                        <div className='rounded bg-primary/10 px-2 py-0.5 font-medium text-primary'>
                          Fearless
                        </div>
                        <span>Champions can only be picked once</span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className='flex items-center space-x-2'>
              <Checkbox
                name='scrimBlock'
                id='scrimBlock'
                checked={scrimBlock}
                onCheckedChange={checked => setScrimBlock(checked === true)}
              />
              <div className='flex items-center gap-2'>
                <label htmlFor='scrimBlock' className='text-sm'>
                  Enable Scrim Block Mode
                </label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className='h-4 w-4 text-muted-foreground transition-colors hover:text-foreground' />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className='flex items-center gap-2'>
                        <div className='rounded bg-primary/10 px-2 py-0.5 font-medium text-primary'>
                          Scrim
                        </div>
                        <span>All games must be played</span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className='text-sm text-destructive'
            >
              {error}
            </motion.div>
          )}

          <Button type='submit' disabled={isLoading} className='w-full'>
            {isLoading ? 'Creating...' : 'Create Draft'}
          </Button>
        </form>

        {urls.blueUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='mt-8 space-y-4 rounded-lg bg-card p-6'
          >
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-xl font-semibold'>Series Created!</h2>
              <Button
                variant='outline'
                size='sm'
                onClick={handleCopyAll}
                className='flex items-center gap-2'
              >
                {copied ? (
                  <>
                    <Check size={16} weight='bold' />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy All Links
                  </>
                )}
              </Button>
            </div>

            <div className='space-y-2'>
              <p className='text-sm font-medium'>{urls.team1Name} URL:</p>
              <Input
                type='text'
                readOnly
                value={urls.blueUrl}
                className='mt-1 font-mono text-sm'
                onClick={e => e.currentTarget.select()}
              />
            </div>

            <div className='space-y-2'>
              <p className='text-sm font-medium'>{urls.team2Name} URL:</p>
              <Input
                type='text'
                readOnly
                value={urls.redUrl}
                className='mt-1 font-mono text-sm'
                onClick={e => e.currentTarget.select()}
              />
            </div>

            <div className='space-y-2'>
              <p className='text-sm font-medium text-muted-foreground'>
                Spectator URL:
              </p>
              <Input
                type='text'
                readOnly
                value={urls.spectatorUrl}
                className='mt-1 font-mono text-sm'
                onClick={e => e.currentTarget.select()}
              />
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
