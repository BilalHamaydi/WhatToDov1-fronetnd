<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { API_BASE } from '../api'

type ISODate = string // "YYYY-MM-DD"

interface Task {
  id: number
  taskName?: string
  name?: string
  done: boolean
  important: boolean
  category?: string | null
  color?: string | null
  date?: ISODate | null
}


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

// ✅ NUR: Monatsnamen als Konstante (für Dropdown)
const MONTHS_DE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']

// ---------- State ----------
const tasks = ref<Task[]>([])
const categories = ref<string[]>([])
const loading = ref(false)
const error = ref('')

// Create form
const newTaskName = ref('')
const newTaskCategory = ref<string>('')
const newTaskColor = ref<string>(COLOR_OPTIONS[1].value)
const newTaskDate = ref<string>('')
// ✅ NUR: Suchfilter links
const searchQuery = ref('')


const creatingCategory = ref(false)

// Calendar
const selectedDate = ref<ISODate | ''>('')
const currentMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))

// ✅ NUR: Jahr/Monat auswählbar (über currentMonth gesteuert)
const yearOptions = computed(() => {
  const y = new Date().getFullYear()
  // 4 Jahre Bereich (+/-2 um aktuelles Jahr)
  return Array.from({ length: 5 }, (_, i) => y - 2 + i)
})

const selectedYear = computed<number>({
  get: () => currentMonth.value.getFullYear(),
  set: (y) => {
    currentMonth.value = new Date(y, currentMonth.value.getMonth(), 1)
  },
})

const selectedMonthIndex = computed<number>({
  get: () => currentMonth.value.getMonth(),
  set: (m) => {
    currentMonth.value = new Date(currentMonth.value.getFullYear(), m, 1)
  },
})

// ---------- Helpers ----------
function toISO(d: Date): ISODate {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function normalizeTask(t: Task): Task {
  return {
    ...t,
    taskName: t.taskName ?? t.name ?? '',
  }
}

function fromISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}
function formatBadgeDate(iso: ISODate): string {
  const d = fromISO(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}
function sortUniqueStrings(xs: string[]) {
  return Array.from(new Set(xs.filter(x => x && x.trim()))).sort((a, b) => a.localeCompare(b))
}
function normalizeCategoryName(name: string) {
  return name.trim()
}

// ---------- API ----------
async function apiGetJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as T
}

async function loadTasks() {
  loading.value = true
  error.value = ''
  try {
    const raw = await apiGetJson<Task[]>(`${API_BASE}/tasks`)
    tasks.value = raw.map(normalizeTask)
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to fetch tasks'
  } finally {
    loading.value = false
  }
}


async function loadCategories() {
  try {
    const list = await apiGetJson<string[]>(`${API_BASE}/categories`)
    categories.value = sortUniqueStrings(list)
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to fetch categories'
  }
}

async function createCategory() {
  const name = window.prompt('Neue Kategorie erstellen (Name):') ?? ''
  const cleaned = normalizeCategoryName(name)
  if (!cleaned) return

  creatingCategory.value = true
  error.value = ''
  try {
    const res = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: cleaned }),
    })
    if (!res.ok) throw new Error(`Create category failed (HTTP ${res.status})`)
    await loadCategories()
    newTaskCategory.value = cleaned
  } catch (e: any) {
    error.value = e?.message ?? 'Create category failed'
  } finally {
    creatingCategory.value = false
  }
}

// ✅ NUR: Kategorie löschen (Funktionsblock war schon da – bleibt gleich)
async function deleteCategory(name: string) {
  const cleaned = normalizeCategoryName(name)
  if (!cleaned) return
  if (!window.confirm(`Kategorie "${cleaned}" wirklich löschen?`)) return

  error.value = ''
  try {
    const res = await fetch(`${API_BASE}/categories/${encodeURIComponent(cleaned)}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Delete category failed (HTTP ${res.status})${text ? ` – ${text}` : ''}`)
    }

    // UI updaten
    categories.value = categories.value.filter(c => c !== cleaned)
    if (newTaskCategory.value === cleaned) newTaskCategory.value = ''
  } catch (e: any) {
    error.value = e?.message ?? 'Delete category failed'
  }
}

async function addTask() {
  const name = newTaskName.value.trim()
  if (!name) return

  error.value = ''
  try {
    const body = {
      name,              // ✅ für Tests/Backend die "name" erwarten
      taskName: name,    // ✅ für dein UI
      important: false,
      done: false,
      category: newTaskCategory.value || '',
      color: newTaskColor.value,
      date: newTaskDate.value || null,
    }


    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Create task failed (HTTP ${res.status})${text ? ` – ${text}` : ''}`)
    }

    const created: Task = normalizeTask(await res.json())
    tasks.value.unshift(created)


    newTaskName.value = ''
    newTaskDate.value = ''
  } catch (e: any) {
    error.value = e?.message ?? 'Create task failed'
  }
}

async function deleteTask(id: number) {
  error.value = ''
  try {
    const res = await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`Delete failed (HTTP ${res.status})`)
    tasks.value = tasks.value.filter(t => t.id !== id)
  } catch (e: any) {
    error.value = e?.message ?? 'Delete failed'
  }
}

async function toggleDone(task: Task) {
  error.value = ''
  try {
    const res = await fetch(`${API_BASE}/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: task.done }),
    })
    if (!res.ok) throw new Error(`Update failed (HTTP ${res.status})`)
  } catch (e: any) {
    task.done = !task.done
    error.value = e?.message ?? 'Update failed'
  }
}


async function refreshAll() {
  await Promise.all([loadTasks(), loadCategories()])
}

// ---------- Calendar computed ----------
const monthLabel = computed(() => {
  const d = currentMonth.value
  const months = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
  return `${months[d.getMonth()]} ${d.getFullYear()}`
})

const calendarDays = computed(() => {
  const base = currentMonth.value
  const year = base.getFullYear()
  const month = base.getMonth()

  const first = new Date(year, month, 1)
  const firstDay = first.getDay() // 0=Sun
  const shift = (firstDay + 6) % 7 // Monday=0

  const start = new Date(year, month, 1 - shift)
  const days: Array<{ date: Date; iso: ISODate; inMonth: boolean }> = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push({ date: d, iso: toISO(d), inMonth: d.getMonth() === month })
  }
  return days
})

const tasksByDate = computed(() => {
  const map = new Map<ISODate, Task[]>()
  for (const t of tasks.value) {
    if (!t.date) continue
    const iso = t.date
    if (!map.has(iso)) map.set(iso, [])
    map.get(iso)!.push(t)
  }
  for (const [k, arr] of map.entries()) {
    arr.sort((a, b) => Number(a.done) - Number(b.done))
    map.set(k, arr)
  }
  return map
})

const selectedDayTasks = computed(() => {
  if (!selectedDate.value) return []
  return tasksByDate.value.get(selectedDate.value) ?? []
})

const tasksForLeftPanel = computed(() => {
  const base = selectedDate.value ? selectedDayTasks.value : tasks.value
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return base
  return base.filter(t => (t.taskName ?? '').toLowerCase().includes(q))
})


function prevMonth() {
  const d = currentMonth.value
  currentMonth.value = new Date(d.getFullYear(), d.getMonth() - 1, 1)
}
function nextMonth() {
  const d = currentMonth.value
  currentMonth.value = new Date(d.getFullYear(), d.getMonth() + 1, 1)
}
function selectDay(iso: ISODate) {
  selectedDate.value = iso
}
function clearDateFilter() {
  selectedDate.value = ''
}

onMounted(async () => {
  await refreshAll()
})
</script>

<template>
  <div class="wt-wrap">
    <div class="wt-grid">
      <!-- LEFT -->
      <div class="wt-card">
        <div class="wt-card-head">
          <div class="wt-title">
            <span class="wt-icon">🗒️</span>
            <span>ToDo-Liste</span>
          </div>

          <div class="wt-right-head">
            <span v-if="loading" class="wt-pill wt-pill-muted">Lade…</span>

            <button
              v-if="selectedDate"
              class="wt-btn wt-btn-ghost wt-filter-chip"
              @click="clearDateFilter"
              title="Filter aufheben"
            >
              Filter: {{ formatBadgeDate(selectedDate) }} ✕
            </button>
          </div>
        </div>

        <div v-if="error" class="wt-alert">{{ error }}</div>

        <!-- Create -->
        <div class="wt-create-one">
          <div class="wt-field wt-grow">
            <label class="wt-label">Task</label>
            <input
              v-model="newTaskName"
              class="wt-input"
              placeholder="Neue Aufgabe…"
              @keyup.enter="addTask"
            />
          </div>

                 <!-- ✅ NUR: Suche -->
                 <div class="wt-search-card">
                   <div class="wt-search-title">🔍 Suche</div>
                   <input
                     v-model="searchQuery"
                     class="wt-input"
                     placeholder="Taskname eingeben…"
                   />
                 </div>


          <div class="wt-field wt-w260">
            <label class="wt-label">Kategorie</label>
            <div class="wt-inline">
              <select v-model="newTaskCategory" class="wt-select">
                <option value="">(keine)</option>
                <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
              </select>

              <button
                class="wt-btn wt-btn-icon"
                :disabled="creatingCategory"
                title="Neue Kategorie"
                @click="createCategory"
              >
                +
              </button>

              <!-- ✅ NUR: Kategorie löschen Button -->
              <button
                class="wt-btn wt-btn-danger wt-btn-icon"
                :disabled="!newTaskCategory"
                title="Kategorie löschen"
                @click="deleteCategory(newTaskCategory)"
              >
                🗑️
              </button>
            </div>
          </div>

          <div class="wt-field wt-w220">
            <label class="wt-label">Farbe</label>
            <select v-model="newTaskColor" class="wt-select">
              <option v-for="co in COLOR_OPTIONS" :key="co.value" :value="co.value">
                {{ co.label }}
              </option>
            </select>
          </div>

          <div class="wt-field wt-w220">
            <label class="wt-label">Datum</label>
            <input v-model="newTaskDate" class="wt-input" type="date" />
          </div>

          <button class="wt-btn wt-btn-primary wt-btn-big" @click="addTask" title="Task hinzufügen">
            +
          </button>
        </div>

        <!-- LIST -->
        <div class="wt-list">
          <div
            v-for="t in tasksForLeftPanel"
            :key="t.id"
            class="wt-item"
            :style="{ borderLeftColor: t.color || '#2b2f36' }"
          >
            <div class="wt-item-row">
              <input class="wt-check" type="checkbox" v-model="t.done" @change="toggleDone(t)" />

              <div class="wt-item-main">
                <div class="wt-item-name" :class="{ done: t.done }">
                  {{ t.taskName || t.name }}

                </div>

                <div class="wt-item-badges">
                  <span v-if="t.category" class="wt-pill wt-pill-cat">{{ t.category }}</span>
                  <span v-if="t.date" class="wt-pill wt-pill-date">📅 {{ formatBadgeDate(t.date) }}</span>
                </div>
              </div>

              <button class="wt-btn wt-btn-danger wt-btn-icon" title="Task löschen" @click="deleteTask(t.id)">
                🗑️
              </button>
            </div>
          </div>

          <div v-if="selectedDate && !tasksForLeftPanel.length" class="wt-empty">
            Keine Tasks für diesen Tag.
          </div>
        </div>
      </div>

      <!-- RIGHT -->
            <!-- RIGHT -->
                  <!-- RIGHT -->
                  <div class="wt-card">
                    <!-- Überschrift NUR -->
                    <div class="wt-card-head">
                      <div class="wt-title">
                        <span class="wt-icon">🗓️</span>
                        <span>Kalender</span>
                      </div>
                    </div>

                    <!-- ✅ Navigation UNTER der Überschrift -->
                    <div class="wt-cal-nav wt-cal-nav-below">
                      <button class="wt-btn wt-btn-ghost wt-btn-icon" @click="prevMonth" aria-label="Vorheriger Monat">‹</button>

                      <div class="wt-cal-pickers">
                        <select v-model="selectedMonthIndex" class="wt-select wt-select-cal" aria-label="Monat wählen">
                          <option v-for="(m, idx) in MONTHS_DE" :key="m" :value="idx">{{ m }}</option>
                        </select>

                        <select v-model="selectedYear" class="wt-select wt-select-cal wt-select-year" aria-label="Jahr wählen">
                          <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
                        </select>
                      </div>

                      <button class="wt-btn wt-btn-ghost wt-btn-icon" @click="nextMonth" aria-label="Nächster Monat">›</button>
                    </div>

                    <div class="wt-cal-week">
                      <div>Mo</div><div>Di</div><div>Mi</div><div>Do</div><div>Fr</div><div>Sa</div><div>So</div>
                    </div>

                    <div class="wt-cal-grid">
                      <button
                        v-for="d in calendarDays"
                        :key="d.iso"
                        class="wt-cal-day"
                        :class="{ muted: !d.inMonth, selected: selectedDate === d.iso }"
                        @click="selectDay(d.iso)"
                        type="button"
                      >
                        <div class="wt-cal-top">
                          <div class="wt-cal-num">{{ d.date.getDate() }}</div>

                          <div class="wt-cal-dots" v-if="(tasksByDate.get(d.iso) ?? []).length">
                            <span
                              v-for="tt in (tasksByDate.get(d.iso) ?? []).slice(0, 4)"
                              :key="tt.id"
                              class="dot"
                              :style="{ background: tt.color || '#2b2f36' }"
                              :title="tt.taskName"
                            ></span>

                            <span v-if="(tasksByDate.get(d.iso) ?? []).length > 4" class="wt-cal-more">
                              +{{ (tasksByDate.get(d.iso) ?? []).length - 4 }}
                            </span>
                          </div>
                        </div>
                      </button>
                    </div>

                    <div class="wt-divider"></div>

                    <div class="wt-selected">
                      <div class="wt-selected-title">
                        <span v-if="selectedDate">📅 {{ formatBadgeDate(selectedDate) }}</span>
                        <span v-else>Wähle ein Datum</span>
                      </div>

                      <div v-if="selectedDate && selectedDayTasks.length" class="wt-selected-list">
                        <div v-for="tt in selectedDayTasks" :key="tt.id" class="wt-selected-item">
                          <span class="dot" :style="{ background: tt.color || '#2b2f36' }"></span>
                          <span :class="{ done: tt.done }">{{ tt.taskName }}</span>
                          <span v-if="tt.category" class="wt-pill wt-pill-cat small">{{ tt.category }}</span>
                        </div>
                      </div>

                      <div v-else-if="selectedDate" class="wt-empty">
                        Keine Tasks für diesen Tag.
                      </div>
                    </div>

                    <button class="wt-btn wt-btn-wide" @click="refreshAll">
                      Kalender aktualisieren
                    </button>
                  </div>
</div>
</div>
</template>

<style scoped>
.wt-wrap { width: 100%; padding: 18px 16px 28px; }

/* Mehr Platz links + harte Min-Breite damit nix überlappt */
.wt-grid {
  display: grid;
  grid-template-columns: minmax(740px, 1.25fr) minmax(520px, 1fr);
  gap: 22px;
  align-items: start;
}
@media (max-width: 1320px) { .wt-grid { grid-template-columns: 1fr; } }

.wt-card {
  border-radius: 18px;
  background: rgba(28, 32, 38, 0.75);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 18px 50px rgba(0,0,0,0.35);
  backdrop-filter: blur(10px);
  padding: 18px 18px 16px;
}

.wt-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 12px;
}

.wt-right-head { display:flex; align-items:center; gap: 10px; flex-wrap: wrap; }
.wt-filter-chip { white-space: nowrap; }

.wt-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.55rem;
  font-weight: 700;
  color: rgba(255,255,255,0.92);
}

/* ✅ Suche klar abgesetzt */
.wt-search-card {
  margin-top: 14px;
  padding: 14px;
  border-radius: 16px;
  background: rgba(18, 22, 27, 0.6);
  border: 1px solid rgba(255,255,255,0.08);
}

.wt-search-title {
  font-size: 0.9rem;
  font-weight: 650;
  color: rgba(255,255,255,0.75);
  margin-bottom: 8px;
}

.wt-icon { opacity: 0.9; }

.wt-alert {
  margin: 10px 0 14px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(220, 53, 69, 0.18);
  border: 1px solid rgba(220, 53, 69, 0.35);
  color: rgba(255, 180, 190, 0.95);
  text-align: center;
}

/* Create: wrap erlaubt + keine Überlappung */
.wt-create-one {
  margin-top: 8px;
  padding: 12px;
  border-radius: 16px;
  background: rgba(10, 12, 14, 0.22);
  border: 1px solid rgba(255,255,255,0.06);
  display: flex;
  gap: 12px;
  align-items: flex-end;
  flex-wrap: wrap;
}
.wt-field { display:flex; flex-direction:column; gap:6px; }
.wt-label { font-size: 0.86rem; color: rgba(255,255,255,0.7); padding-left: 4px; }

.wt-grow { flex: 1 1 260px; min-width: 260px; }
.wt-w260 { width: 320px; min-width: 280px; }
.wt-w220 { width: 240px; min-width: 220px; }

.wt-inline { display:flex; gap:8px; align-items:center; }

.wt-input, .wt-select {
  height: 44px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(18, 22, 27, 0.82);
  color: rgba(255,255,255,0.92);
  padding: 0 14px;
  outline: none;
}
.wt-input::placeholder { color: rgba(255,255,255,0.45); }
.wt-select { padding-right: 34px; }
.wt-select option { background: #12161b; color: #ffffff; }

.wt-select:focus, .wt-input:focus {
  border-color: rgba(13,110,253,0.55);
  box-shadow: 0 0 0 4px rgba(13,110,253,0.18);
}

.wt-btn {
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(18, 22, 27, 0.7);
  color: rgba(255,255,255,0.9);
  border-radius: 14px;
  padding: 10px 14px;
  cursor: pointer;
  transition: transform 0.08s ease, opacity 0.2s ease, border-color 0.2s ease;
  user-select: none;
}
.wt-btn:hover { opacity: 0.9; }
.wt-btn:active { transform: translateY(1px); }

.wt-btn-icon {
  width: 44px;
  height: 44px;
  padding: 0;
  display: grid;
  place-items: center;
  border-radius: 14px;
  box-sizing: border-box;
}
.wt-btn-primary { background: rgba(13,110,253,0.88); border-color: rgba(13,110,253,0.5); }
.wt-btn-danger { background: rgba(220, 53, 69, 0.16); border-color: rgba(220, 53, 69, 0.35); }
.wt-btn-ghost { background: transparent; border-color: rgba(255,255,255,0.10); }

.wt-btn-big {
  width: 62px;
  height: 44px;
  border-radius: 16px;
  font-size: 1.2rem;
  font-weight: 700;
  align-self: flex-end;
}

.wt-btn-wide { width: 100%; margin-top: 12px; height: 46px; border-radius: 18px; }

.wt-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.82rem;
  border: 1px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.9);
  background: rgba(18, 22, 27, 0.75);
}
.wt-pill.small { padding: 4px 8px; font-size: 0.78rem; }
.wt-pill-muted { opacity: 0.75; }

.wt-pill-cat { background: rgba(13,110,253,0.18); border-color: rgba(13,110,253,0.35); }
.wt-pill-date { background: rgba(32,201,151,0.16); border-color: rgba(32,201,151,0.33); }

.wt-list { margin-top: 14px; display:flex; flex-direction:column; gap:12px; }

.wt-item {
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(18, 22, 27, 0.55);
  border-left: 6px solid #2b2f36;
  padding: 12px 12px;
}
/* ✅ NUR: Suche */
.wt-search {
  margin-top: 12px;
}

.wt-item-row { display:flex; align-items:center; gap:12px; }
.wt-check { width: 18px; height: 18px; accent-color: #0d6efd; }

.wt-item-main { flex:1; display:flex; flex-direction:column; gap:6px; min-width:0; }

.wt-item-name {
  font-size: 1.05rem;
  font-weight: 650;
  color: rgba(255,255,255,0.92);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wt-item-name.done { text-decoration: line-through; opacity: 0.6; }
.wt-item-badges { display:flex; gap:8px; flex-wrap:wrap; }

.wt-empty { margin-top: 6px; text-align: center; opacity: 0.65; padding: 10px 0 4px; }

/* Calendar */
.wt-cal-nav { display:flex; align-items:center; gap:10px; padding-right: 4px;}
.wt-cal-nav-below { margin: 0 0 12px; justify-content: space-between; }


/* ✅ NUR: Picker styling */
.wt-cal-pickers { display:flex; align-items:center; gap:10px; }
.wt-select-cal { height: 44px; border-radius: 14px; }
.wt-select-year { width: 120px; }

.wt-cal-week {
  display:grid;
  grid-template-columns: repeat(7, 1fr);
  gap:10px;
  padding: 6px 2px 10px;
  color: rgba(255,255,255,0.65);
  font-size: 0.9rem;
}
.wt-cal-grid { display:grid; grid-template-columns: repeat(7, 1fr); gap:10px; }

.wt-cal-day {
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(18, 22, 27, 0.55);
  border-radius: 14px;
  padding: 10px 10px 8px;
  text-align:left;
  cursor:pointer;
  min-height: 74px;
  color: rgba(255,255,255,0.9);
  transition: border-color 0.15s ease, transform 0.08s ease, background 0.15s ease;
}
.wt-cal-day:hover { border-color: rgba(13,110,253,0.35); }
.wt-cal-day:active { transform: translateY(1px); }
.wt-cal-day.muted { opacity: 0.45; }
.wt-cal-day.selected { border-color: rgba(13,110,253,0.65); box-shadow: 0 0 0 4px rgba(13,110,253,0.16); }

.wt-cal-top { display:flex; align-items:flex-start; justify-content: space-between; gap: 10px; }
.wt-cal-num { font-weight: 700; opacity: 0.9; }

.wt-cal-dots { display:flex; align-items:center; gap: 6px; flex-wrap: nowrap; justify-content: flex-end; }
.wt-cal-dots .dot { width: 9px; height: 9px; border-radius: 999px; display:inline-block; box-shadow: 0 0 0 2px rgba(0,0,0,0.15); }
.wt-cal-more { font-size: 0.78rem; color: rgba(255,255,255,0.6); }

.wt-divider { height:1px; margin: 14px 0; background: rgba(255,255,255,0.08); }

.wt-selected { min-height: 88px; padding: 2px 2px 4px; }
.wt-selected-title { font-weight: 650; color: rgba(255,255,255,0.88); text-align:center; margin-bottom: 10px; }
.wt-selected-list { display:flex; flex-direction:column; gap:10px; }
.wt-selected-item { display:flex; align-items:center; gap:10px; color: rgba(255,255,255,0.9); }
.wt-selected-item .dot { width: 10px; height: 10px; border-radius: 999px; }
.wt-selected-item .done { text-decoration: line-through; opacity: 0.6; }
</style>
