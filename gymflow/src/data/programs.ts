import { exerciseMap, exercises } from './exercises'
import type { ExerciseCategory, Goal, Level, ProgramExercise, TrainingProgram, Trimester, WorkoutDay } from '../types'

type FocusKey = 'fullA' | 'fullB' | 'push' | 'pull' | 'legsA' | 'legsB' | 'upper' | 'lower' | 'mobility' | 'recovery'
interface DayBlueprint { key: FocusKey; title: string; focus: string }

const normalSplits: Record<number, DayBlueprint[]> = {
  2: [
    { key: 'fullA', title: 'Día 1 · Full Body A', focus: 'Pierna, empuje, tirón y core' },
    { key: 'fullB', title: 'Día 2 · Full Body B', focus: 'Cadera, espalda, hombro y estabilidad' },
  ],
  3: [
    { key: 'fullA', title: 'Día 1 · Full Body A', focus: 'Fuerza completa' },
    { key: 'upper', title: 'Día 2 · Tren superior', focus: 'Pecho, espalda, hombros y brazos' },
    { key: 'lower', title: 'Día 3 · Tren inferior', focus: 'Cuádriceps, glúteos y cadena posterior' },
  ],
  4: [
    { key: 'upper', title: 'Día 1 · Torso A', focus: 'Empuje y tirón horizontal' },
    { key: 'legsA', title: 'Día 2 · Pierna A', focus: 'Cuádriceps y glúteo' },
    { key: 'upper', title: 'Día 3 · Torso B', focus: 'Espalda, hombros y brazos' },
    { key: 'legsB', title: 'Día 4 · Pierna B', focus: 'Cadena posterior y estabilidad' },
  ],
  5: [
    { key: 'push', title: 'Día 1 · Push', focus: 'Pecho, hombro y tríceps' },
    { key: 'pull', title: 'Día 2 · Pull', focus: 'Espalda, deltoides posterior y bíceps' },
    { key: 'legsA', title: 'Día 3 · Pierna A', focus: 'Cuádriceps y glúteo' },
    { key: 'upper', title: 'Día 4 · Torso', focus: 'Fuerza y volumen del tren superior' },
    { key: 'legsB', title: 'Día 5 · Pierna B', focus: 'Femoral, glúteo y core' },
  ],
  6: [
    { key: 'push', title: 'Día 1 · Push A', focus: 'Pecho y tríceps' },
    { key: 'pull', title: 'Día 2 · Pull A', focus: 'Espalda y bíceps' },
    { key: 'legsA', title: 'Día 3 · Pierna A', focus: 'Cuádriceps y glúteo' },
    { key: 'push', title: 'Día 4 · Push B', focus: 'Hombro y pecho' },
    { key: 'pull', title: 'Día 5 · Pull B', focus: 'Espalda y deltoides posterior' },
    { key: 'legsB', title: 'Día 6 · Pierna B', focus: 'Cadena posterior y core' },
  ],
}

const pregnancySplits: Record<number, DayBlueprint[]> = {
  2: [
    { key: 'fullA', title: 'Día 1 · Full Body A', focus: 'Pierna, postura y respiración' },
    { key: 'fullB', title: 'Día 2 · Full Body B', focus: 'Cadera, torso y estabilidad' },
  ],
  3: [
    { key: 'legsA', title: 'Día 1 · Pierna y glúteos', focus: 'Fuerza y equilibrio' },
    { key: 'upper', title: 'Día 2 · Torso y postura', focus: 'Espalda, hombros y brazos' },
    { key: 'fullB', title: 'Día 3 · Full Body', focus: 'Fuerza, movilidad y cardio moderado' },
  ],
  4: [
    { key: 'legsA', title: 'Día 1 · Pierna A', focus: 'Cuádriceps y estabilidad' },
    { key: 'upper', title: 'Día 2 · Torso', focus: 'Postura y tren superior' },
    { key: 'legsB', title: 'Día 3 · Pierna B', focus: 'Glúteo y cadena posterior' },
    { key: 'mobility', title: 'Día 4 · Movilidad y core', focus: 'Respiración, movilidad y control' },
  ],
  5: [
    { key: 'legsA', title: 'Día 1 · Pierna A', focus: 'Cuádriceps y estabilidad' },
    { key: 'upper', title: 'Día 2 · Torso A', focus: 'Espalda, pecho y brazos' },
    { key: 'legsB', title: 'Día 3 · Pierna B', focus: 'Glúteo y cadena posterior' },
    { key: 'upper', title: 'Día 4 · Torso B', focus: 'Postura y hombros' },
    { key: 'recovery', title: 'Día 5 · Recuperación activa', focus: 'Cardio suave, movilidad y respiración' },
  ],
  6: [
    { key: 'legsA', title: 'Día 1 · Pierna A', focus: 'Cuádriceps y estabilidad' },
    { key: 'upper', title: 'Día 2 · Torso A', focus: 'Espalda y empuje adaptado' },
    { key: 'mobility', title: 'Día 3 · Movilidad', focus: 'Cadera, columna torácica y respiración' },
    { key: 'legsB', title: 'Día 4 · Pierna B', focus: 'Glúteo y cadena posterior' },
    { key: 'upper', title: 'Día 5 · Torso B', focus: 'Hombros, brazos y postura' },
    { key: 'recovery', title: 'Día 6 · Recuperación activa', focus: 'Cardio moderado y control corporal' },
  ],
}

const pools: Record<FocusKey, string[]> = {
  fullA: [
    'goblet-squat', 'landmine-squat', 'belt-squat', 'box-squat', 'leg-press', 'machine-chest-press', 'standing-cable-press',
    'dumbbell-bench-press', 'incline-pushup', 'lat-pulldown', 'neutral-grip-pulldown', 'seated-row', 'machine-row', 'one-arm-cable-row',
    'romanian-deadlift-db', 'cable-pull-through', 'hip-thrust', 'supported-step-down', 'lateral-raise', 'face-pull', 'pallof-press',
    'bird-dog', 'farmer-carry', 'marching-carry', 'treadmill-walk', 'stationary-bike',
  ],
  fullB: [
    'leg-press', 'supported-split-squat', 'low-step-up', 'cable-pull-through', 'seated-leg-curl', 'hip-abduction-machine',
    'standing-cable-press', 'wall-pushup', 'machine-chest-press', 'seated-row', 'neutral-grip-pulldown', 'straight-arm-pulldown',
    'landmine-press', 'seated-machine-shoulder-press', 'band-pull-apart', 'rope-hammer-curl', 'triceps-pushdown', 'suitcase-carry',
    'glute-medius-wall-press', 'standing-pelvic-tilt', 'prenatal-march', 'elliptical-easy',
  ],
  push: [
    'bench-press', 'dumbbell-bench-press', 'incline-db-press', 'incline-barbell-press', 'machine-chest-press', 'standing-cable-press',
    'landmine-press', 'db-shoulder-press', 'overhead-press', 'arnold-press', 'seated-machine-shoulder-press', 'lateral-raise',
    'cable-lateral-raise', 'pec-deck', 'cable-fly', 'low-high-cable-fly', 'triceps-pushdown', 'overhead-triceps',
    'cable-overhead-extension', 'triceps-kickback-cable', 'pushup', 'assisted-dip', 'pallof-press',
  ],
  pull: [
    'pullup', 'assisted-pullup', 'lat-pulldown', 'neutral-grip-pulldown', 'straight-arm-pulldown', 'barbell-row', 't-bar-row',
    'seated-row', 'machine-row', 'chest-supported-row', 'one-arm-row', 'one-arm-cable-row', 'inverted-row', 'cable-pullover',
    'face-pull', 'rear-delt-fly', 'reverse-cable-fly', 'band-pull-apart', 'biceps-curl', 'hammer-curl', 'preacher-curl',
    'incline-db-curl', 'rope-hammer-curl', 'cable-biceps-curl', 'suitcase-carry',
  ],
  legsA: [
    'back-squat', 'front-squat', 'smith-squat', 'hack-squat', 'pendulum-squat', 'belt-squat', 'goblet-squat', 'landmine-squat',
    'leg-press', 'split-squat', 'bulgarian-split-squat', 'supported-split-squat', 'walking-lunge', 'reverse-lunge-supported',
    'low-step-up', 'supported-step-down', 'leg-extension', 'hip-adduction-machine', 'hip-abduction-machine', 'calf-raise',
    'seated-calf-raise', 'tibialis-raise', 'pallof-press', 'ankle-mobility',
  ],
  legsB: [
    'romanian-deadlift', 'romanian-deadlift-db', 'good-morning', 'hip-thrust', 'cable-pull-through', 'back-extension', 'reverse-hyper',
    'leg-curl', 'seated-leg-curl', 'lying-leg-curl', 'assisted-nordic-curl', 'cable-kickback', 'glute-bridge', 'band-lateral-walk',
    'standing-hip-abduction', 'hip-abduction-machine', 'donkey-calf-raise', 'seated-calf-raise', 'bird-dog', 'side-plank',
    'glute-medius-wall-press', 'hip-flexor-stretch', 'adductor-rockback',
  ],
  upper: [
    'bench-press', 'dumbbell-bench-press', 'machine-chest-press', 'standing-cable-press', 'incline-pushup', 'landmine-press',
    'lat-pulldown', 'neutral-grip-pulldown', 'seated-row', 'machine-row', 'one-arm-cable-row', 'chest-supported-row',
    'db-shoulder-press', 'seated-machine-shoulder-press', 'lateral-raise', 'face-pull', 'reverse-cable-fly', 'band-pull-apart',
    'biceps-curl', 'rope-hammer-curl', 'preacher-curl', 'triceps-pushdown', 'triceps-kickback-cable', 'pallof-press',
  ],
  lower: [
    'goblet-squat', 'landmine-squat', 'leg-press', 'hack-squat', 'belt-squat', 'supported-split-squat', 'low-step-up',
    'romanian-deadlift-db', 'cable-pull-through', 'hip-thrust', 'seated-leg-curl', 'leg-extension', 'hip-abduction-machine',
    'band-lateral-walk', 'seated-calf-raise', 'tibialis-raise', 'pallof-press', 'bird-dog',
  ],
  mobility: [
    'cat-cow', 'quadruped-rockback', 'thoracic-rotation', 'seated-thoracic-extension', 'wall-angel', 'adductor-rockback',
    'ankle-mobility', 'hip-flexor-stretch', 'standing-pelvic-tilt', 'pallof-press', 'bird-dog', 'glute-medius-wall-press',
    'diaphragmatic-breathing', 'pelvic-floor-breathing', 'prenatal-march',
  ],
  recovery: [
    'treadmill-walk', 'stationary-bike', 'elliptical-easy', 'swimming-easy', 'prenatal-march', 'cat-cow', 'quadruped-rockback',
    'thoracic-rotation', 'seated-thoracic-extension', 'wall-angel', 'standing-pelvic-tilt', 'diaphragmatic-breathing',
    'pelvic-floor-breathing', 'ankle-mobility', 'hip-flexor-stretch',
  ],
}

const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const exerciseCountByMinutes: Record<number, number> = { 30: 4, 45: 5, 60: 6, 75: 7, 90: 8 }

function rotate<T>(items: T[], amount: number) {
  if (!items.length) return items
  const offset = ((amount % items.length) + items.length) % items.length
  return [...items.slice(offset), ...items.slice(0, offset)]
}

function levelAllowed(level: Level, exerciseLevel: (typeof exercises)[number]['level']) {
  if (level === 'pregnancy') return true
  if (exerciseLevel === 'all') return true
  if (level === 'advanced') return true
  if (level === 'intermediate') return exerciseLevel !== 'advanced'
  return exerciseLevel === 'beginner'
}

function prescription(level: Level, goal: Goal, exerciseId: string, pregnancy: boolean): Omit<ProgramExercise, 'exerciseId'> {
  const exercise = exerciseMap[exerciseId]
  const category = exercise?.category ?? 'strength'
  if (pregnancy) {
    if (category === 'cardio') return { sets: 1, reps: '10–20 min', restSeconds: 45, rir: 'Test del habla', note: exercise?.pregnancy?.note }
    if (category === 'mobility' || category === 'breathing') return { sets: 2, reps: '6–10 suaves', restSeconds: 30, rir: 'Muy cómodo', note: exercise?.pregnancy?.note }
    if (category === 'core') return { sets: 2, reps: '8–10/lado', restSeconds: 45, rir: '3–4', note: exercise?.pregnancy?.note }
    return { sets: exercise?.isCompound ? 3 : 2, reps: exercise?.isCompound ? '8–12' : '12–15', restSeconds: exercise?.isCompound ? 90 : 60, rir: '3–4', note: exercise?.pregnancy?.note }
  }
  if (category === 'cardio') return { sets: 1, reps: goal === 'fatloss' ? '15–25 min' : '8–15 min', restSeconds: 45, rir: 'Moderado' }
  if (category === 'mobility' || category === 'breathing') return { sets: 2, reps: '6–10 suaves', restSeconds: 30, rir: 'Técnica' }
  if (category === 'core') return { sets: level === 'beginner' ? 2 : 3, reps: '8–12/lado', restSeconds: 45, rir: 'Técnica' }
  const compound = exercise?.isCompound ?? true
  if (goal === 'strength' && compound) return { sets: level === 'beginner' ? 3 : level === 'intermediate' ? 4 : 5, reps: level === 'beginner' ? '6–8' : '4–6', restSeconds: level === 'advanced' ? 180 : 150, rir: '2–3' }
  if (goal === 'hypertrophy') return { sets: compound ? (level === 'beginner' ? 3 : 4) : 3, reps: compound ? '6–10' : '10–15', restSeconds: compound ? 120 : 60, rir: '1–2' }
  if (goal === 'fatloss') return { sets: compound ? 3 : 2, reps: compound ? '8–12' : '12–15', restSeconds: compound ? 75 : 45, rir: '2–3' }
  return { sets: compound ? (level === 'advanced' ? 4 : 3) : 2, reps: compound ? '8–12' : '12–15', restSeconds: compound ? 90 : 60, rir: '2–3' }
}

function preferredCategories(key: FocusKey, count: number, pregnancy: boolean): ExerciseCategory[] {
  if (!pregnancy) {
    if (key === 'mobility') return Array.from({ length: count }, (_, index) => index < count - 1 ? 'mobility' : 'core')
    if (key === 'recovery') return Array.from({ length: count }, (_, index) => index < 2 ? 'cardio' : index < count - 1 ? 'mobility' : 'breathing')
    return Array.from({ length: count }, (_, index) => index === count - 1 && count >= 6 ? 'core' : 'strength')
  }
  if (key === 'mobility') return Array.from({ length: count }, (_, index) => index < Math.max(2, count - 3) ? 'mobility' : index === count - 1 ? 'breathing' : 'core')
  if (key === 'recovery') return Array.from({ length: count }, (_, index) => index === 0 ? 'cardio' : index >= count - 2 ? 'breathing' : 'mobility')
  const pattern: ExerciseCategory[] = ['strength', 'strength', 'strength', 'core', 'mobility', 'strength', 'cardio', 'breathing']
  return pattern.slice(0, count)
}

function chooseExercises(
  key: FocusKey,
  count: number,
  level: Level,
  trimester: Trimester,
  seed: number,
  usage: Map<string, number>,
): string[] {
  const pregnancy = level === 'pregnancy'
  const valid = pools[key].filter((id) => {
    const exercise = exerciseMap[id]
    if (!exercise || !levelAllowed(level, exercise.level)) return false
    if (!pregnancy) return true
    return Boolean(exercise.pregnancy?.trimesters.includes(trimester))
  })
  const rotated = rotate(valid, seed)
  const categories = preferredCategories(key, count, pregnancy)
  const chosen: string[] = []

  categories.forEach((wanted, index) => {
    const candidates = rotated
      .filter((id) => !chosen.includes(id))
      .filter((id) => (exerciseMap[id]?.category ?? 'strength') === wanted)
      .sort((a, b) => (usage.get(a) ?? 0) - (usage.get(b) ?? 0))
    const fallback = rotated
      .filter((id) => !chosen.includes(id))
      .sort((a, b) => (usage.get(a) ?? 0) - (usage.get(b) ?? 0))
    const pick = candidates[index % Math.max(1, candidates.length)] ?? fallback[0]
    if (pick) chosen.push(pick)
  })

  rotated.forEach((id) => {
    if (chosen.length < count && !chosen.includes(id)) chosen.push(id)
  })
  chosen.forEach((id) => usage.set(id, (usage.get(id) ?? 0) + 1))
  return chosen.slice(0, count)
}

export function createProgram(
  level: Level,
  sessions: number,
  minutes: number,
  trimester: Trimester = 2,
  goal: Goal = 'fitness',
  variant = 0,
): TrainingProgram {
  const count = Math.max(2, Math.min(6, sessions))
  const sessionMinutes = [30, 45, 60, 75, 90].includes(minutes) ? minutes : 60
  const exerciseCount = exerciseCountByMinutes[sessionMinutes] ?? 6
  const pregnancy = level === 'pregnancy'
  const blueprint = pregnancy ? pregnancySplits[count] : normalSplits[count]
  const usage = new Map<string, number>()
  const seedBase = variant * 17 + count * 7 + Math.floor(sessionMinutes / 15) * 5 + trimester * 3

  const days: WorkoutDay[] = blueprint.map((blueprintDay, dayIndex) => {
    const ids = chooseExercises(blueprintDay.key, exerciseCount, level, trimester, seedBase + dayIndex * 11, usage)
    const selected = ids.map((exerciseId) => ({ exerciseId, ...prescription(level, goal, exerciseId, pregnancy) }))
    return {
      id: `${level}-${count}-${sessionMinutes}-${trimester}-${variant}-${dayIndex + 1}`,
      title: blueprintDay.title,
      focus: blueprintDay.focus,
      estimatedMinutes: sessionMinutes,
      exercises: selected,
    }
  })

  return {
    id: `${level}-${count}-${sessionMinutes}-${trimester}-${goal}-${variant}`,
    level,
    name: pregnancy ? 'Rutina Embarazo' : level === 'beginner' ? 'Base' : level === 'intermediate' ? 'Intermedio' : 'Performance',
    subtitle: `${count} sesiones por semana · ${sessionMinutes} min`,
    description: pregnancy
      ? `Plan orientativo para el ${trimester}.º trimestre. Combina fuerza moderada, control postural, movilidad, respiración y cardio suave; la selección cambia con los días, la duración y la variante.`
      : 'Programa progresivo adaptado al nivel, objetivo, número de sesiones y tiempo disponible.',
    weeks: level === 'advanced' ? 12 : pregnancy ? 6 : 10,
    daysPerWeek: count,
    sessionMinutes,
    progression: pregnancy
      ? ['Mantén una intensidad que permita conversar.', 'Respira de forma continua y prioriza la estabilidad.', 'Detente ante síntomas de alarma y consulta a tu profesional.']
      : ['Mantén una técnica sólida.', 'Sube carga solo al completar el rango con margen.', 'Reduce volumen si la recuperación empeora.'],
    schedule: days.map((day, index) => `${dayNames[index]} · ${day.title.replace(/^Día \d+ · /, '')}`),
    days,
  }
}
