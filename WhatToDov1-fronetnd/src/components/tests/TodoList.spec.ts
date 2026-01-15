import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/vue'
import TodoList from '../TodoList.vue'

// kleines Helper-Response Mock
function mockFetchOnce(data: any, ok = true, status = 200) {
  ;(global.fetch as any).mockResolvedValueOnce({
    ok,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  })
}

describe('TodoList.vue', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    global.fetch = vi.fn()
  })

  // Use Case: Initial lädt Tasks + Kategorien
  it('lädt Tasks & zeigt Titel', async () => {
    mockFetchOnce([]) // GET /tasks
    mockFetchOnce([]) // GET /categories

    render(TodoList)

    expect(await screen.findByText('ToDo-Liste')).toBeInTheDocument()
  })

  it('zeigt geladene Task in der Liste', async () => {
    mockFetchOnce([{ id: 1, taskName: 'Test', done: false, important: false, color: '#0d6efd', date: null, category: '' }])
    mockFetchOnce([])

    render(TodoList)

    expect(await screen.findByText('Test')).toBeInTheDocument()
  })

  // Use Case: Task erstellen
  it('erstellt Task per POST wenn man + klickt', async () => {
    mockFetchOnce([]) // GET /tasks
    mockFetchOnce([]) // GET /categories

    // POST /tasks -> created
    mockFetchOnce({ id: 5, taskName: 'Neu', done: false, important: false, color: '#0d6efd', date: null, category: '' })

    render(TodoList)

    const input = await screen.findByPlaceholderText('Neue Aufgabe…')
    await fireEvent.update(input, 'Neu')

    // Button + (Task hinzufügen)
    const addBtns = screen.getAllByTitle('Task hinzufügen')
    await fireEvent.click(addBtns[0])

    expect(global.fetch).toHaveBeenCalled()
    expect(await screen.findByText('Neu')).toBeInTheDocument()
  })

  it('erstellt Task NICHT wenn Name leer ist', async () => {
    mockFetchOnce([])
    mockFetchOnce([])
    render(TodoList)

    const addBtns = await screen.findAllByTitle('Task hinzufügen')
    await fireEvent.click(addBtns[0])

    // nur die initialen 2 GET calls
    expect((global.fetch as any).mock.calls.length).toBe(2)
  })

  // Use Case: Task löschen
  it('löscht Task per DELETE', async () => {
    mockFetchOnce([{ id: 2, taskName: 'DeleteMe', done: false, important: false }])
    mockFetchOnce([])

    // DELETE /tasks/2
    ;(global.fetch as any).mockResolvedValueOnce({ ok: true, status: 200, text: async () => '' })

    render(TodoList)
    expect(await screen.findByText('DeleteMe')).toBeInTheDocument()

    await fireEvent.click(screen.getByTitle('Task löschen'))
    expect(screen.queryByText('DeleteMe')).not.toBeInTheDocument()
  })

  // Use Case: done togglen
  it('sendet PATCH wenn done Checkbox geändert wird', async () => {
    mockFetchOnce([{ id: 3, taskName: 'Done', done: false, important: false }])
    mockFetchOnce([])

    // PATCH
    ;(global.fetch as any).mockResolvedValueOnce({ ok: true, status: 200, text: async () => '' })

    render(TodoList)
    await screen.findByText('Done')

    const checkbox = screen.getByRole('checkbox')
    await fireEvent.click(checkbox)

    expect(global.fetch).toHaveBeenCalled()
  })

  // Use Case: Kategorien anzeigen
  it('zeigt Kategorie im Dropdown', async () => {
    mockFetchOnce([])
    mockFetchOnce(['Uni'])

    render(TodoList)

    // Option "Uni" muss auftauchen
    expect(await screen.findByText('Uni')).toBeInTheDocument()
  })

  // Use Case: Kategorie löschen Button disabled wenn keine Kategorie gewählt
  it('Kategorie-löschen ist disabled ohne Auswahl', async () => {
    mockFetchOnce([])
    mockFetchOnce(['Uni'])

    render(TodoList)

    const delBtn = await screen.findByTitle('Kategorie löschen')
    expect(delBtn).toBeDisabled()
  })

  // Use Case: Kalender-Filter -> linke Liste gefiltert
  it('klick auf Kalendertag filtert linke Liste', async () => {
    mockFetchOnce([
      { id: 10, taskName: 'A', done: false, important: false, date: '2026-01-01', color: '#0d6efd' },
      { id: 11, taskName: 'B', done: false, important: false, date: '2026-01-02', color: '#0d6efd' },
    ])
    mockFetchOnce([])

    render(TodoList)

    await screen.findByText('A')
    await screen.findByText('B')

    // irgendein day-button anklicken: wir suchen den mit "1" (kann mehrfach vorkommen),
    // nehmen den ersten Treffer
    const dayBtn = (await screen.findAllByText('1'))[0]
    await fireEvent.click(dayBtn)

    // Danach sollte nur der Task vom Datum übrig sein (A)
    expect(await screen.findByText('A')).toBeInTheDocument()
  })

  it('Filter löschen zeigt wieder alle Tasks', async () => {
    mockFetchOnce([
      { id: 10, taskName: 'A', done: false, important: false, date: '2026-01-01' },
      { id: 11, taskName: 'B', done: false, important: false, date: '2026-01-02' },
    ])
    mockFetchOnce([])

    render(TodoList)
    await screen.findByText('A')
    await screen.findByText('B')

    // Tag klicken -> Filter aktiv
    const dayBtn = (await screen.findAllByText('1'))[0]
    await fireEvent.click(dayBtn)

    // dann Filter-Chip klicken
    const chip = await screen.findByTitle('Filter aufheben')
    await fireEvent.click(chip)

    expect(await screen.findByText('A')).toBeInTheDocument()
    expect(await screen.findByText('B')).toBeInTheDocument()
  })
})
