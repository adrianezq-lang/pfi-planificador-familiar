import type { TrainingProgram, WorkoutLog } from '../types'

export function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function getStreak(logs: WorkoutLog[]) {
  if (!logs.length) return 0
  const uniqueDays = [...new Set(logs.map((log) => log.date.slice(0, 10)))].sort().reverse()
  let streak = 0
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)

  const todayKey = cursor.toISOString().slice(0, 10)
  const yesterday = new Date(cursor)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = yesterday.toISOString().slice(0, 10)

  if (uniqueDays[0] !== todayKey && uniqueDays[0] !== yesterdayKey) return 0

  for (const day of uniqueDays) {
    const expected = cursor.toISOString().slice(0, 10)
    if (day === expected) {
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
      continue
    }
    const previousExpected = new Date(cursor)
    previousExpected.setDate(previousExpected.getDate() - 1)
    if (day === previousExpected.toISOString().slice(0, 10) && streak === 0) {
      streak += 1
      cursor.setDate(cursor.getDate() - 2)
      continue
    }
    break
  }
  return streak
}

export function getTodayProgramDay(program: TrainingProgram, logs: WorkoutLog[]) {
  const programLogs = logs.filter((log) => log.programId === program.id)
  return program.days[programLogs.length % program.days.length]
}

export function getWeeklyCount(logs: WorkoutLog[]) {
  const start = new Date()
  const day = start.getDay() || 7
  start.setDate(start.getDate() - day + 1)
  start.setHours(0, 0, 0, 0)
  return logs.filter((log) => new Date(log.date) >= start).length
}

export function getBestByExercise(logs: WorkoutLog[]) {
  const best: Record<string, number> = {}
  logs.forEach((log) => {
    log.exercises.forEach((exercise) => {
      exercise.sets.forEach((set) => {
        if (!set.completed) return
        best[exercise.exerciseId] = Math.max(best[exercise.exerciseId] ?? 0, set.weight)
      })
    })
  })
  return best
}
