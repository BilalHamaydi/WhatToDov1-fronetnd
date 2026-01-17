import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Vitest ENV für API_BASE
vi.stubEnv('VITE_API_BASE', 'http://test')

// Default fetch fallback (falls ein Test zu wenig mocks setzt)
;(globalThis as any).fetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: async () => [],
  text: async () => '[]',
})
