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

type SeriesArgs = {
  blueTeamName: string
  redTeamName: string
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setUrls({})

    const formData = new FormData(e.currentTarget)
    const data: SeriesArgs = {
      blueTeamName: formData.get('blueTeamName') as string,
      redTeamName: formData.get('redTeamName') as string,
      matchName: formData.get('matchName') as string,
      format: formData.get('format') as 'BO1' | 'BO3' | 'BO5',
      fearlessDraft: formData.get('fearlessDraft') === 'on'
    }

    try {
      const series = await createSeries(data)
      const baseUrl = window.location.origin
      setUrls({
        blueUrl: `${baseUrl}/draft/${series.id}/1/blue/${series.blueAuthToken}`,
        redUrl: `${baseUrl}/draft/${series.id}/1/red/${series.redAuthToken}`,
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
            <label htmlFor='blueTeamName' className='block text-sm font-medium'>
              Blue Team Name
            </label>
            <Input
              type='text'
              name='blueTeamName'
              id='blueTeamName'
              required
              className='mt-1'
              placeholder='e.g. Cloud9'
            />
          </div>

          <div>
            <label htmlFor='redTeamName' className='block text-sm font-medium'>
              Red Team Name
            </label>
            <Input
              type='text'
              name='redTeamName'
              id='redTeamName'
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
            <input
              type='checkbox'
              name='fearlessDraft'
              id='fearlessDraft'
              className='h-4 w-4 rounded bg-input border-input text-primary focus:ring-ring'
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

          <button
            type='submit'
            disabled={isLoading}
            className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50'
          >
            {isLoading ? 'Creating...' : 'Create Series'}
          </button>
        </form>

        {urls.blueUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='mt-8 space-y-4 bg-card p-6 rounded-lg'
          >
            <h2 className='text-xl font-semibold mb-4'>Series Created!</h2>
            
            <div className='space-y-2'>
              <p className='text-sm font-medium text-blue-500'>Blue Team URL:</p>
              <Input
                type='text'
                readOnly
                value={urls.blueUrl}
                className='mt-1'
                onClick={e => e.currentTarget.select()}
              />
            </div>

            <div className='space-y-2'>
              <p className='text-sm font-medium text-red-500'>Red Team URL:</p>
              <Input
                type='text'
                readOnly
                value={urls.redUrl}
                className='mt-1'
                onClick={e => e.currentTarget.select()}
              />
            </div>

            <div className='space-y-2'>
              <p className='text-sm font-medium text-muted-foreground'>Spectator URL:</p>
              <Input
                type='text'
                readOnly
                value={urls.spectatorUrl}
                className='mt-1'
                onClick={e => e.currentTarget.select()}
              />
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
} 
