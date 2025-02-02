import { fetchChampionsJob } from 'wasp/server/jobs'
import { type ServerSetupFn } from 'wasp/server'

export const setupServer: ServerSetupFn = async () => {
  // Run fetchChampions job on startup
  try {
    await fetchChampionsJob.submit({})
    console.log('✅ Submitted fetchChampions job')
  } catch (error) {
    console.error('❌ Failed to submit fetchChampions job:', error)
  }
}
