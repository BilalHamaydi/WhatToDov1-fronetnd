<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { API_BASE } from '../api'

interface Task {
  id: number
  taskName: string
  done: boolean
  important: boolean
  category: string | null
  color: string | null
  date: string | null // YYYY-MM-DD
}

/* ───────── Farben (vordefiniert) ───────── */
const COLOR_OPTIONS = [
  { label: 'Grau', value: '#6c757d' },
  { label: 'Blau', value: '#0d6efd' },
  { label: 'Grün', value: '#198754' },
  { label: 'Rot', value: '#dc3545' },
  { label: 'Gelb', value: '#ffc107' },
  { label: 'Türkis', value: '#20c997' },
  { label: 'Lila', value: '#6f42c1' },
  { label: 'Pink', value: '#d63384' },
]

/* ───────── State ───────── */
const tasks = ref<Task[]>([])
const categories = ref<string[]>([])

const loading = ref(false)
const error = ref('')

/* Create-Form */
const newTaskName = ref('')
const newTaskCategory = ref<string>('') // '' = keine
const newTaskColor = ref<string>(COLOR_OPTIONS[1].value)
const newTaskDate = ref<string>('') // '' = null

function formatDate(d?: string | null) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}.${m}.${y}`
}

async function readErrorText(res: Response) {
  const txt = await res.text().catch(() => '')
  return txt ? ` – ${txt}` : ''
}

/* ───────── API ───────── */
async function loadTasks() {
  const res = await fetch(`${API_BASE}/tasks`)
  if (!res.ok) throw new Error(`Load tasks failed (HTTP ${res.status})${await readErrorText(res)}`)
  tasks.value = await res.json()
}

async function loadCategories() {
  const res = await fetch(`${API_BASE}/categories`)
  if (!res.ok) throw new Error(`Load categories failed (HTTP ${res.status})${await readErrorText(res)}`)
  const data: string[] = await res.json()
  categories.value = (data ?? []).filter(x => typeof x === 'string').sort((a, b) => a.localeCompare(b))
}

/* Kategorie erstellen */
async function createCategory() {
  const name = (window.prompt('Neue Kategorie (Name):') ?? '').trim()
  if (!name) return

  const res = await fetch(`${API_BASE}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error(`Create category failed (HTTP ${res.status})${await readErrorText(res)}`)

  await loadCategories()
  newTaskCategory.value = name
}

/* Kategorie löschen */
async function deleteCategory(name: string) {
  const res = await fetch(`${API_BASE}/categories/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(`Delete category failed (HTTP ${res.status})${await readErrorText(res)}`)

  await loadCategories()
  if (newTaskCategory.value === name) newTaskCategory.value = ''
}

/* Task erstellen (WICHTIG: date: null statt "" ) */
async function addTask() {
  const name = newTaskName.value.trim()
  if (!name) return

  const res = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      taskName: name,
      important: false,
      done: false,
      category: newTaskCategory.value?.trim() ? newTaskCategory.value.trim() : null,
      date: newTaskDate.value ? newTaskDate.value : null, // ✅ verhindert 500
      color: newTaskColor.value || COLOR_OPTIONS[1].value,
    }),
  })

  if (!res.ok) throw new Error(`Create task failed (HTTP ${res.status})${await readErrorText(res)}`)

  const created: Task = await res.json()
  tasks.value.unshift(created)

  newTaskName.value = ''
  newTaskDate.value = ''
}

async function deleteTask(id: number) {
  const res = await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Delete failed (HTTP ${res.status})${await readErrorText(res)}`)
  tasks.value = tasks.value.filter(t => t.id !== id)
}

async function toggleDone(task: Task) {
  const old = task.done
  const res = await fetch(`${API_BASE}/tasks/${task.id}/done?done=${task.done}`,
    { method: 'PATCH' }
  )
  if (!res.ok) {
    task.done = old
    throw new Error(`Done update failed (HTTP ${res.status})${await readErrorText(res)}`)
  }
}

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    await Promise.all([loadCategories(), loadTasks()])
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to fetch'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="container py-4" style="max-width: 980px;">
    <div class="card shadow-sm rounded-4">
      <div class="card-body p-4">
        <div class="d-flex align-items-center justify-content-between mb-3">
          <h2 class="m-0">🗒️ ToDo-Liste</h2>
          <span v-if="loading" class="badge text-bg-secondary">Lade…</span>
        </div>

        <div v-if="error" class="alert alert-danger rounded-4" role="alert">
          {{ error }}
        </div>

        <!-- Create (eine Zeile) -->
        <div class="row g-2 align-items-end mb-4">
          <div class="col-12 col-md-4">
            <label class="form-label">Task</label>
            <input
              v-model="newTaskName"
              class="form-control form-control-lg rounded-4"
              placeholder="Neue Aufgabe…"
              @keyup.enter="addTask().catch(e => (error = e.message))"
            />
          </div>

          <div class="col-12 col-md-3">
            <label class="form-label">Kategorie</label>
            <div class="input-group">
              <select v-model="newTaskCategory" class="form-select rounded-4">
                <option value="">(keine)</option>
                <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
              </select>
              <button
                class="btn btn-outline-primary rounded-4"
                type="button"
                title="Neue Kategorie"
                @click="createCategory().catch(e => (error = e.message))"
              >
                +
              </button>
            </div>
          </div>

          <div class="col-12 col-md-2">
            <label class="form-label">Farbe</label>
            <select v-model="newTaskColor" class="form-select rounded-4">
              <option v-for="co in COLOR_OPTIONS" :key="co.value" :value="co.value">
                {{ co.label }}
              </option>
            </select>
          </div>

          <div class="col-12 col-md-2">
            <label class="form-label">Datum</label>
            <input v-model="newTaskDate" type="date" class="form-control rounded-4" />
          </div>

          <div class="col-12 col-md-1 d-grid">
            <button
              class="btn btn-primary btn-lg rounded-4"
              @click="addTask().catch(e => (error = e.message))"
            >
              +
            </button>
          </div>
        </div>

        <!-- Kategorien (Chips + löschen) -->
        <div v-if="categories.length" class="mb-4">
          <div class="d-flex align-items-center justify-content-between mb-2">
            <strong>Kategorien</strong>
            <small class="text-muted">❌ löscht Kategorie</small>
          </div>

          <div class="d-flex flex-wrap gap-2">
            <span
              v-for="c in categories"
              :key="c"
              class="badge rounded-pill text-bg-secondary px-3 py-2"
            >
              {{ c }}
              <button
                class="btn btn-sm btn-link p-0 ms-2 text-light text-decoration-none"
                title="Kategorie löschen"
                @click="deleteCategory(c).catch(e => (error = e.message))"
              >
                ❌
              </button>
            </span>
          </div>
        </div>

        <!-- Tasks -->
        <ul class="list-group list-group-flush">
          <li
            v-for="t in tasks"
            :key="t.id"
            class="list-group-item py-3 rounded-3 mb-2"
            :style="{ borderLeft: `8px solid ${t.color || '#6c757d'}` }"
          >
            <div class="d-flex align-items-center gap-3">
              <input
                class="form-check-input mt-0"
                type="checkbox"
                v-model="t.done"
                @change="toggleDone(t).catch(e => (error = e.message))"
              />

              <div class="flex-grow-1">
                <div class="d-flex align-items-center gap-2 flex-wrap">
                  <span
                    class="fw-semibold"
                    :class="{ 'text-decoration-line-through text-muted': t.done }"
                  >
                    {{ t.taskName }}
                  </span>

                  <span v-if="t.category" class="badge rounded-pill text-bg-secondary">
                    {{ t.category }}
                  </span>

                  <span v-if="t.date" class="badge rounded-pill text-bg-info">
                    📅 {{ formatDate(t.date) }}
                  </span>
                </div>
              </div>

              <button class="btn btn-outline-danger rounded-pill" @click="deleteTask(t.id).catch(e => (error = e.message))">
                🗑️
              </button>
            </div>
          </li>
        </ul>

      </div>
    </div>
  </div>
</template>
