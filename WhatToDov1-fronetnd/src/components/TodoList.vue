<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { API_BASE } from '../api'

interface Task {
  id: number
  taskName: string
  done: boolean
  important: boolean
  category?: string
  color?: string
  date?: string // "YYYY-MM-DD" oder leer/null
}

/** Farben (8 Stück) */
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

/** State */
const tasks = ref<Task[]>([])
const loading = ref(false)
const error = ref('')

/** Create */
const newTaskName = ref('')
const newTaskCategory = ref<string>('') // dropdown
const newTaskColor = ref<string>(COLOR_OPTIONS[1].value) // blau default
const newTaskDate = ref<string>('') // YYYY-MM-DD (input type=date)

/** Categories (vom Backend) */
const categories = ref<string[]>([])
const categoryToDelete = ref<string>('')

/** Calendar (simple month view) */
const today = new Date()
const calendarMonth = ref<number>(today.getMonth()) // 0..11
const calendarYear = ref<number>(today.getFullYear())
const selectedDate = ref<string>('') // YYYY-MM-DD

function pad2(n: number) {
  return String(n).padStart(2, '0')
}
function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
function monthLabel(monthIndex: number, year: number) {
  const names = [
    'Januar','Februar','März','April','Mai','Juni',
    'Juli','August','September','Oktober','November','Dezember'
  ]
  return `${names[monthIndex]} ${year}`
}
const monthTitle = computed(() => monthLabel(calendarMonth.value, calendarYear.value))

/** 4 Jahre Range */
const minYear = today.getFullYear() - 2
const maxYear = today.getFullYear() + 2

function prevMonth() {
  if (calendarMonth.value === 0) {
    if (calendarYear.value <= minYear) return
    calendarMonth.value = 11
    calendarYear.value -= 1
  } else calendarMonth.value -= 1
}
function nextMonth() {
  if (calendarMonth.value === 11) {
    if (calendarYear.value >= maxYear) return
    calendarMonth.value = 0
    calendarYear.value += 1
  } else calendarMonth.value += 1
}

/** Calendar grid (Mo..So) */
const calendarDays = computed(() => {
  const y = calendarYear.value
  const m = calendarMonth.value
  const first = new Date(y, m, 1)
  const last = new Date(y, m + 1, 0)

  // JS: So=0..Sa=6, wir wollen Mo=0..So=6
  const firstDow = (first.getDay() + 6) % 7
  const totalDays = last.getDate()

  const cells: { date: Date; inMonth: boolean }[] = []

  // leading days
  for (let i = firstDow - 1; i >= 0; i--) {
    const d = new Date(y, m, 1)
    d.setDate(d.getDate() - (i + 1))
    cells.push({ date: d, inMonth: false })
  }
  // month days
  for (let day = 1; day <= totalDays; day++) {
    cells.push({ date: new Date(y, m, day), inMonth: true })
  }
  // trailing days (to complete 6 rows = 42)
  while (cells.length < 42) {
    const d = new Date(y, m, totalDays)
    d.setDate(d.getDate() + (cells.length - (firstDow + totalDays) + 1))
    cells.push({ date: d, inMonth: false })
  }
  return cells
})

/** quick lookup: tasks by date */
const tasksByDate = computed(() => {
  const map = new Map<string, Task[]>()
  for (const t of tasks.value) {
    if (!t.date) continue
    const key = t.date
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(t)
  }
  return map
})

function dayHasTasks(iso: string) {
  return tasksByDate.value.has(iso)
}
function dayTasks(iso: string) {
  return tasksByDate.value.get(iso) ?? []
}

/** Backend calls */
async function loadCategories() {
  try {
    const res = await fetch(`${API_BASE}/categories`)
    if (!res.ok) throw new Error(`Load categories failed (HTTP ${res.status})`)
    const data = await res.json()
    categories.value = Array.isArray(data) ? data : []
    categories.value.sort((a, b) => a.localeCompare(b))
  } catch (e: any) {
    // Kategorien sind nice-to-have → nicht hart crashen, aber anzeigen
    error.value = e?.message ?? 'Failed to fetch categories'
  }
}

async function createCategory(name: string) {
  const cleaned = name.trim()
  if (!cleaned) return
  const res = await fetch(`${API_BASE}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: cleaned }),
  })
  if (!res.ok) throw new Error(`Create category failed (HTTP ${res.status})`)
  await loadCategories()
  newTaskCategory.value = cleaned
}

async function deleteCategory(name: string) {
  const cleaned = name.trim()
  if (!cleaned) return
  const res = await fetch(`${API_BASE}/categories/${encodeURIComponent(cleaned)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(`Delete category failed (HTTP ${res.status})`)
  await loadCategories()
  if (newTaskCategory.value === cleaned) newTaskCategory.value = ''
  if (categoryToDelete.value === cleaned) categoryToDelete.value = ''
}

function handleCategoryChange() {
  if (newTaskCategory.value === '__new__') {
    const name = window.prompt('Neue Kategorie erstellen (Name):') ?? ''
    newTaskCategory.value = ''
    if (name.trim()) {
      createCategory(name).catch((e: any) => (error.value = e?.message ?? 'Create category failed'))
    }
  }
}

/** Tasks */
async function loadTasks() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(`${API_BASE}/tasks`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    tasks.value = await res.json()
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to fetch'
  } finally {
    loading.value = false
  }
}

async function addTask() {
  const name = newTaskName.value.trim()
  if (!name) return

  try {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskName: name,
        important: false,
        done: false,
        category: newTaskCategory.value && newTaskCategory.value !== '__new__' ? newTaskCategory.value : '',
        color: newTaskColor.value,
        date: newTaskDate.value ? newTaskDate.value : null,
      }),
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`Create task failed (HTTP ${res.status})${txt ? ` – ${txt}` : ''}`)
    }
    const created: Task = await res.json()
    tasks.value.unshift(created)

    // Reset (Kategorie/Farbe behalten, Datum resetten)
    newTaskName.value = ''
    newTaskDate.value = ''
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to fetch'
  }
}

async function deleteTask(id: number) {
  try {
    const res = await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Delete failed')
    tasks.value = tasks.value.filter(t => t.id !== id)
  } catch {
    error.value = 'Delete failed'
  }
}

async function toggleDone(task: Task) {
  try {
    const res = await fetch(`${API_BASE}/tasks/${task.id}/done?done=${task.done}`, { method: 'PATCH' })
    if (!res.ok) throw new Error('Update failed')
  } catch {
    error.value = 'Update failed'
    task.done = !task.done
  }
}

async function updateColor(task: Task) {
  try {
    const res = await fetch(`${API_BASE}/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: task.category ?? '',
        color: task.color ?? '',
        date: task.date ?? null,
      }),
    })
    if (!res.ok) throw new Error('Update failed')
  } catch {
    error.value = 'Update failed'
  }
}

/** Auswahl im Kalender: Klick auf Tag */
function pickDate(iso: string) {
  selectedDate.value = iso
  // Optional: Beim Klick Datum direkt in Create setzen:
  newTaskDate.value = iso
}

onMounted(async () => {
  await loadCategories()
  await loadTasks()
})
</script>

<template>
  <div class="container-fluid py-4" style="max-width: 1400px;">
    <div class="row g-4 align-items-start">
      <!-- LEFT: TODO -->
      <div class="col-12 col-lg-6">
        <div class="card glass-card shadow-sm rounded-4">
          <div class="card-body p-4">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <h2 class="m-0 d-flex align-items-center gap-2">
                🗒️ <span>ToDo-Liste</span>
              </h2>
              <span v-if="loading" class="badge text-bg-secondary rounded-pill">Lade…</span>
            </div>

            <div v-if="error" class="alert alert-danger rounded-4 py-2 mb-3 text-center">
              {{ error }}
            </div>

            <!-- CREATE (mehr Platz: 2 Zeilen) -->
            <div class="mb-3">
              <!-- Zeile 1: Task breit -->
              <div class="row g-2 align-items-end">
                <div class="col-12">
                  <label class="form-label mb-1">Task</label>
                  <input
                    v-model="newTaskName"
                    class="form-control form-control-lg rounded-pill dark-input"
                    placeholder="Neue Aufgabe…"
                    @keyup.enter="addTask"
                  />
                </div>
              </div>

              <!-- Zeile 2: Kategorie / Farbe / Datum / + -->
              <div class="row g-2 align-items-end mt-1">
                <div class="col-12 col-md-5">
                  <label class="form-label mb-1">Kategorie</label>
                  <div class="input-group">
                    <select
                      v-model="newTaskCategory"
                      class="form-select rounded-pill dark-select"
                      @change="handleCategoryChange"
                    >
                      <option value="">(keine)</option>
                      <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
                      <option value="__new__">➕ Neue Kategorie…</option>
                    </select>

                    <!-- kompakter Delete-Button (nicht breit) -->
                    <button
                      class="btn btn-outline-danger btn-icon rounded-pill"
                      type="button"
                      title="Kategorie löschen"
                      :disabled="!newTaskCategory || newTaskCategory === '__new__'"
                      @click="deleteCategory(newTaskCategory).catch((e:any)=> error = e?.message ?? 'Delete category failed')"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div class="col-6 col-md-3">
                  <label class="form-label mb-1">Farbe</label>
                  <select v-model="newTaskColor" class="form-select rounded-pill dark-select">
                    <option v-for="co in COLOR_OPTIONS" :key="co.value" :value="co.value">
                      {{ co.label }}
                    </option>
                  </select>
                </div>

                <div class="col-6 col-md-3">
                  <label class="form-label mb-1">Datum</label>
                  <input
                    v-model="newTaskDate"
                    type="date"
                    class="form-control rounded-pill dark-input"
                  />
                </div>

                <div class="col-12 col-md-1 d-grid">
                  <button class="btn btn-primary btn-lg rounded-pill" @click="addTask">+</button>
                </div>
              </div>

              <!-- Kategorien quick view + separate delete (optional, schön wie vorher) -->
              <div class="mt-3 d-flex flex-wrap align-items-center gap-2">
                <span class="small text-muted me-2">Kategorien</span>

                <span
                  v-for="c in categories"
                  :key="c"
                  class="badge rounded-pill cat-badge"
                >
                  {{ c }}
                  <button
                    class="btn btn-link p-0 ms-2 text-danger text-decoration-none"
                    style="line-height:1;"
                    title="Kategorie löschen"
                    @click="deleteCategory(c).catch((e:any)=> error = e?.message ?? 'Delete category failed')"
                  >
                    ✕
                  </button>
                </span>
              </div>
            </div>

            <!-- LIST (alles pro Task in einer Zeile, delete kompakt) -->
            <ul class="list-group list-group-flush">
              <li
                v-for="t in tasks"
                :key="t.id"
                class="list-group-item task-row rounded-4 mb-3"
                :style="{ borderLeftColor: t.color || '#2b2f36' }"
              >
                <div class="d-flex align-items-center gap-3">
                  <input
                    class="form-check-input mt-0"
                    type="checkbox"
                    v-model="t.done"
                    @change="toggleDone(t)"
                  />

                  <div class="flex-grow-1 d-flex align-items-center gap-2 overflow-hidden">
                    <span
                      class="fw-semibold text-truncate"
                      :class="{ 'text-decoration-line-through text-muted': t.done }"
                    >
                      {{ t.taskName }}
                    </span>

                    <!-- Kategorie Badge (wieder farbig abgesetzt) -->
                    <span v-if="t.category" class="badge rounded-pill badge-cat">
                      {{ t.category }}
                    </span>

                    <!-- Datum Badge (wieder eigener Look) -->
                    <span v-if="t.date" class="badge rounded-pill badge-date">
                      🗓️ {{ t.date }}
                    </span>
                  </div>

                  <!-- Farbe ändern -->
                  <select
                    v-model="t.color"
                    class="form-select form-select-sm rounded-pill dark-select"
                    style="max-width: 170px;"
                    @change="updateColor(t)"
                  >
                    <option v-for="co in COLOR_OPTIONS" :key="co.value" :value="co.value">
                      {{ co.label }}
                    </option>
                  </select>

                  <!-- Delete kompakt -->
                  <button class="btn btn-outline-danger btn-icon rounded-pill" @click="deleteTask(t.id)">
                    🗑️
                  </button>
                </div>
              </li>
            </ul>

          </div>
        </div>
      </div>

      <!-- RIGHT: CALENDAR -->
      <div class="col-12 col-lg-6">
        <div class="card glass-card shadow-sm rounded-4">
          <div class="card-body p-4">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <h2 class="m-0 d-flex align-items-center gap-2">
                🗓️ <span>Kalender</span>
              </h2>

              <div class="d-flex align-items-center gap-2">
                <button class="btn btn-outline-light btn-icon rounded-pill" @click="prevMonth" :disabled="calendarYear <= minYear && calendarMonth === 0">‹</button>
                <div class="fw-semibold px-2">{{ monthTitle }}</div>
                <button class="btn btn-outline-light btn-icon rounded-pill" @click="nextMonth" :disabled="calendarYear >= maxYear && calendarMonth === 11">›</button>
              </div>
            </div>

            <!-- OPTIONAL: Year dropdown (lesbar gemacht!) -->
            <div class="d-flex align-items-center gap-2 mb-3">
              <label class="small text-muted">Jahr</label>
              <select v-model="calendarYear" class="form-select form-select-sm rounded-pill dark-select" style="max-width: 140px;">
                <option v-for="y in (maxYear - minYear + 1)" :key="y" :value="minYear + (y-1)">
                  {{ minYear + (y-1) }}
                </option>
              </select>

              <label class="small text-muted ms-2">Monat</label>
              <select v-model="calendarMonth" class="form-select form-select-sm rounded-pill dark-select" style="max-width: 170px;">
                <option :value="0">Januar</option><option :value="1">Februar</option><option :value="2">März</option>
                <option :value="3">April</option><option :value="4">Mai</option><option :value="5">Juni</option>
                <option :value="6">Juli</option><option :value="7">August</option><option :value="8">September</option>
                <option :value="9">Oktober</option><option :value="10">November</option><option :value="11">Dezember</option>
              </select>
            </div>

            <!-- Weekday header -->
            <div class="calendar-head">
              <div>Mo</div><div>Di</div><div>Mi</div><div>Do</div><div>Fr</div><div>Sa</div><div>So</div>
            </div>

            <!-- Calendar grid -->
            <div class="calendar-grid">
              <button
                v-for="cell in calendarDays"
                :key="toISODate(cell.date)"
                class="calendar-cell"
                :class="{
                  'out': !cell.inMonth,
                  'selected': selectedDate === toISODate(cell.date),
                  'has': dayHasTasks(toISODate(cell.date))
                }"
                @click="pickDate(toISODate(cell.date))"
                type="button"
              >
                <div class="day-num">{{ cell.date.getDate() }}</div>

                <!-- kleine Task markers -->
                <div class="markers" v-if="dayHasTasks(toISODate(cell.date))">
                  <span
                    v-for="(tt, i) in dayTasks(toISODate(cell.date)).slice(0, 3)"
                    :key="tt.id"
                    class="dot"
                    :style="{ backgroundColor: tt.color || '#6c757d' }"
                    :title="tt.taskName"
                  />
                  <span v-if="dayTasks(toISODate(cell.date)).length > 3" class="more">+{{ dayTasks(toISODate(cell.date)).length - 3 }}</span>
                </div>
              </button>
            </div>

            <div class="text-center text-muted mt-3">
              <span v-if="selectedDate">Ausgewählt: <span class="badge rounded-pill badge-date">🗓️ {{ selectedDate }}</span></span>
              <span v-else>Wähle ein Datum</span>
            </div>

            <div class="mt-3">
              <button class="btn btn-outline-light rounded-pill w-100" @click="loadTasks">
                Kalender aktualisieren
              </button>
            </div>

          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* ─────────────────────────────────────────────
   Glass / Dark UI helpers
────────────────────────────────────────────── */
.glass-card {
  background: rgba(35, 40, 48, 0.60);
  border: 1px solid rgba(255,255,255,0.10);
  backdrop-filter: blur(14px);
  color: rgba(255,255,255,0.92);
}

.dark-input,
.dark-select {
  background: rgba(20, 22, 26, 0.55);
  border: 1px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.92);
}

.dark-input::placeholder {
  color: rgba(255,255,255,0.45);
}

.dark-select option {
  background: #15171c; /* wichtig: damit Dropdown lesbar ist */
  color: #fff;
}

/* Fix: Kalender dropdown war hellgrau mit weißer Schrift → jetzt sauber */
.dark-select:focus,
.dark-input:focus {
  border-color: rgba(13,110,253,0.55);
  box-shadow: 0 0 0 0.2rem rgba(13,110,253,0.15);
}

/* kompakter Icon Button (verhindert "breit") */
.btn-icon {
  width: 44px;
  min-width: 44px;
  height: 40px;
  padding: 0;
  display: grid;
  place-items: center;
}

/* ─────────────────────────────────────────────
   Task row (eine Zeile wie vorher)
────────────────────────────────────────────── */
.task-row {
  background: rgba(20, 22, 26, 0.35);
  border: 1px solid rgba(255,255,255,0.08);
  border-left: 8px solid #2b2f36;
  color: rgba(255,255,255,0.92);
}

.list-group-item {
  border: none;
}

/* farbige Badges (Kategorie/Datum abheben) */
.badge-cat {
  background: rgba(13,110,253,0.18);
  border: 1px solid rgba(13,110,253,0.35);
  color: rgba(255,255,255,0.92);
}
.badge-date {
  background: rgba(32,201,151,0.18);
  border: 1px solid rgba(32,201,151,0.35);
  color: rgba(255,255,255,0.92);
}

.cat-badge {
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.16);
  color: rgba(255,255,255,0.9);
}

/* ─────────────────────────────────────────────
   Calendar
────────────────────────────────────────────── */
.calendar-head {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10px;
  margin-bottom: 10px;
  opacity: 0.8;
  font-weight: 600;
  text-align: center;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10px;
}

.calendar-cell {
  position: relative;
  height: 74px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(20, 22, 26, 0.35);
  color: rgba(255,255,255,0.92);
  text-align: left;
  padding: 10px 10px;
  transition: 0.15s ease;
}

.calendar-cell:hover {
  border-color: rgba(13,110,253,0.35);
  transform: translateY(-1px);
}

.calendar-cell.out {
  opacity: 0.35;
}

.calendar-cell.selected {
  outline: 2px solid rgba(13,110,253,0.55);
}

.calendar-cell.has {
  border-color: rgba(32,201,151,0.25);
}

.day-num {
  font-weight: 700;
}

.markers {
  position: absolute;
  left: 10px;
  bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
  box-shadow: 0 0 0 2px rgba(0,0,0,0.25);
}

.more {
  font-size: 0.75rem;
  opacity: 0.8;
}

/* Responsive: auf sehr kleinen Screens sollen Cards untereinander */
@media (max-width: 992px) {
  .calendar-cell { height: 66px; }
}
</style>
