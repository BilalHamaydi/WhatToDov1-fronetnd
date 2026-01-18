import { API_BASE } from '../api'
import { getJson, sendJson } from './http'

function sortUniqueStrings(xs: string[]) {
  return Array.from(new Set(xs.filter((x) => x && x.trim()))).sort((a, b) => a.localeCompare(b))
}

export async function fetchCategories(): Promise<string[]> {
  const list = await getJson<string[]>(`${API_BASE}/categories`)
  return sortUniqueStrings(list)
}

export async function createCategory(name: string): Promise<void> {
  await sendJson<void>(`${API_BASE}/categories`, 'POST', { name })
}

export async function deleteCategory(name: string): Promise<void> {
  await sendJson<void>(`${API_BASE}/categories/${encodeURIComponent(name)}`, 'DELETE')
}
