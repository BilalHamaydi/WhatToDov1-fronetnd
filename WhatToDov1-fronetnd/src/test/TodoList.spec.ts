import '@testing-library/jest-dom/vitest'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, fireEvent, screen, waitFor } from '@testing-library/vue'
import TodoList from '../components/TodoList.vue'

type MockResponse = {
  ok: boolean
  status: number
  json: () => Promise<any>
  text: () => Promise<string>
}

function resJson(data: any, ok = true, status = 200): MockResponse {
  return {
    ok,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  }
}

function resText(text: string, ok = true, status = 200): MockResponse {
  return {
    ok,
    status,
    json: async () => ({}),
    text: async () => text,
  }
}

/**
 * Stabiler Router:
 * - matcht method + pathname + optionale query
 * - Reihenfolge egal
 * - wenn etwas ungemockt ist -> Test bricht sofort mit klarer Meldung
 */
function makeFetchMock() {
  const handlers: Array<{
    method: string
    match: (url: URL) => boolean
    handle: () => MockResponse | Promise<MockResponse>
  }> = []

  const fetchMock = vi.fn().mockImplementation((input: any, init?: any) => {
    const method = String(init?.method ?? 'GET').toUpperCase()

    // Vitest/Vite kann relative/absolute urls liefern → wir normalisieren immer auf URL
    const raw = String(input)
    const url = new URL(raw, 'http://localhost')

    const h = handlers.find(x => x.method === method && x.match(url))
    if (!h) {
      throw new Error(`Unmocked fetch: ${method} ${url.pathname}${url.search}`)
    }
    return Promise.resolve(h.handle())
  })

  return {
    fetchMock,
    on(method: string, match: (url: URL) => boolean, handle: () => any) {
      handlers.push({ method: method.toUpperCase(), match, handle })
      return this
    },
  }
}

async function mountAndWait() {
  render(TodoList)
  // wartet bis Komponente gerendert ist
  await screen.findByText('ToDo-Liste')
  // wartet bis initiale fetches durch sind und Vue gerendert hat
  await waitFor(() => {
    expect((globalThis as any).fetch).toHaveBeenCalled()
  })
}

describe('TodoList', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('lädt Tasks + Kategorien beim Start', async () => {
    const r = makeFetchMock()
      .on('GET', u => u.pathname.endsWith('/tasks'), () => resJson([]))
      .on('GET', u => u.pathname.endsWith('/categories'), () => resJson(['Uni']))

    ;(globalThis as any).fetch = r.fetchMock

    await mountAndWait()

    // UI muss Kategorie wirklich drin haben
    expect(await screen.findByRole('option', { name: 'Uni' })).toBeInTheDocument()
  })

  it('zeigt Kategorie im Dropdown', async () => {
    const r = makeFetchMock()
      .on('GET', u => u.pathname.endsWith('/tasks'), () => resJson([]))
      .on('GET', u => u.pathname.endsWith('/categories'), () => resJson(['Uni']))

    ;(globalThis as any).fetch = r.fetchMock

    await mountAndWait()

    expect(await screen.findByRole('option', { name: 'Uni' })).toBeInTheDocument()
  })

  it('erstellt eine Task (POST) und zeigt sie links an', async () => {
    const created = { id: 1, taskName: 'Neu', done: false, important: false, category: '', color: '#0d6efd', date: null }

    const r = makeFetchMock()
      .on('GET', u => u.pathname.endsWith('/tasks'), () => resJson([]))
      .on('GET', u => u.pathname.endsWith('/categories'), () => resJson([]))
      .on('POST', u => u.pathname.endsWith('/tasks'), () => resJson(created))

    ;(globalThis as any).fetch = r.fetchMock

    await mountAndWait()

    await fireEvent.update(screen.getByPlaceholderText('Neue Aufgabe…'), 'Neu')
    await fireEvent.click(screen.getByTitle('Task hinzufügen'))

    expect(await screen.findByText('Neu')).toBeInTheDocument()
  })

  it('löscht eine Task (DELETE) und entfernt sie aus der Liste', async () => {
    const task = { id: 5, taskName: 'DeleteMe', done: false, important: false, category: '', color: '#0d6efd', date: null }

    // Trick: /tasks liefert erst task, danach leer (nach delete bleibt UI leer)
    let tasksState: any[] = [task]

    const r = makeFetchMock()
      .on('GET', u => u.pathname.endsWith('/tasks'), () => resJson(tasksState))
      .on('GET', u => u.pathname.endsWith('/categories'), () => resJson([]))
      .on('DELETE', u => u.pathname.endsWith('/tasks/5'), () => {
        tasksState = []
        return resText('', true, 204)
      })

    ;(globalThis as any).fetch = r.fetchMock

    await mountAndWait()

    expect(await screen.findByText('DeleteMe')).toBeInTheDocument()
    await fireEvent.click(screen.getByTitle('Task löschen'))

    await waitFor(() => {
      expect(screen.queryByText('DeleteMe')).not.toBeInTheDocument()
    })
  })

  it('toggle done sendet PATCH', async () => {
    const task = { id: 7, taskName: 'X', done: false, important: false, category: '', color: '#0d6efd', date: null }

    const r = makeFetchMock()
      .on('GET', u => u.pathname.endsWith('/tasks'), () => resJson([task]))
      .on('GET', u => u.pathname.endsWith('/categories'), () => resJson([]))
      .on('PATCH', u => u.pathname.endsWith('/tasks/7/done') && u.searchParams.has('done'), () => resJson({}))

    ;(globalThis as any).fetch = r.fetchMock

    await mountAndWait()

    expect(await screen.findByText('X')).toBeInTheDocument()

    // Checkbox anklicken
    await fireEvent.click(screen.getAllByRole('checkbox')[0])

    await waitFor(() => {
      expect(r.fetchMock.mock.calls.some(c => String(c[0]).includes('/tasks/7/done'))).toBe(true)
    })
  })

  it('Suchleiste filtert Tasks nach Name', async () => {
    const t1 = { id: 1, taskName: 'Uni lernen', done: false, important: false, category: '', color: '#0d6efd', date: null }
    const t2 = { id: 2, taskName: 'Einkaufen', done: false, important: false, category: '', color: '#0d6efd', date: null }

    const r = makeFetchMock()
      .on('GET', u => u.pathname.endsWith('/tasks'), () => resJson([t1, t2]))
      .on('GET', u => u.pathname.endsWith('/categories'), () => resJson([]))

    ;(globalThis as any).fetch = r.fetchMock

    await mountAndWait()

    expect(await screen.findByText('Uni lernen')).toBeInTheDocument()

    await fireEvent.update(screen.getByPlaceholderText('Taskname eingeben…'), 'Uni')

    expect(screen.getByText('Uni lernen')).toBeInTheDocument()
    expect(screen.queryByText('Einkaufen')).not.toBeInTheDocument()
  })

  it('Kalender zeigt Dots wenn Tasks ein Datum haben', async () => {
    const t = { id: 1, taskName: 'Mit Datum', done: false, important: false, category: '', color: '#198754', date: '2026-01-10' }

    const r = makeFetchMock()
      .on('GET', u => u.pathname.endsWith('/tasks'), () => resJson([t]))
      .on('GET', u => u.pathname.endsWith('/categories'), () => resJson([]))

    ;(globalThis as any).fetch = r.fetchMock

    await mountAndWait()

    expect(await screen.findByText('Mit Datum')).toBeInTheDocument()
    expect(document.querySelector('.dot')).not.toBeNull()
  })

  it('zeigt Fehlermeldung wenn Tasks laden fehlschlägt', async () => {
    const r = makeFetchMock()
      .on('GET', u => u.pathname.endsWith('/tasks'), () => resText('fail', false, 500))
      .on('GET', u => u.pathname.endsWith('/categories'), () => resJson([]))

    ;(globalThis as any).fetch = r.fetchMock

    render(TodoList)

    // deine Komponente setzt error = "HTTP 500" (apiGetJson)
    expect(await screen.findByText(/HTTP 500/i)).toBeInTheDocument()
  })
})
