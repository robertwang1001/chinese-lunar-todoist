import process from 'node:process'
import { Planner } from '@/components/planner'
import { hasSession } from '@/lib/session'

export default async function Home() {
  return (
    <Planner
      connected={await hasSession()}
      configured={Boolean(
        process.env.TODOIST_CLIENT_ID
        && process.env.TODOIST_CLIENT_SECRET
        && process.env.SESSION_SECRET,
      )}
    />
  )
}
