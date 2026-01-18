<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Task } from '../types/tasks'

import {
  fetchTasks,
  createTask,
  deleteTask as apiDeleteTask,
  patchDone,
} from '../services/taskService'

import {
  fetchCategories,
  createCategory as apiCreateCategory,
  deleteCategory as apiDeleteCategory,
} from '../services/categoryService'

import { useCalendar } from '../composables/useCalendar'

// ---------- UI constants ----------
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

// Suche
const searchQuery = ref('')

const creatingCategory = ref(false)

// ---------- Calendar (Composable) ----------
const {
  MONTHS_DE,
  selectedDate,
  currentMonth,
  yearOptions,
  selectedYear,
  selectedMonthIndex,
  calendarDays,
  prevMonth,
  nextMonth,
  selectDay,
  clearDateFilter,
  formatBadgeDate,
} = useCalendar()

// ---------- Computed ----------
const tasksByDate = computed(() => {
  const map = new Map<string, Task[]>()
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

// ---------- API actions ----------
async function loadTasks() {
  loading.value = true
  error.value = ''
  try {
    tasks.value = await fetchTasks()
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to fetch tasks'
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  error.value = ''
  try {
    categories.value = await fetchCategories()
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to fetch categories'
  }
}

async function refreshAll() {
  await Promise.all([loadTasks(), loadCategories()])
}

async function createCategory() {
  const name = window.prompt('Neue Kategorie erstellen (Name):') ?? ''
  const cleaned = name.trim()
  if (!cleaned) return

  creatingCategory.value = true
  error.value = ''
  try {
    await apiCreateCategory(cleaned)
    categories.value = await fetchCategories()
    newTaskCategory.value = cleaned
  } catch (e: any) {
    error.value = e?.message ?? 'Create category failed'
  } finally {
    creatingCategory.value = false
  }
}

async function deleteCategory(name: string) {
  const cleaned = name.trim()
  if (!cleaned) return
  if (!window.confirm(`Kategorie "${cleaned}" wirklich löschen?`)) return

  error.value = ''
  try {
    await apiDeleteCategory(cleaned)
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
    const created = await createTask({
      taskName: name,
      important: false,
      done: false,
      category: newTaskCategory.value || '',
      color: newTaskColor.value,
      date: newTaskDate.value || null,
    })

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
    await apiDeleteTask(id)
    tasks.value = tasks.value.filter(t => t.id !== id)
  } catch (e: any) {
    error.value = e?.message ?? 'Delete failed'
  }
}

async function toggleDone(task: Task) {
  const prev = task.done
  error.value = ''
  try {
    await patchDone(task.id, task.done)
  } catch (e: any) {
    task.done = prev
    error.value = e?.message ?? 'Update failed'
  }
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
                  {{ t.taskName }}

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

