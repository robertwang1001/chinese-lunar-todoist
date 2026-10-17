import { PlannerPage } from '@/components/planner-page'

export default async function EditSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PlannerPage editId={id} view="edit" />
}
