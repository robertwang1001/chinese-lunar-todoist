import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Planner } from './planner'

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
})

it('shows the product before requiring connection to add tasks', async () => {
  render(<Planner configured connected={false} view="create" />)
  expect(await screen.findByText('Preview every feature below')).toBeInTheDocument()
  expect(screen.getByLabelText('Task name')).toHaveValue('')
  expect(screen.getByLabelText('Task name')).toHaveAttribute(
    'placeholder',
    'e.g. Call Mom for her lunar birthday',
  )
  expect(screen.getByLabelText('Task name')).toBeRequired()
  expect(screen.getByLabelText('Task name')).toHaveAttribute('maxlength', '200')
  expect(
    screen.getByRole('link', { name: 'Connect Todoist to add these tasks' }),
  ).toHaveAttribute(
    'href',
    '/api/auth/login',
  )
})

it('supports Todoist date types and explains lunar leap months', async () => {
  render(<Planner configured connected view="create" />)
  expect(await screen.findByText('Todoist date preview')).toBeInTheDocument()
  expect(screen.getByLabelText('Due date')).toBeChecked()

  fireEvent.click(screen.getByRole('button', { name: /Mid-Autumn Festival/ }))
  expect(screen.getByLabelText('Task name')).toHaveValue('Mid-Autumn Festival')

  fireEvent.click(screen.getByRole('button', { name: /Month 8 · Day 15/ }))
  expect(screen.getByRole('button', { name: 'Month 1' })).toBeInTheDocument()

  fireEvent.click(screen.getByLabelText('Due date & time'))
  expect(screen.getByLabelText('Due time')).toBeInTheDocument()
  expect(screen.getByLabelText('Leap lunar month (闰月)')).toBeInTheDocument()
  expect(screen.getByText(/original date explicitly says 闰月/)).toBeInTheDocument()

  fireEvent.click(screen.getByLabelText('Yearly lunar task'))
  expect(screen.getByLabelText('Future occurrences')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Add yearly lunar task to Todoist' })).toBeEnabled()

  fireEvent.click(screen.getByRole('button', { name: 'Preview task appearance' }))
  expect(screen.getByText(/nothing has been sent to Todoist/)).toBeInTheDocument()
  expect(screen.getByText(/Occurrence 1 of 5 for this yearly lunar task/)).toBeInTheDocument()

  const themeToggle = screen.getByRole('button', { name: 'Toggle color theme' })
  fireEvent.click(themeToggle)
  expect(document.documentElement).toHaveClass('dark')
  fireEvent.click(themeToggle)
  expect(document.documentElement).not.toHaveClass('dark')

  fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'zh-CN' } })
  expect(screen.getByRole('heading', { name: '创建农历任务' })).toBeInTheDocument()
  expect(screen.getByText('未来次数')).toBeInTheDocument()

  fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'zh-TW' } })
  expect(screen.getByRole('heading', { name: '建立農曆任務' })).toBeInTheDocument()
  expect(screen.getByText('未來次數')).toBeInTheDocument()
})

it('groups a lunar series and loads it into the editor', async () => {
  const event = {
    id: '9a18ccf0-bb2d-4f8d-bf9e-73db63c1a705',
    title: 'Mom lunar birthday',
    locale: 'en',
    schedule: 'series',
    dateType: 'date',
    time: '09:00',
    month: 8,
    day: 15,
    leap: false,
    count: 2,
    from: '2026-09-25',
  }
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
    events: [{
      id: event.id,
      title: event.title,
      event,
      known: { 0: 'task-1', 1: 'task-2' },
      tasks: [
        { id: 'task-1', index: 0, content: event.title, description: '', date: '2026-09-25', dateType: 'date' },
        { id: 'task-2', index: 1, content: event.title, description: '', date: '2027-09-15', dateType: 'date' },
      ],
    }],
  }))
  render(<Planner configured connected view="tasks" />)
  expect(await screen.findByText('2 occurrences · Yearly lunar task')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Preview related tasks' }))
  expect(screen.getByText(/Sep 25, 2026/)).toBeInTheDocument()
  expect(screen.getByText(/Sep 15, 2027/)).toBeInTheDocument()
  const editLink = screen.getByRole('link', { name: 'Edit lunar task' })
  expect(editLink).toHaveAttribute('href', `/tasks/${event.id}/edit`)
})

it('loads an existing lunar task on its dedicated edit route', async () => {
  const id = '9a18ccf0-bb2d-4f8d-bf9e-73db63c1a705'
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
    events: [{
      id,
      title: 'Existing schedule',
      event: { id, title: 'Existing schedule', locale: 'en', schedule: 'series', dateType: 'date', time: '09:00', month: 8, day: 15, leap: false, count: 2, from: '2026-09-25' },
      known: { 0: 'task-1', 1: 'task-2' },
      tasks: [],
    }],
  }))
  render(<Planner configured connected editId={id} view="edit" />)
  expect(await screen.findByRole('heading', { name: 'Edit lunar task' })).toBeInTheDocument()
  expect(await screen.findByLabelText('Task name')).toHaveValue('Existing schedule')
  expect(screen.getByRole('button', { name: 'Update yearly lunar task' })).toBeEnabled()
})
