export const API_BASE =
  import.meta.env.VITE_BACKEND_BASE_URL?.replace(/\/$/, '') || 'http://localhost:8080'
