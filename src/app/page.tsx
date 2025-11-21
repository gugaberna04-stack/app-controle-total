"use client"

import { useState, useEffect } from "react"
import { Play, Pause, RotateCcw, Trophy, Flame, CheckCircle2, Clock, Sun, Moon, Wind, Timer, ChevronLeft, ChevronRight, LogOut } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

type ExerciseType = "kegel-morning" | "kegel-night" | "start-stop" | "breathing"
type DifficultyLevel = "beginner" | "intermediate" | "advanced"

interface DailyExercise {
  id: string
  type: ExerciseType
  name: string
  period: "Manhã" | "Noite"
  icon: any
  duration: number
  description: string
  instructions: string[]
  completed: boolean
  difficulty?: DifficultyLevel
}

interface KegelConfig {
  contractTime: number
  relaxTime: number
  sets: number
}

const KEGEL_CONFIGS: Record<DifficultyLevel, KegelConfig> = {
  beginner: { contractTime: 3, relaxTime: 3, sets: 10 },
  intermediate: { contractTime: 5, relaxTime: 5, sets: 15 },
  advanced: { contractTime: 8, relaxTime: 8, sets: 20 }
}

export default function Home() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [streak, setStreak] = useState(0)
  const [totalCompleted, setTotalCompleted] = useState(0)
  const [dailyExercises, setDailyExercises] = useState<DailyExercise[]>([])
  const [activeExercise, setActiveExercise] = useState<DailyExercise | null>(null)
  const [isExercising, setIsExercising] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [phase, setPhase] = useState<"contract" | "relax" | "hold" | "breathe">("contract")
  const [currentSet, setCurrentSet] = useState(1)
  const [totalSets, setTotalSets] = useState(10)
  const [kegelDifficulty, setKegelDifficulty] = useState<DifficultyLevel>("beginner")
  const [contractTime, setContractTime] = useState(3)
  const [relaxTime, setRelaxTime] = useState(3)

  // Verifica autenticação
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/auth')
      } else {
        setUserId(session.user.id)
        loadUserStats(session.user.id)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/auth')
      } else {
        setUserId(session.user.id)
        loadUserStats(session.user.id)
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  // Carrega estatísticas do usuário
  const loadUserStats = async (uid: string) => {
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', uid)
      .single()

    if (data) {
      setStreak(data.current_streak || 0)
      setTotalCompleted(data.total_completed || 0)
    }
  }

  // Carrega exercícios completados do dia
  const loadCompletedExercises = async (uid: string, date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('completed_exercises')
      .select('*')
      .eq('user_id', uid)
      .eq('date', dateStr)

    return data || []
  }

  // Determina se hoje tem exercício Start-Stop (segunda, quarta, sexta)
  const hasStartStop = (date: Date) => {
    const dayOfWeek = date.getDay()
    return dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5
  }

  // Gera os exercícios para uma data específica
  const generateExercisesForDate = async (date: Date, uid: string | null): Promise<DailyExercise[]> => {
    const dateKey = date.toISOString().split('T')[0]
    const config = KEGEL_CONFIGS[kegelDifficulty]
    
    const exercises: DailyExercise[] = [
      {
        id: `kegel-morning-${dateKey}`,
        type: "kegel-morning",
        name: "Kegel Matinal",
        period: "Manhã",
        icon: Sun,
        duration: config.sets * (config.contractTime + config.relaxTime),
        description: `Exercício Kegel para começar o dia com energia - Nível ${kegelDifficulty === 'beginner' ? 'Iniciante' : kegelDifficulty === 'intermediate' ? 'Intermediário' : 'Avançado'}`,
        instructions: [
          `Contraia os músculos do assoalho pélvico por ${config.contractTime} segundos`,
          `Relaxe por ${config.relaxTime} segundos`,
          `Repita ${config.sets} vezes`,
          "Mantenha a respiração normal"
        ],
        completed: false,
        difficulty: kegelDifficulty
      },
      {
        id: `kegel-night-${dateKey}`,
        type: "kegel-night",
        name: "Kegel Noturno",
        period: "Noite",
        icon: Moon,
        duration: config.sets * (config.contractTime + config.relaxTime),
        description: `Exercício Kegel antes de dormir - Nível ${kegelDifficulty === 'beginner' ? 'Iniciante' : kegelDifficulty === 'intermediate' ? 'Intermediário' : 'Avançado'}`,
        instructions: [
          `Contraia os músculos do assoalho pélvico por ${config.contractTime} segundos`,
          `Relaxe por ${config.relaxTime} segundos`,
          `Repita ${config.sets} vezes`,
          "Foque na qualidade das contrações"
        ],
        completed: false,
        difficulty: kegelDifficulty
      }
    ]

    if (hasStartStop(date)) {
      exercises.push({
        id: `start-stop-${dateKey}`,
        type: "start-stop",
        name: "Técnica Start-Stop",
        period: "Manhã",
        icon: Timer,
        duration: 600,
        description: "Exercício para controle da ejaculação",
        instructions: [
          "Estimule-se até sentir que está próximo do clímax",
          "Pare completamente a estimulação",
          "Aguarde 30-60 segundos até a sensação diminuir",
          "Repita o processo 3-5 vezes",
          "Este exercício treina o controle e reconhecimento dos sinais do corpo"
        ],
        completed: false
      })
    } else {
      exercises.push({
        id: `breathing-${dateKey}`,
        type: "breathing",
        name: "Controle Respiratório",
        period: "Manhã",
        icon: Wind,
        duration: 300,
        description: "Exercício de respiração para controle e relaxamento",
        instructions: [
          "Inspire profundamente pelo nariz por 4 segundos",
          "Segure o ar por 4 segundos",
          "Expire lentamente pela boca por 6 segundos",
          "Repita por 5 minutos",
          "A respiração controlada ajuda no controle durante o ato sexual"
        ],
        completed: false
      })
    }

    // Carrega exercícios completados do banco
    if (uid) {
      const completed = await loadCompletedExercises(uid, date)
      const completedIds = completed.map(c => c.exercise_id)
      
      exercises.forEach(ex => {
        if (completedIds.includes(ex.id)) {
          ex.completed = true
        }
      })
    }

    return exercises
  }

  // Gera os exercícios do dia quando a data ou dificuldade mudar
  useEffect(() => {
    if (userId) {
      generateExercisesForDate(currentDate, userId).then(setDailyExercises)
    }
  }, [currentDate, kegelDifficulty, userId])

  // Timer do exercício
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isExercising && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            if (activeExercise?.type === "kegel-morning" || activeExercise?.type === "kegel-night") {
              if (phase === "contract") {
                setPhase("relax")
                return relaxTime
              } else {
                const nextSet = currentSet + 1
                setCurrentSet(nextSet)
                
                if (nextSet > totalSets) {
                  setIsExercising(false)
                  return 0
                }
                setPhase("contract")
                return contractTime
              }
            } else if (activeExercise?.type === "breathing") {
              if (phase === "breathe") {
                setPhase("hold")
                return 4
              } else if (phase === "hold") {
                setPhase("relax")
                return 6
              } else {
                setPhase("breathe")
                return 4
              }
            }
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => clearInterval(interval)
  }, [isExercising, timeRemaining, phase, activeExercise, currentSet, totalSets, contractTime, relaxTime])

  const startExercise = (exercise: DailyExercise) => {
    setActiveExercise(exercise)
    setIsExercising(true)
    setCurrentSet(1)
    
    if (exercise.type === "kegel-morning" || exercise.type === "kegel-night") {
      const config = KEGEL_CONFIGS[kegelDifficulty]
      setTotalSets(config.sets)
      setContractTime(config.contractTime)
      setRelaxTime(config.relaxTime)
      setPhase("contract")
      setTimeRemaining(config.contractTime)
    } else if (exercise.type === "breathing") {
      setPhase("breathe")
      setTimeRemaining(4)
    } else if (exercise.type === "start-stop") {
      setPhase("contract")
      setTimeRemaining(exercise.duration)
    }
  }

  const pauseExercise = () => {
    setIsExercising(false)
  }

  const resumeExercise = () => {
    setIsExercising(true)
  }

  const stopExercise = () => {
    setIsExercising(false)
    setActiveExercise(null)
    setTimeRemaining(0)
    setCurrentSet(1)
  }

  const completeExercise = async (exerciseId: string) => {
    if (!userId) return

    // Salva no banco
    const dateStr = currentDate.toISOString().split('T')[0]
    const exercise = dailyExercises.find(ex => ex.id === exerciseId)
    
    await supabase.from('completed_exercises').insert({
      user_id: userId,
      exercise_id: exerciseId,
      exercise_type: exercise?.type || '',
      date: dateStr
    })

    // Atualiza estado local
    setDailyExercises(prev => 
      prev.map(ex => 
        ex.id === exerciseId ? { ...ex, completed: true } : ex
      )
    )

    const newTotalCompleted = totalCompleted + 1
    setTotalCompleted(newTotalCompleted)
    
    // Verifica se todos os exercícios do dia foram completados
    const allCompleted = dailyExercises.every(ex => 
      ex.id === exerciseId ? true : ex.completed
    )
    
    if (allCompleted) {
      const newStreak = streak + 1
      setStreak(newStreak)
      
      // Atualiza estatísticas no banco
      await supabase
        .from('user_stats')
        .update({
          current_streak: newStreak,
          total_completed: newTotalCompleted,
          last_completed_date: dateStr,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
    } else {
      // Atualiza apenas total_completed
      await supabase
        .from('user_stats')
        .update({
          total_completed: newTotalCompleted,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
    }
    
    stopExercise()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getPhaseText = () => {
    if (!activeExercise) return ""
    
    if (activeExercise.type === "kegel-morning" || activeExercise.type === "kegel-night") {
      return phase === "contract" ? "CONTRAIA" : "RELAXE"
    } else if (activeExercise.type === "breathing") {
      if (phase === "breathe") return "INSPIRE"
      if (phase === "hold") return "SEGURE"
      return "EXPIRE"
    } else if (activeExercise.type === "start-stop") {
      return "SIGA AS INSTRUÇÕES"
    }
    return ""
  }

  const getPhaseColor = () => {
    if (phase === "contract" || phase === "breathe") return "text-green-400"
    if (phase === "hold") return "text-yellow-400"
    return "text-blue-400"
  }

  const todayProgress = dailyExercises.filter(ex => ex.completed).length
  const totalExercises = dailyExercises.length
  const progressPercentage = totalExercises > 0 ? (todayProgress / totalExercises) * 100 : 0

  const goToPreviousDay = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() - 1)
    setCurrentDate(newDate)
  }

  const goToNextDay = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + 1)
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const isToday = currentDate.toDateString() === new Date().toDateString()
  const isFutureDate = currentDate > new Date()

  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">The Coach</h1>
                <p className="text-xs text-purple-300">Exercícios Diários</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-orange-500/20 px-3 py-1.5 rounded-full border border-orange-500/30">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-bold text-orange-300">{streak}</span>
              </div>
              <div className="flex items-center gap-2 bg-purple-500/20 px-3 py-1.5 rounded-full border border-purple-500/30">
                <CheckCircle2 className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-bold text-purple-300">{totalCompleted}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 px-3 py-1.5 rounded-full border border-red-500/30 transition-all duration-300"
              >
                <LogOut className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Date Navigation */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousDay}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-all duration-300"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
              <span className="text-sm text-white font-medium hidden sm:inline">Anterior</span>
            </button>
            
            <div className="text-center">
              <h2 className="text-lg sm:text-xl font-bold text-white">
                {currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h2>
              {!isToday && (
                <button
                  onClick={goToToday}
                  className="text-xs text-purple-300 hover:text-purple-200 underline mt-1"
                >
                  Voltar para hoje
                </button>
              )}
            </div>
            
            <button
              onClick={goToNextDay}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-all duration-300"
            >
              <span className="text-sm text-white font-medium hidden sm:inline">Próximo</span>
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Difficulty Selector for Kegel */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
          <h3 className="text-lg font-bold text-white mb-4">Nível dos Exercícios Kegel</h3>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setKegelDifficulty("beginner")}
              className={`px-4 py-3 rounded-xl font-bold transition-all duration-300 ${
                kegelDifficulty === "beginner"
                  ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg scale-105"
                  : "bg-white/10 text-gray-300 hover:bg-white/20"
              }`}
            >
              <div className="text-sm">Iniciante</div>
              <div className="text-xs opacity-80">3s × 10</div>
            </button>
            <button
              onClick={() => setKegelDifficulty("intermediate")}
              className={`px-4 py-3 rounded-xl font-bold transition-all duration-300 ${
                kegelDifficulty === "intermediate"
                  ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg scale-105"
                  : "bg-white/10 text-gray-300 hover:bg-white/20"
              }`}
            >
              <div className="text-sm">Intermediário</div>
              <div className="text-xs opacity-80">5s × 15</div>
            </button>
            <button
              onClick={() => setKegelDifficulty("advanced")}
              className={`px-4 py-3 rounded-xl font-bold transition-all duration-300 ${
                kegelDifficulty === "advanced"
                  ? "bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg scale-105"
                  : "bg-white/10 text-gray-300 hover:bg-white/20"
              }`}
            >
              <div className="text-sm">Avançado</div>
              <div className="text-xs opacity-80">8s × 20</div>
            </button>
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {isToday ? "Progresso de Hoje" : isFutureDate ? "Exercícios Futuros" : "Exercícios Passados"}
              </h2>
              <p className="text-gray-300 text-sm mt-1">
                {currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-white">{todayProgress}/{totalExercises}</div>
              <p className="text-sm text-gray-300">Completos</p>
            </div>
          </div>
          
          <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 rounded-full"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Exercise List */}
        <div className="space-y-4">
          {dailyExercises.map((exercise) => {
            const Icon = exercise.icon
            return (
              <div
                key={exercise.id}
                className={`bg-white/10 backdrop-blur-md rounded-2xl p-6 border transition-all duration-300 ${
                  exercise.completed 
                    ? "border-green-500/50 bg-green-500/10" 
                    : "border-white/20 hover:border-purple-500/50"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      exercise.completed 
                        ? "bg-green-500/20" 
                        : exercise.period === "Manhã" 
                          ? "bg-yellow-500/20" 
                          : "bg-blue-500/20"
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        exercise.completed 
                          ? "text-green-400" 
                          : exercise.period === "Manhã" 
                            ? "text-yellow-400" 
                            : "text-blue-400"
                      }`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-bold text-white">{exercise.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          exercise.period === "Manhã" 
                            ? "bg-yellow-500/20 text-yellow-300" 
                            : "bg-blue-500/20 text-blue-300"
                        }`}>
                          {exercise.period}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm mb-3">{exercise.description}</p>
                      
                      <div className="space-y-2">
                        {exercise.instructions.map((instruction, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0"></div>
                            <p className="text-sm text-gray-400">{instruction}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0 ml-4">
                    {exercise.completed ? (
                      <div className="flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-xl border border-green-500/30">
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                        <span className="text-sm font-bold text-green-300">Completo</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => startExercise(exercise)}
                        className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 shadow-lg"
                      >
                        <Play className="w-5 h-5" />
                        Iniciar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Tips */}
        <div className="mt-6 bg-blue-500/10 backdrop-blur-md rounded-2xl p-6 border border-blue-500/20">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            Dica do Dia
          </h3>
          <p className="text-gray-300 text-sm">
            {hasStartStop(currentDate) 
              ? "Hoje é dia de praticar a técnica Start-Stop. Este exercício é fundamental para desenvolver controle durante o ato sexual. Pratique com calma e atenção aos sinais do seu corpo."
              : "Hoje pratique o exercício de respiração. A respiração controlada é essencial para manter o controle durante momentos de alta excitação. Combine com os exercícios Kegel para melhores resultados."
            }
          </p>
        </div>
      </div>

      {/* Exercise Modal */}
      {activeExercise && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-white/20 shadow-2xl">
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                {activeExercise.name}
              </h2>
              <p className="text-gray-300">{activeExercise.description}</p>
            </div>

            <div className="flex flex-col items-center justify-center mb-8">
              <div className="relative w-48 h-48 sm:w-64 sm:h-64 mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full opacity-20 animate-pulse"></div>
                <div className="absolute inset-4 bg-slate-900 rounded-full flex items-center justify-center border-4 border-purple-500/50">
                  <div className="text-center">
                    <div className="text-5xl sm:text-6xl font-bold text-white mb-2">
                      {timeRemaining > 0 ? timeRemaining : "0"}
                    </div>
                    <div className={`text-sm sm:text-base uppercase tracking-wider font-bold ${getPhaseColor()}`}>
                      {getPhaseText()}
                    </div>
                    {(activeExercise.type === "kegel-morning" || activeExercise.type === "kegel-night") && (
                      <div className="text-xs text-gray-400 mt-2">
                        Série {currentSet}/{totalSets}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {!isExercising ? (
                  <>
                    <button
                      onClick={resumeExercise}
                      className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 shadow-2xl"
                    >
                      <Play className="w-6 h-6" />
                      Continuar
                    </button>
                    <button
                      onClick={stopExercise}
                      className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-4 rounded-2xl font-bold transition-all duration-300 hover:scale-105"
                    >
                      <RotateCcw className="w-5 h-5" />
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={pauseExercise}
                    className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105"
                  >
                    <Pause className="w-6 h-6" />
                    Pausar
                  </button>
                )}
              </div>

              {!isExercising && (
                <button
                  onClick={() => completeExercise(activeExercise.id)}
                  className="mt-4 flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-2xl font-bold transition-all duration-300 hover:scale-105 shadow-lg"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Completar Exercício
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
