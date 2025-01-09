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
import { Copy, Check } from '@phosphor-icons/react'
import { Checkbox } from '../../client/components/ui/checkbox'

type SeriesArgs = {
  team1Name: string
  team2Name: string
  matchName: string
  format: 'BO1' | 'BO3' | 'BO5'
  fearlessDraft: boolean
}

export function CreateSeriesPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [urls, setUrls] = useState<{
    blueUrl?: string
    redUrl?: string
    spectatorUrl?: string
  }>({})
  const [copied, setCopied] = useState(false)

  const handleCopyAll = () => {
    const formattedLinks = `${urls.blueUrl ? `Team 1: ${urls.blueUrl}\n` : ''}${urls.redUrl ? `Team 2: ${urls.redUrl}\n` : ''}${urls.spectatorUrl ? `Spectator: ${urls.spectatorUrl}` : ''}`
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
    const data: SeriesArgs = {
      team1Name: formData.get('team1Name') as string,
      team2Name: formData.get('team2Name') as string,
      matchName: formData.get('matchName') as string,
      format: formData.get('format') as 'BO1' | 'BO3' | 'BO5',
      fearlessDraft: formData.get('fearlessDraft') === 'on'
    }

    try {
      const series = await createSeries(data)
      const baseUrl = window.location.origin
      setUrls({
        blueUrl: `${baseUrl}/draft/${series.id}/1/team1/${series.team1AuthToken}`,
        redUrl: `${baseUrl}/draft/${series.id}/1/team2/${series.team2AuthToken}`,
        spectatorUrl: `${baseUrl}/draft/${series.id}/1`
      })
    } catch (err: any) {
      setError(err.message || 'Failed to create series')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8'>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='max-w-md mx-auto'
      >
        <h1 className='text-3xl font-bold text-center mb-8'>Create Draft Series</h1>
        
        <form onSubmit={handleSubmit} className='space-y-6 bg-card p-6 rounded-lg shadow-xl'>
          <div>
            <label htmlFor='matchName' className='block text-sm font-medium'>
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
            <label htmlFor='team1Name' className='block text-sm font-medium'>
              Team 1 Name
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
            <label htmlFor='team2Name' className='block text-sm font-medium'>
              Team 2 Name
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

          <div>
            <label htmlFor='format' className='block text-sm font-medium'>
              Series Format
            </label>
            <Select name='format' required>
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

          <div className='flex items-center'>
            <Checkbox
              name='fearlessDraft'
              id='fearlessDraft'
            />
            <label htmlFor='fearlessDraft' className='ml-2 block text-sm'>
              Enable Fearless Draft (champions can only be picked once per series)
            </label>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className='text-destructive text-sm'
            >
              {error}
            </motion.div>
          )}

          <Button
            type='submit'
            disabled={isLoading}
            className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50'
          >
            {isLoading ? 'Creating...' : 'Create Series'}
          </Button>
        </form>

        {urls.blueUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='mt-8 space-y-4 bg-card p-6 rounded-lg'
          >
            <div className='flex items-center justify-between mb-4'>
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
              <p className='text-sm font-medium'>Team 1 URL:</p>
              <Input
                type='text'
                readOnly
                value={urls.blueUrl}
                className='mt-1 font-mono text-sm'
                onClick={e => e.currentTarget.select()}
              />
            </div>

            <div className='space-y-2'>
              <p className='text-sm font-medium'>Team 2 URL:</p>
              <Input
                type='text'
                readOnly
                value={urls.redUrl}
                className='mt-1 font-mono text-sm'
                onClick={e => e.currentTarget.select()}
              />
            </div>

            <div className='space-y-2'>
              <p className='text-sm font-medium text-muted-foreground'>Spectator URL:</p>
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
