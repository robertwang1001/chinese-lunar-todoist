import process from 'node:process'
import { Planner } from '@/components/planner'
import { hasSession } from '@/lib/session'

export async function PlannerPage({ editId, view }: { editId?: string, view: 'home' | 'create' | 'tasks' | 'edit' }) {
  return (
    <Planner
      connected={await hasSession()}
      configured={Boolean(
        process.env.TODOIST_CLIENT_ID
        && process.env.TODOIST_CLIENT_SECRET
        && process.env.SESSION_SECRET,
      )}
      editId={editId}
      view={view}
    />
  )
}
