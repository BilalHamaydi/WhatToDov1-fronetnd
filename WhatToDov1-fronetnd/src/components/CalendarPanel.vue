<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { API_BASE } from '../api'

type Task = {
  id: number
  taskName: string
  done: boolean
  important: boolean
  category?: string
  color?: string
  date?: string | null // "YYYY-MM-DD"
}

// ---------- Helpers ----------
function pad2(n: number) {
  return String(n).padStart(2, '0')
}
function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}
function addMonths(d: Date, months: number) {
  return new Date(d.getFullYear(), d.getMonth() + months, 1)
}
function clampDate(d: Date, min: Date, max: Date) {
  const t = d.getTime()
  if (t < min.getTime()) return new Date(min)
  if (t > max.getTime()) return new Date(max)
  return d
}

// ---------- State ----------
const loading = ref(false)
const error = ref('')

const today = new Date()
const minDate = new Date(today.getFullYear() - 2, today.getMonth(), 1)  // -2 Jahre
const maxDate = new Date(today.getFullYear() + 2, today.getMonth(), 1)  // +2 Jahre

const currentMonth = ref<Date>(startOfMonth(today))
const tasks = ref<Task[]>([])

// ---------- Fetch ----------
async function loadTasks() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(`${API_BASE}/tasks`)
    if (!res.ok) throw new Error(`Load tasks failed (HTTP ${res.status})`)
    tasks.value = await res.json()
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to fetch'
  } finally {
    loading.value = false
  }
}

function onTasksUpdated() {
  loadTasks()
}

// ---------- Calendar grid ----------
const monthLabel = computed(() => {
  const d = currentMonth.value
  const monthNames = [
    'Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'
  ]
  return `${monthNames[d.getMonth()]} ${d.getFullYear()}`
})

const daysOfWeek = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

const monthTasksMap = computed(() => {
  // Map ISO date -> tasks[]
  const map = new Map<string, Task[]>()
  for (const t of tasks.value) {
    if (!t.date) continue
    const key = t.date
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(t)
  }
  // Optional: sort tasks inside a day
  for (const [k, arr] of map.entries()) {
    arr.sort((a, b) => Number(a.done) - Number(b.done))
    map.set(k, arr)
  }
  return map
})

const calendarCells = computed(() => {
  const first = startOfMonth(currentMonth.value)
  const last = endOfMonth(currentMonth.value)

  // Convert JS getDay() (So=0..Sa=6) into Monday-first offset
  // Monday=0 ... Sunday=6
  const firstDay = first.getDay() // 0 Sunday
  const offset = (firstDay + 6) % 7

  const start = new Date(first)
  start.setDate(first.getDate() - offset)

  const cells: { date: Date; inMonth: boolean; iso: string; items: Task[] }[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const iso = toISODate(d)
    const inMonth = d.getMonth() === first.getMonth()
    const items = monthTasksMap.value.get(iso) ?? []
    cells.push({ date: d, inMonth, iso, items })
  }

  return cells
})

const canPrev = computed(() => {
  const next = addMonths(currentMonth.value, -1)
  return next.getTime() >= minDate.getTime()
})
const canNext = computed(() => {
  const next = addMonths(currentMonth.value, +1)
  return next.getTime() <= maxDate.getTime()
})

function prevMonth() {
  currentMonth.value = clampDate(addMonths(currentMonth.value, -1), minDate, maxDate)
}
function nextMonth() {
  currentMonth.value = clampDate(addMonths(currentMonth.value, +1), minDate, maxDate)
}

// ---------- lifecycle ----------
onMounted(() => {
  loadTasks()
  window.addEventListener('tasks-updated', onTasksUpdated)
})
onBeforeUnmount(() => {
  window.removeEventListener('tasks-updated', onTasksUpdated)
})
</script>

<template>
  <div class="calendar-card">
    <div class="calendar-header">
      <div class="calendar-title">📅 Kalender</div>

      <div class="calendar-nav">
        <button class="btn-soft" :disabled="!canPrev" @click="prevMonth">‹</button>
        <div class="month-label">{{ monthLabel }}</div>
        <button class="btn-soft" :disabled="!canNext" @click="nextMonth">›</button>
      </div>
    </div>

    <div v-if="error" class="error-banner">
      {{ error }}
    </div>

    <div class="dow">
      <div v-for="d in daysOfWeek" :key="d" class="dow-cell">{{ d }}</div>
    </div>

    <div class="grid">
      <div
        v-for="c in calendarCells"
        :key="c.iso"
        class="cell"
        :class="{ 'cell--muted': !c.inMonth, 'cell--today': c.iso === toISODate(new Date()) }"
      >
        <div class="cell-top">
          <span class="day-num">{{ c.date.getDate() }}</span>
        </div>

        <div class="cell-items">
          <div
            v-for="t in c.items.slice(0, 3)"
            :key="t.id"
            class="task-pill"
            :title="t.taskName"
            :style="{ borderLeftColor: t.color || '#6c757d', opacity: t.done ? 0.55 : 1 }"
          >
            <span class="task-dot" :style="{ background: t.color || '#6c757d' }"></span>
            <span class="task-text">{{ t.taskName }}</span>
          </div>

          <div v-if="c.items.length > 3" class="more">
            +{{ c.items.length - 3 }} mehr
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading-hint">Lade…</div>
    <div class="hint">Zeigt Tasks mit Datum. Navigation: ±2 Jahre (insgesamt 4 Jahre).</div>
  </div>
</template>

<style scoped>
.calendar-card {
  border-radius: 18px;
  background: rgba(45, 50, 56, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.10);
  box-shadow: 0 10px 30px rgba(0,0,0,0.25);
  padding: 18px;
  color: var(--color-text, #e8eef6);
  backdrop-filter: blur(10px);
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.calendar-title {
  font-size: 1.1rem;
  font-weight: 700;
}

.calendar-nav {
  display: flex;
  align-items: center;
  gap: 10px;
}

.month-label {
  font-weight: 650;
  opacity: 0.95;
  min-width: 150px;
  text-align: center;
}

.btn-soft {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(0,0,0,0.25);
  color: var(--color-text, #e8eef6);
  cursor: pointer;
}
.btn-soft:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.error-banner {
  border-radius: 14px;
  padding: 10px 12px;
  background: rgba(220, 53, 69, 0.18);
  border: 1px solid rgba(220, 53, 69, 0.35);
  color: #ffb6be;
  margin: 10px 0 12px;
  text-align: center;
}

.dow {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  margin-bottom: 8px;
}
.dow-cell {
  text-align: center;
  font-weight: 650;
  opacity: 0.8;
  font-size: 0.9rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

.cell {
  min-height: 94px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(0,0,0,0.18);
  padding: 8px;
  overflow: hidden;
}

.cell--muted {
  opacity: 0.35;
}

.cell--today {
  outline: 2px solid rgba(13, 110, 253, 0.55);
}

.cell-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.day-num {
  font-weight: 750;
  opacity: 0.9;
}

.cell-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.task-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 10px;
  background: rgba(255,255,255,0.06);
  border-left: 4px solid #6c757d;
}

.task-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  flex: 0 0 auto;
}

.task-text {
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.more {
  font-size: 0.8rem;
  opacity: 0.75;
  margin-top: 2px;
}

.loading-hint {
  margin-top: 10px;
  text-align: center;
  opacity: 0.8;
}

.hint {
  margin-top: 10px;
  text-align: center;
  opacity: 0.65;
  font-size: 0.85rem;
}
</style>
