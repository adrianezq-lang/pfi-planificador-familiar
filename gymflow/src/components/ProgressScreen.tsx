import { useMemo, useState } from 'react'
import type { Exercise, Unit, WorkoutLog } from '../types'
import { getBestByExercise, getStreak } from '../utils/stats'

interface Props {
  logs: WorkoutLog[]
  exercises: Exercise[]
  unit: Unit
  weeklyTarget: number
}

function startOfWeek() {
  const date = new Date()
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  date.setHours(0, 0, 0, 0)
  return date
}

function formatMinutes(seconds: number) {
  const total = Math.max(0, Math.round(seconds / 60))
  if (total < 60) return `${total} min`
  return `${Math.floor(total / 60)} h ${total % 60} min`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(value)
}

function groupOf(muscle: string) {
  const value = muscle.toLowerCase()
  if (value.includes('pecho')) return 'Pecho'
  if (value.includes('espalda') || value.includes('dorsal')) return 'Espalda'
  if (value.includes('hombro')) return 'Hombros'
  if (value.includes('bíceps') || value.includes('tríceps') || value.includes('antebrazo')) return 'Brazos'
  if (value.includes('pierna') || value.includes('cuádr') || value.includes('femoral') || value.includes('isquio') || value.includes('glúte') || value.includes('gemelo') || value.includes('aductor') || value.includes('tibial')) return 'Pierna'
  if (value.includes('core')) return 'Core'
  return 'Otros'
}

export function ProgressScreen({ logs, exercises, unit, weeklyTarget }: Props) {
  const [showVolumeInfo, setShowVolumeInfo] = useState(false)
  const [selectedExerciseId, setSelectedExerciseId] = useState('')
  const weeklyLogs = useMemo(() => logs.filter((log) => new Date(log.date) >= startOfWeek()), [logs])
  const weeklySeconds = weeklyLogs.reduce((sum, log) => sum + log.durationSeconds, 0)
  const weeklyVolume = weeklyLogs.reduce((sum, log) => sum + log.volume, 0)
  const completedExercises = weeklyLogs.reduce((sum, log) => sum + log.exercises.length, 0)
  const compliance = Math.min(100, Math.round((weeklyLogs.length / Math.max(1, weeklyTarget)) * 100))
  const best = getBestByExercise(logs)
  const loggedExerciseIds = Array.from(new Set(logs.flatMap((log) => log.exercises.map((item) => item.exerciseId))))
  const selectedId = selectedExerciseId || loggedExerciseIds[0] || ''
  const selectedExercise = exercises.find((exercise) => exercise.id === selectedId)
  const selectedLogs = logs.flatMap((log) => log.exercises.filter((item) => item.exerciseId === selectedId).map((item) => ({ ...item, date: log.date })))
  const last = selectedLogs.at(-1)
  const lastBestSet = last?.sets.filter((set) => set.completed).sort((a, b) => b.weight - a.weight)[0]
  const recent = logs.slice(-6)
  const maxVolume = Math.max(1, ...recent.map((log) => log.volume))
  const weeklyVolumeByGroup = Object.entries(weeklyLogs.reduce<Record<string, number>>((groups, log) => {
    log.exercises.forEach((loggedExercise) => {
      const exercise = exercises.find((item) => item.id === loggedExercise.exerciseId)
      const group = groupOf(exercise?.muscle ?? 'Otros')
      const volume = loggedExercise.sets.reduce((sum, set) => sum + (set.completed ? set.weight * set.reps : 0), 0)
      groups[group] = (groups[group] ?? 0) + volume
    })
    return groups
  }, {})).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1])
  const maxGroupVolume = Math.max(1, ...weeklyVolumeByGroup.map(([, value]) => value))

  return <section className="progress-v18">
    <div className="page-title"><div><p className="eyebrow">TU EVOLUCIÓN</p><h1>Progreso</h1><p>Datos reales de tus entrenamientos completados</p></div></div>

    <div className="progress-summary-grid">
      <article><span>Sesiones esta semana</span><b>{weeklyLogs.length} de {weeklyTarget}</b><small>{compliance}% del plan</small></article>
      <article><span>Tiempo entrenado</span><b>{formatMinutes(weeklySeconds)}</b><small>Esta semana</small></article>
      <article><span>Ejercicios completados</span><b>{completedExercises}</b><small>Series registradas</small></article>
      <article><span>Racha</span><b>{getStreak(logs)} días</b><small>Días consecutivos</small></article>
    </div>

    <article className="compliance-card">
      <div><h3>Cumplimiento semanal</h3><b>{compliance}%</b></div>
      <div className="compliance-track"><i style={{ width: `${compliance}%` }} /></div>
      <p>{weeklyLogs.length >= weeklyTarget ? 'Has alcanzado el objetivo semanal.' : `Te faltan ${Math.max(0, weeklyTarget - weeklyLogs.length)} sesiones para completar el plan.`}</p>
    </article>

    <article className="volume-explainer-card">
      <div className="section-title"><div><h3>Volumen semanal</h3><p>Total de kilos movidos en series completadas</p></div><b>{formatNumber(weeklyVolume)} {unit}</b></div>
      <button type="button" className="text-help-button" onClick={() => setShowVolumeInfo((value) => !value)}>{showVolumeInfo ? 'Ocultar explicación' : '¿Qué significa?'}</button>
      {showVolumeInfo && <div className="volume-help"><strong>Volumen = peso × repeticiones de cada serie.</strong><p>Ejemplo: 60 {unit} × 10 repeticiones × 3 series = 1.800 {unit}. Los ejercicios sin peso externo, la movilidad y el cardio no se suman como kilos.</p></div>}
      {!logs.length && <p className="empty-copy">Aún no hay volumen registrado. Aparecerá después de finalizar tu primer entrenamiento con pesos y repeticiones.</p>}
    </article>

    <article className="volume-groups-card">
      <div className="section-title"><div><h3>Volumen por grupo muscular</h3><p>Solo series con carga y repeticiones registradas</p></div></div>
      {weeklyVolumeByGroup.length ? <div className="volume-group-list">{weeklyVolumeByGroup.map(([group, value]) => <div key={group}><span><b>{group}</b><strong>{formatNumber(value)} {unit}</strong></span><div><i style={{ width: `${Math.round((value / maxGroupVolume) * 100)}%` }} /></div></div>)}</div> : <p className="empty-copy">No hay volumen con carga registrado esta semana.</p>}
    </article>

    <article className="chart-card progress-chart-card">
      <div className="section-title"><div><h3>Últimas sesiones</h3><p>Volumen registrado por entrenamiento</p></div></div>
      {recent.length ? <div className="bars large actual-bars">{recent.map((log, index) => <div key={log.id}><i style={{ height: `${Math.max(8, Math.round((log.volume / maxVolume) * 150))}px` }} /><b>{formatNumber(log.volume)}</b><small>S{Math.max(1, logs.length - recent.length + index + 1)}</small></div>)}</div> : <div className="empty-chart">Completa una sesión para ver la evolución.</div>}
    </article>

    <article className="exercise-progress-card">
      <div className="section-title"><div><h3>Evolución por ejercicio</h3><p>Compara tu última sesión con tu mejor peso</p></div></div>
      <select value={selectedId} onChange={(event) => setSelectedExerciseId(event.target.value)} disabled={!loggedExerciseIds.length}>
        {!loggedExerciseIds.length && <option value="">Sin ejercicios registrados</option>}
        {loggedExerciseIds.map((id) => <option value={id} key={id}>{exercises.find((exercise) => exercise.id === id)?.name ?? id}</option>)}
      </select>
      {selectedExercise ? <div className="exercise-progress-metrics">
        <span><small>Ejercicio</small><b>{selectedExercise.name}</b></span>
        <span><small>Última mejor serie</small><b>{lastBestSet ? `${lastBestSet.weight} ${unit} × ${lastBestSet.reps}` : '—'}</b></span>
        <span><small>Mejor peso registrado</small><b>{best[selectedId] ? `${best[selectedId]} ${unit}` : '—'}</b></span>
        <span><small>Sesiones registradas</small><b>{selectedLogs.length}</b></span>
      </div> : <p className="empty-copy">Cuando completes entrenamientos podrás elegir un ejercicio y revisar su evolución.</p>}
    </article>

    <article className="history-card">
      <h3>Historial</h3>
      {logs.length ? <div>{[...logs].reverse().slice(0, 8).map((log) => <article key={log.id}><span><b>{new Date(log.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</b><small>{log.exercises.length} ejercicios · {formatMinutes(log.durationSeconds)}</small></span><strong>{formatNumber(log.volume)} {unit}</strong></article>)}</div> : <p className="empty-copy">Todavía no has terminado ninguna sesión.</p>}
    </article>
  </section>
}
