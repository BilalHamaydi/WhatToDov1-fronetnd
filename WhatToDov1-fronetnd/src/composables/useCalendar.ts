import { computed, ref } from 'vue'
import type { ISODate } from '../types/task'

export const MONTHS_DE = [
  'Januar','Februar','März','April','Mai','Juni',
  'Juli','August','September','Oktober','November','Dezember'
]

export function toISO(d: Date): ISODate {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function formatBadgeDate(iso: ISODate): string {
  const d = fromISO(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

export function useCalendar() {
  const selectedDate = ref<ISODate | ''>('')
  const currentMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))

  const yearOptions = computed(() => {
    const y = new Date().getFullYear()
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

  const calendarDays = computed(() => {
    const base = currentMonth.value
    const year = base.getFullYear()
    const month = base.getMonth()

    const first = new Date(year, month, 1)
    const firstDay = first.getDay()
    const shift = (firstDay + 6) % 7

    const start = new Date(year, month, 1 - shift)
    const days: Array<{ date: Date; iso: ISODate; inMonth: boolean }> = []

    for (let i = 0; i < 42; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      days.push({ date: d, iso: toISO(d), inMonth: d.getMonth() === month })
    }
    return days
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

  return {
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
  }
}
