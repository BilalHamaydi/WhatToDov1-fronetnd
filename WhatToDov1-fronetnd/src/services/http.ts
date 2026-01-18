export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as T
}

export async function sendJson<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}${text ? ` – ${text}` : ''}`)
  }

  // Manche Endpoints liefern kein JSON (204)
  const text = await res.text().catch(() => '')
  if (!text) return {} as T
  return JSON.parse(text) as T
}
