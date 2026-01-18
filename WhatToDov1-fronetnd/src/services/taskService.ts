import { API_BASE } from '../api'
import { normalizeTask, Task } from '../types/tasks'
import { getJson, sendJson } from './http'

export async function fetchTasks(): Promise<Task[]> {
  const raw = await getJson<any[]>(`${API_BASE}/tasks`)
  return raw.map(normalizeTask)
}

export async function createTask(payload: {
  name: string
  taskName: string
  important: boolean
  done: boolean
  category: string
  color: string
  date: string | null
}): Promise<Task> {
  const raw = await sendJson<any>(`${API_BASE}/tasks`, 'POST', payload)
  return normalizeTask(raw)
}

export async function deleteTask(id: number): Promise<void> {
  await sendJson<void>(`${API_BASE}/tasks/${id}`, 'DELETE')
}

export async function patchDone(id: number, done: boolean): Promise<void> {
  await sendJson<void>(`${API_BASE}/tasks/${id}`, 'PATCH', { done })
}
