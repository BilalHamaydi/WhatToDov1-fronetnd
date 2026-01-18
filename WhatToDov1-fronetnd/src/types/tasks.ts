export type ISODate = string // "YYYY-MM-DD"

export interface Task {
  id: number
  taskName: string
  done: boolean
  important: boolean
  category?: string | null
  color?: string | null
  date?: ISODate | null
}

/**
 * Backend kann manchmal "name" oder "taskName" liefern.
 * Wir normalisieren auf taskName, damit Frontend überall konsistent ist.
 */
export function normalizeTask(raw: any): Task {
  return {
    id: Number(raw.id),
    taskName: String(raw.taskName ?? raw.name ?? ''),
    done: Boolean(raw.done),
    important: Boolean(raw.important),
    category: raw.category ?? '',
    color: raw.color ?? '#0d6efd',
    date: raw.date ?? null,
  }
}
