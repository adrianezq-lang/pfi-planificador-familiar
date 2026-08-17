export type Level = 'beginner' | 'intermediate' | 'advanced' | 'pregnancy'
export type Goal = 'hypertrophy' | 'strength' | 'fatloss' | 'fitness' | 'wellness' | 'pregnancy'
export type Unit = 'kg' | 'lb'
export type Tab = 'home' | 'routine' | 'train' | 'exercises' | 'progress' | 'profile'
export type Trimester = 1 | 2 | 3
export type ExerciseCategory = 'strength' | 'core' | 'mobility' | 'cardio' | 'breathing'

export interface PregnancySupport {
  trimesters: Trimester[]
  note: string
  category: ExerciseCategory
}

export interface UserProfile {
  name: string
  level: Level
  goal: Goal
  units: Unit
  sessionsPerWeek: number
  sessionMinutes: number
  equipment: string[]
  trimester?: Trimester
  onboarded: boolean
}

export interface Exercise {
  id: string
  name: string
  muscle: string
  equipment: string
  level: Exclude<Level, 'pregnancy'> | 'all'
  instructions: string[]
  tips: string[]
  alternatives: string[]
  isCompound: boolean
  category?: ExerciseCategory
  pregnancy?: PregnancySupport
  tags?: string[]
}

export interface ProgramExercise {
  exerciseId: string
  sets: number
  reps: string
  restSeconds: number
  rir: string
  note?: string
}
export interface WorkoutDay {
  id: string
  title: string
  focus: string
  estimatedMinutes: number
  exercises: ProgramExercise[]
}
export interface TrainingProgram {
  id: string
  level: Level
  name: string
  subtitle: string
  description: string
  weeks: number
  daysPerWeek: number
  sessionMinutes: number
  progression: string[]
  schedule: string[]
  days: WorkoutDay[]
}
export interface SetEntry { weight: number; reps: number; completed: boolean }
export interface ActiveWorkout { dayId: string; programId: string; startedAt: number; exerciseIndex: number; entries: Record<string, SetEntry[]> }
export interface WorkoutLogExercise { exerciseId: string; sets: SetEntry[] }
export interface WorkoutLog { id: string; date: string; programId: string; dayId: string; durationSeconds: number; volume: number; exercises: WorkoutLogExercise[] }
