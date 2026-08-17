import { useMemo, useState } from 'react'
import type { Exercise, ProgramExercise, WorkoutDay } from '../types'

interface Props {
  day: WorkoutDay
  dayNumber: number
  exercises: Exercise[]
  onBack: () => void
  onStart: () => void
  onOpenExercise: (exerciseId: string) => void
  onUpdate: (exercises: ProgramExercise[]) => void
  onReset: () => void
}

function groupOf(exercise?: Exercise) {
  const value = exercise?.muscle.toLowerCase() ?? ''
  if (value.includes('pecho')) return 'Pecho'
  if (value.includes('espalda') || value.includes('dorsal')) return 'Espalda'
  if (value.includes('hombro')) return 'Hombro'
  if (value.includes('bíceps') || value.includes('tríceps') || value.includes('antebrazo')) return 'Brazos'
  if (value.includes('pierna') || value.includes('cuádr') || value.includes('isquio') || value.includes('femoral') || value.includes('glúte') || value.includes('gemelo') || value.includes('aductor') || value.includes('tibial')) return 'Pierna'
  if (value.includes('core')) return 'Core'
  if (value.includes('movilidad')) return 'Movilidad'
  if (value.includes('cardio')) return 'Cardio'
  return exercise?.muscle ?? 'General'
}

export function RoutineDayDetail({ day, dayNumber, exercises, onBack, onStart, onOpenExercise, onUpdate, onReset }: Props) {
  const [editing, setEditing] = useState(false)
  const [addingId, setAddingId] = useState('')
  const exerciseById = useMemo(() => Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise])), [exercises])
  const existing = new Set(day.exercises.map((item) => item.exerciseId))

  const move = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= day.exercises.length) return
    const next = [...day.exercises]
    ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
    onUpdate(next)
  }

  const remove = (index: number) => onUpdate(day.exercises.filter((_, itemIndex) => itemIndex !== index))

  const replace = (index: number, exerciseId: string) => {
    if (!exerciseId || existing.has(exerciseId)) return
    const next = [...day.exercises]
    next[index] = { ...next[index], exerciseId }
    onUpdate(next)
  }

  const add = () => {
    if (!addingId || existing.has(addingId)) return
    const target = exerciseById[addingId]
    onUpdate([...day.exercises, {
      exerciseId: addingId,
      sets: target?.category === 'cardio' ? 1 : target?.isCompound ? 3 : 2,
      reps: target?.category === 'cardio' ? '10–15 min' : target?.category === 'mobility' || target?.category === 'breathing' ? '6–10 suaves' : '10–12',
      restSeconds: target?.category === 'cardio' ? 30 : target?.isCompound ? 90 : 60,
      rir: target?.category === 'cardio' ? 'Moderado' : '2–3',
      note: 'Añadido desde la edición del día.',
    }])
    setAddingId('')
  }

  return (
    <section className="routine-detail-screen">
      <div className="training-head routine-detail-head">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Volver a mi rutina">←</button>
        <div><small>Día {dayNumber}</small><h1>{day.title.replace(/^Día \d+ · /, '')}</h1><p>{day.focus}</p></div>
        <button type="button" className={editing ? 'icon-btn active' : 'icon-btn'} onClick={() => setEditing((value) => !value)} aria-pressed={editing} aria-label="Editar día">✎</button>
      </div>

      <div className="routine-detail-summary">
        <span><b>{day.exercises.length}</b><small>ejercicios</small></span>
        <span><b>≈ {day.estimatedMinutes}</b><small>minutos</small></span>
        <span><b>{editing ? 'Edición' : 'Vista previa'}</b><small>modo</small></span>
      </div>

      <div className="routine-exercise-detail-list">
        {day.exercises.map((item, index) => {
          const exercise = exerciseById[item.exerciseId]
          const alternatives = exercises.filter((candidate) => !existing.has(candidate.id) && groupOf(candidate) === groupOf(exercise)).slice(0, 30)
          return (
            <article className="routine-exercise-card" key={`${day.id}-${item.exerciseId}-${index}`}>
              <button type="button" className="routine-exercise-main" onClick={() => onOpenExercise(item.exerciseId)}>
                <span className="routine-position">{index + 1}</span>
                <span><strong>{exercise?.name ?? item.exerciseId}</strong><small>{exercise?.muscle} · {exercise?.equipment}</small></span>
                <b>›</b>
              </button>
              <div className="routine-prescription">
                <span><small>Series</small><b>{item.sets}</b></span>
                <span><small>Reps</small><b>{item.reps}</b></span>
                <span><small>Descanso</small><b>{item.restSeconds}s</b></span>
                <span><small>RIR</small><b>{item.rir}</b></span>
              </div>
              {item.note && <p className="routine-note">ⓘ {item.note}</p>}
              {editing && <div className="routine-edit-row">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Subir ejercicio">↑</button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === day.exercises.length - 1} aria-label="Bajar ejercicio">↓</button>
                <select aria-label={`Cambiar ${exercise?.name}`} value="" onChange={(event) => replace(index, event.target.value)}>
                  <option value="">Cambiar por…</option>
                  {alternatives.map((candidate) => <option value={candidate.id} key={candidate.id}>{candidate.name}</option>)}
                </select>
                <button type="button" className="danger-small" onClick={() => remove(index)} disabled={day.exercises.length <= 2}>Quitar</button>
              </div>}
            </article>
          )
        })}
      </div>

      {editing && <div className="routine-add-row">
        <select value={addingId} onChange={(event) => setAddingId(event.target.value)} aria-label="Ejercicio para añadir">
          <option value="">Añadir otro ejercicio…</option>
          {exercises.filter((exercise) => !existing.has(exercise.id)).map((exercise) => <option value={exercise.id} key={exercise.id}>{exercise.name} · {exercise.muscle}</option>)}
        </select>
        <button type="button" onClick={add} disabled={!addingId}>Añadir</button>
        <button type="button" className="secondary-button" onClick={onReset}>Restaurar día</button>
      </div>}

      <div className="routine-detail-actions">
        <button type="button" className="secondary-button" onClick={() => setEditing((value) => !value)}>{editing ? 'Terminar edición' : 'Editar día'}</button>
        <button type="button" onClick={onStart}>▶ Empezar entrenamiento</button>
      </div>
    </section>
  )
}
