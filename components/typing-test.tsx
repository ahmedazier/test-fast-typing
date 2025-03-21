"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"
import { BarChart3, Trophy, Settings, Keyboard, Clock, BarChart, Flame } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface TypingTestProps {
  quotes: string[]
}

// Define difficulty levels
type Difficulty = "easy" | "medium" | "hard" | "custom"

// Define typing history entry
interface TypingHistoryEntry {
  date: Date
  wpm: number
  accuracy: number
  difficulty: Difficulty
  quoteLength: number
}

// Define achievement
interface Achievement {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  unlocked: boolean
  progress?: number
  goal?: number
}

export default function TypingTest({ quotes }: TypingTestProps) {
  const [currentQuote, setCurrentQuote] = useState("")
  const [userInput, setUserInput] = useState("")
  const [startTime, setStartTime] = useState<number | null>(null)
  const [endTime, setEndTime] = useState<number | null>(null)
  const [wpm, setWpm] = useState(0)
  const [liveWpm, setLiveWpm] = useState(0)
  const [accuracy, setAccuracy] = useState(100)
  const [isFinished, setIsFinished] = useState(false)
  const [isStarted, setIsStarted] = useState(false)
  const [currentPosition, setCurrentPosition] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [showThemeSelector, setShowThemeSelector] = useState(false)
  const [difficulty, setDifficulty] = useState<Difficulty>("medium")
  const [showSettings, setShowSettings] = useState(false)
  const [typingHistory, setTypingHistory] = useState<TypingHistoryEntry[]>([])
  const [showStats, setShowStats] = useState(false)
  const [errorMap, setErrorMap] = useState<Record<string, number>>({})
  const [showAchievements, setShowAchievements] = useState(false)
  const [achievements, setAchievements] = useState<Achievement[]>([
    {
      id: "first-test",
      name: "First Steps",
      description: "Complete your first typing test",
      icon: <Trophy size={16} />,
      unlocked: false,
    },
    {
      id: "speed-demon",
      name: "Speed Demon",
      description: "Reach 50 WPM",
      icon: <Flame size={16} />,
      unlocked: false,
      progress: 0,
      goal: 50,
    },
    {
      id: "accuracy-master",
      name: "Accuracy Master",
      description: "Complete a test with 100% accuracy",
      icon: <BarChart size={16} />,
      unlocked: false,
    },
    {
      id: "persistent",
      name: "Persistent",
      description: "Complete 5 typing tests",
      icon: <Clock size={16} />,
      unlocked: false,
      progress: 0,
      goal: 5,
    },
    {
      id: "keyboard-warrior",
      name: "Keyboard Warrior",
      description: "Type over 1000 characters",
      icon: <Keyboard size={16} />,
      unlocked: false,
      progress: 0,
      goal: 1000,
    },
  ])
  const [totalCharactersTyped, setTotalCharactersTyped] = useState(0)
  const [streakDays, setStreakDays] = useState(0)
  const [lastTestDate, setLastTestDate] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const textContainerRef = useRef<HTMLDivElement>(null)
  const wpmIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const { theme, setTheme } = useTheme()
  const [cursorStyle, setCursorStyle] = useState({
    left: 0,
    top: 0,
    height: 0,
  })

  const themes = [
    { name: "dark", label: "dark" },
    { name: "light", label: "light" },
    { name: "blue", label: "blue" },
    { name: "red", label: "red" },
    { name: "yellow", label: "yellow" },
    { name: "green", label: "green" },
    { name: "purple", label: "purple" },
  ]

  // Load saved data from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Load typing history
      const savedHistory = localStorage.getItem("typingHistory")
      if (savedHistory) {
        try {
          const parsedHistory = JSON.parse(savedHistory)
          // Convert string dates back to Date objects
          const formattedHistory = parsedHistory.map((entry: any) => ({
            ...entry,
            date: new Date(entry.date),
          }))
          setTypingHistory(formattedHistory)
        } catch (e) {
          console.error("Failed to parse typing history", e)
        }
      }

      // Load achievements
      const savedAchievements = localStorage.getItem("achievements")
      if (savedAchievements) {
        try {
          setAchievements(JSON.parse(savedAchievements))
        } catch (e) {
          console.error("Failed to parse achievements", e)
        }
      }

      // Load total characters typed
      const savedTotalChars = localStorage.getItem("totalCharactersTyped")
      if (savedTotalChars) {
        setTotalCharactersTyped(Number.parseInt(savedTotalChars, 10))
      }

      // Load streak data
      const savedStreak = localStorage.getItem("streakDays")
      if (savedStreak) {
        setStreakDays(Number.parseInt(savedStreak, 10))
      }

      const savedLastTestDate = localStorage.getItem("lastTestDate")
      if (savedLastTestDate) {
        setLastTestDate(savedLastTestDate)
      }
    }
  }, [])

  // Handle mounted state to avoid hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  // Update cursor position
  useEffect(() => {
    if (textContainerRef.current) {
      const textContainer = textContainerRef.current
      const chars = textContainer.querySelectorAll("span[data-char]")

      if (chars.length > 0 && currentPosition < chars.length) {
        const currentChar = chars[currentPosition]
        const rect = currentChar.getBoundingClientRect()
        const containerRect = textContainer.getBoundingClientRect()

        setCursorStyle({
          left: rect.left - containerRect.left,
          top: rect.top - containerRect.top,
          height: rect.height,
        })
      }
    }
  }, [currentPosition, currentQuote, userInput])

  // Get a random quote based on difficulty
  const getRandomQuote = () => {
    let filteredQuotes = [...quotes]

    // Filter quotes based on difficulty
    if (difficulty === "easy") {
      filteredQuotes = quotes.filter((quote) => quote.length < 200)
    } else if (difficulty === "medium") {
      filteredQuotes = quotes.filter((quote) => quote.length >= 200 && quote.length < 400)
    } else if (difficulty === "hard") {
      filteredQuotes = quotes.filter((quote) => quote.length >= 400)
    }

    // If no quotes match the criteria, use all quotes
    if (filteredQuotes.length === 0) {
      filteredQuotes = quotes
    }

    const randomIndex = Math.floor(Math.random() * filteredQuotes.length)
    return filteredQuotes[randomIndex]
  }

  // Initialize game
  const initGame = () => {
    setCurrentQuote(getRandomQuote())
    setUserInput("")
    setStartTime(null)
    setEndTime(null)
    setWpm(0)
    setLiveWpm(0)
    setAccuracy(100)
    setIsFinished(false)
    setIsStarted(false)
    setCurrentPosition(0)
    setCursorStyle({ left: 0, top: 0, height: 0 })
    setErrorMap({})

    // Clear any existing interval
    if (wpmIntervalRef.current) {
      clearInterval(wpmIntervalRef.current)
      wpmIntervalRef.current = null
    }
  }

  // Start the game
  useEffect(() => {
    initGame()
    return () => {
      if (wpmIntervalRef.current) {
        clearInterval(wpmIntervalRef.current)
      }
    }
  }, [difficulty])

  // Focus the container when loaded
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus()
    }
  }, [isFinished])

  // Calculate WPM
  const calculateWPM = () => {
    if (!startTime || !isStarted) return 0

    const timeInMinutes = (Date.now() - startTime) / 60000
    const wordCount = userInput.length / 5 // standard: 5 chars = 1 word

    if (timeInMinutes === 0) return 0
    return Math.round(wordCount / timeInMinutes)
  }

  // Update WPM in real-time
  useEffect(() => {
    if (isStarted && !isFinished) {
      // Clear any existing interval
      if (wpmIntervalRef.current) {
        clearInterval(wpmIntervalRef.current)
      }

      // Update WPM every second
      wpmIntervalRef.current = setInterval(() => {
        setLiveWpm(calculateWPM())
      }, 1000)

      // Calculate initial WPM
      setLiveWpm(calculateWPM())
    }

    return () => {
      if (wpmIntervalRef.current) {
        clearInterval(wpmIntervalRef.current)
      }
    }
  }, [isStarted, isFinished, userInput])

  // Update achievements
  const updateAchievements = (finalWpm: number, finalAccuracy: number) => {
    const newAchievements = [...achievements]
    let achievementUnlocked = false

    // First test achievement
    if (!newAchievements.find((a) => a.id === "first-test")?.unlocked) {
      newAchievements.find((a) => a.id === "first-test")!.unlocked = true
      achievementUnlocked = true
    }

    // Speed demon achievement
    const speedAchievement = newAchievements.find((a) => a.id === "speed-demon")!
    if (!speedAchievement.unlocked) {
      speedAchievement.progress = Math.max(speedAchievement.progress || 0, finalWpm)
      if (finalWpm >= 50) {
        speedAchievement.unlocked = true
        achievementUnlocked = true
      }
    }

    // Accuracy master achievement
    if (!newAchievements.find((a) => a.id === "accuracy-master")?.unlocked && finalAccuracy === 100) {
      newAchievements.find((a) => a.id === "accuracy-master")!.unlocked = true
      achievementUnlocked = true
    }

    // Persistent achievement
    const persistentAchievement = newAchievements.find((a) => a.id === "persistent")!
    if (!persistentAchievement.unlocked) {
      persistentAchievement.progress = (persistentAchievement.progress || 0) + 1
      if (persistentAchievement.progress >= 5) {
        persistentAchievement.unlocked = true
        achievementUnlocked = true
      }
    }

    // Keyboard warrior achievement
    const newTotalChars = totalCharactersTyped + userInput.length
    setTotalCharactersTyped(newTotalChars)
    localStorage.setItem("totalCharactersTyped", newTotalChars.toString())

    const keyboardAchievement = newAchievements.find((a) => a.id === "keyboard-warrior")!
    if (!keyboardAchievement.unlocked) {
      keyboardAchievement.progress = newTotalChars
      if (newTotalChars >= 1000) {
        keyboardAchievement.unlocked = true
        achievementUnlocked = true
      }
    }

    setAchievements(newAchievements)
    localStorage.setItem("achievements", JSON.stringify(newAchievements))

    // Update streak
    const today = new Date().toISOString().split("T")[0]
    if (lastTestDate !== today) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split("T")[0]

      if (lastTestDate === yesterdayStr) {
        // Continuing streak
        const newStreak = streakDays + 1
        setStreakDays(newStreak)
        localStorage.setItem("streakDays", newStreak.toString())
      } else if (lastTestDate !== today) {
        // Reset streak
        setStreakDays(1)
        localStorage.setItem("streakDays", "1")
      }

      setLastTestDate(today)
      localStorage.setItem("lastTestDate", today)
    }

    return achievementUnlocked
  }

  // Handle keyboard input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ignore modifier keys and special keys
    if (
      e.ctrlKey ||
      e.altKey ||
      e.metaKey ||
      e.key === "Shift" ||
      e.key === "Control" ||
      e.key === "Alt" ||
      e.key === "Meta" ||
      e.key === "Tab" ||
      e.key === "CapsLock" ||
      e.key === "Escape"
    ) {
      return
    }

    // Prevent default behavior for most keys
    if (e.key !== "Backspace") {
      e.preventDefault()
    }

    // Start timer on first keystroke
    if (!isStarted && !startTime) {
      setStartTime(Date.now())
      setIsStarted(true)
    }

    // Handle backspace
    if (e.key === "Backspace" && currentPosition > 0) {
      e.preventDefault()
      setCurrentPosition(currentPosition - 1)
      setUserInput(userInput.slice(0, -1))
      return
    }

    // Ignore if we're at the end of the quote
    if (currentPosition >= currentQuote.length) {
      return
    }

    // Handle character input
    if (e.key.length === 1) {
      const newUserInput = userInput + e.key
      setUserInput(newUserInput)
      setCurrentPosition(currentPosition + 1)

      // Track errors for heat map
      if (e.key !== currentQuote[currentPosition]) {
        setErrorMap((prev) => {
          const newMap = { ...prev }
          newMap[e.key] = (newMap[e.key] || 0) + 1
          return newMap
        })
      }

      // Calculate accuracy
      let correctChars = 0
      for (let i = 0; i < newUserInput.length; i++) {
        if (i < currentQuote.length && newUserInput[i] === currentQuote[i]) {
          correctChars++
        }
      }
      const accuracyPercent = newUserInput.length > 0 ? Math.floor((correctChars / newUserInput.length) * 100) : 100
      setAccuracy(accuracyPercent)

      // Check if quote is completed
      if (newUserInput === currentQuote || currentPosition + 1 >= currentQuote.length) {
        const endTimeNow = Date.now()
        setEndTime(endTimeNow)
        setIsFinished(true)

        // Calculate final WPM
        const finalWpm = calculateWPM()
        setWpm(finalWpm)

        // Save test results to history
        const newHistoryEntry: TypingHistoryEntry = {
          date: new Date(),
          wpm: finalWpm,
          accuracy: accuracyPercent,
          difficulty: difficulty,
          quoteLength: currentQuote.length,
        }

        const updatedHistory = [...typingHistory, newHistoryEntry]
        setTypingHistory(updatedHistory)

        // Save to localStorage
        localStorage.setItem("typingHistory", JSON.stringify(updatedHistory))

        // Update achievements
        updateAchievements(finalWpm, accuracyPercent)

        // Clear interval
        if (wpmIntervalRef.current) {
          clearInterval(wpmIntervalRef.current)
          wpmIntervalRef.current = null
        }
      }
    }
  }

  // Reset the game
  const resetGame = () => {
    initGame()
  }

  // Toggle theme selector
  const toggleThemeSelector = () => {
    setShowThemeSelector(!showThemeSelector)
  }

  // Toggle settings
  const toggleSettings = () => {
    setShowSettings(!showSettings)
  }

  // Toggle stats
  const toggleStats = () => {
    setShowStats(!showStats)
  }

  // Toggle achievements
  const toggleAchievements = () => {
    setShowAchievements(!showAchievements)
  }

  // Change difficulty
  const changeDifficulty = (newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty)
    initGame()
  }

  // Get cursor color based on theme
  const getCursorColor = () => {
    switch (theme) {
      case "blue":
        return "bg-blue-500"
      case "red":
        return "bg-red-500"
      case "yellow":
        return "bg-yellow-500"
      case "green":
        return "bg-green-500"
      case "purple":
        return "bg-purple-500"
      case "dark":
        return "bg-blue-400"
      case "light":
      default:
        return "bg-blue-500"
    }
  }

  // Get error text color based on theme
  const getErrorColor = () => {
    switch (theme) {
      case "blue":
        return "text-red-500"
      case "red":
        return "text-red-600"
      case "yellow":
        return "text-red-600"
      case "green":
        return "text-red-600"
      case "purple":
        return "text-red-500"
      case "dark":
        return "text-red-500"
      case "light":
      default:
        return "text-red-500"
    }
  }

  // Get theme-specific text color
  const getThemeTextColor = () => {
    switch (theme) {
      case "dark":
        return "text-neutral-500"
      case "light":
        return "text-neutral-600"
      case "blue":
        return "text-blue-600"
      case "red":
        return "text-red-600"
      case "yellow":
        return "text-yellow-600"
      case "green":
        return "text-green-600"
      case "purple":
        return "text-purple-600"
      default:
        return "text-neutral-600"
    }
  }

  // Calculate progress percentage
  const progressPercentage = isStarted ? Math.min(100, Math.round((currentPosition / currentQuote.length) * 100)) : 0

  // If not mounted yet, don't render to avoid hydration mismatch
  if (!mounted) return null

  // Results Screen
  if (isFinished) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-0 text-left">
          <div className="text-muted-foreground text-xl">wpm</div>
          <div
            className={cn(
              "text-7xl font-normal",
              theme === "dark"
                ? "text-neutral-500"
                : theme === "light"
                  ? "text-neutral-600"
                  : theme === "blue"
                    ? "text-blue-700"
                    : theme === "red"
                      ? "text-red-700"
                      : theme === "yellow"
                        ? "text-yellow-700"
                        : theme === "green"
                          ? "text-green-700"
                          : theme === "purple"
                            ? "text-purple-700"
                            : "text-neutral-600",
            )}
          >
            {wpm}
          </div>
          <div className="text-muted-foreground text-xl mt-6">acc</div>
          <div
            className={cn(
              "text-7xl font-normal",
              theme === "dark"
                ? "text-neutral-500"
                : theme === "light"
                  ? "text-neutral-600"
                  : theme === "blue"
                    ? "text-blue-700"
                    : theme === "red"
                      ? "text-red-700"
                      : theme === "yellow"
                        ? "text-yellow-700"
                        : theme === "green"
                          ? "text-green-700"
                          : theme === "purple"
                            ? "text-purple-700"
                            : "text-neutral-600",
            )}
          >
            {accuracy}%
          </div>
        </div>

        {/* Error heat map */}
        {Object.keys(errorMap).length > 0 && (
          <div className="mt-8 w-full max-w-md">
            <h3 className={cn("text-sm uppercase tracking-wider mb-2", getThemeTextColor())}>Error Heat Map</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(errorMap)
                .sort((a, b) => b[1] - a[1])
                .map(([key, count]) => (
                  <div
                    key={key}
                    className={cn(
                      "px-3 py-2 border text-center min-w-10",
                      count > 5
                        ? "bg-red-500/20 border-red-500"
                        : count > 2
                          ? "bg-yellow-500/20 border-yellow-500"
                          : "bg-blue-500/10 border-blue-500/50",
                    )}
                  >
                    <div className="text-lg">{key}</div>
                    <div className="text-xs text-muted-foreground">{count}x</div>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="flex gap-4 mt-8">
          <Button
            onClick={resetGame}
            variant="ghost"
            className={cn("text-sm uppercase tracking-wider", getThemeTextColor())}
          >
            start over
          </Button>

          <Button
            onClick={toggleStats}
            variant="ghost"
            className={cn("text-sm uppercase tracking-wider", getThemeTextColor())}
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            stats
          </Button>

          <Button
            onClick={toggleAchievements}
            variant="ghost"
            className={cn("text-sm uppercase tracking-wider", getThemeTextColor())}
          >
            <Trophy className="mr-2 h-4 w-4" />
            achievements
          </Button>
        </div>

        {/* Stats Panel */}
        <AnimatePresence>
          {showStats && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={cn("fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50")}
              onClick={() => setShowStats(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "w-full max-w-2xl p-6 rounded-lg shadow-lg",
                  theme === "dark"
                    ? "bg-black border border-neutral-800"
                    : theme === "light"
                      ? "bg-white border border-neutral-200"
                      : theme === "blue"
                        ? "bg-blue-50 border border-blue-200"
                        : theme === "red"
                          ? "bg-red-50 border border-red-200"
                          : theme === "yellow"
                            ? "bg-yellow-50 border border-yellow-200"
                            : theme === "green"
                              ? "bg-green-50 border border-green-200"
                              : theme === "purple"
                                ? "bg-purple-50 border border-purple-200"
                                : "bg-white border border-neutral-200",
                )}
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className={cn("text-xl font-medium", getThemeTextColor())}>Typing Statistics</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowStats(false)}>
                    ✕
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className={cn("p-4 border", theme === "dark" ? "border-neutral-800" : "border-neutral-200")}>
                    <div className="text-muted-foreground text-sm">Tests Completed</div>
                    <div className={cn("text-2xl font-medium", getThemeTextColor())}>{typingHistory.length}</div>
                  </div>
                  <div className={cn("p-4 border", theme === "dark" ? "border-neutral-800" : "border-neutral-200")}>
                    <div className="text-muted-foreground text-sm">Avg. WPM</div>
                    <div className={cn("text-2xl font-medium", getThemeTextColor())}>
                      {typingHistory.length > 0
                        ? Math.round(typingHistory.reduce((sum, entry) => sum + entry.wpm, 0) / typingHistory.length)
                        : 0}
                    </div>
                  </div>
                  <div className={cn("p-4 border", theme === "dark" ? "border-neutral-800" : "border-neutral-200")}>
                    <div className="text-muted-foreground text-sm">Streak</div>
                    <div className={cn("text-2xl font-medium", getThemeTextColor())}>
                      {streakDays} day{streakDays !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>

                <h3 className={cn("text-sm uppercase tracking-wider mb-2", getThemeTextColor())}>Recent Tests</h3>
                <div className={cn("border", theme === "dark" ? "border-neutral-800" : "border-neutral-200")}>
                  <div className="grid grid-cols-4 p-2 border-b text-muted-foreground text-xs uppercase tracking-wider">
                    <div>Date</div>
                    <div>WPM</div>
                    <div>Accuracy</div>
                    <div>Difficulty</div>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {typingHistory.length > 0 ? (
                      [...typingHistory]
                        .sort((a, b) => b.date.getTime() - a.date.getTime())
                        .slice(0, 10)
                        .map((entry, index) => (
                          <div
                            key={index}
                            className={cn(
                              "grid grid-cols-4 p-2",
                              index % 2 === 0 ? (theme === "dark" ? "bg-neutral-900/50" : "bg-neutral-100/50") : "",
                            )}
                          >
                            <div>{entry.date.toLocaleDateString()}</div>
                            <div>{entry.wpm}</div>
                            <div>{entry.accuracy}%</div>
                            <div className="capitalize">{entry.difficulty}</div>
                          </div>
                        ))
                    ) : (
                      <div className="p-4 text-center text-muted-foreground">No history yet</div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Achievements Panel */}
        <AnimatePresence>
          {showAchievements && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={cn("fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50")}
              onClick={() => setShowAchievements(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "w-full max-w-2xl p-6 rounded-lg shadow-lg",
                  theme === "dark"
                    ? "bg-black border border-neutral-800"
                    : theme === "light"
                      ? "bg-white border border-neutral-200"
                      : theme === "blue"
                        ? "bg-blue-50 border border-blue-200"
                        : theme === "red"
                          ? "bg-red-50 border border-red-200"
                          : theme === "yellow"
                            ? "bg-yellow-50 border border-yellow-200"
                            : theme === "green"
                              ? "bg-green-50 border border-green-200"
                              : theme === "purple"
                                ? "bg-purple-50 border border-purple-200"
                                : "bg-white border border-neutral-200",
                )}
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className={cn("text-xl font-medium", getThemeTextColor())}>Achievements</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowAchievements(false)}>
                    ✕
                  </Button>
                </div>

                <div className="space-y-4">
                  {achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className={cn(
                        "p-4 border",
                        achievement.unlocked
                          ? theme === "dark"
                            ? "border-blue-800 bg-blue-900/20"
                            : "border-blue-300 bg-blue-50"
                          : theme === "dark"
                            ? "border-neutral-800 opacity-60"
                            : "border-neutral-200 opacity-60",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "p-2 rounded-full",
                            achievement.unlocked
                              ? theme === "dark"
                                ? "bg-blue-800/50 text-blue-200"
                                : "bg-blue-100 text-blue-700"
                              : theme === "dark"
                                ? "bg-neutral-800 text-neutral-400"
                                : "bg-neutral-200 text-neutral-500",
                          )}
                        >
                          {achievement.icon}
                        </div>
                        <div>
                          <div
                            className={cn(
                              "font-medium",
                              achievement.unlocked ? getThemeTextColor() : "text-muted-foreground",
                            )}
                          >
                            {achievement.name}
                          </div>
                          <div className="text-sm text-muted-foreground">{achievement.description}</div>
                          {achievement.goal && achievement.progress !== undefined && (
                            <div className="mt-2 w-full bg-neutral-200 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full",
                                  achievement.unlocked
                                    ? theme === "dark"
                                      ? "bg-blue-500"
                                      : "bg-blue-600"
                                    : theme === "dark"
                                      ? "bg-neutral-600"
                                      : "bg-neutral-400",
                                )}
                                style={{ width: `${Math.min(100, (achievement.progress / achievement.goal) * 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Theme Selector */}
        <ThemeSelector
          theme={theme}
          setTheme={setTheme}
          themes={themes}
          showThemeSelector={showThemeSelector}
          toggleThemeSelector={toggleThemeSelector}
        />
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col items-center gap-3 py-8 px-4">
      {/* Top toolbar */}
      <div className="w-full max-w-3xl flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={toggleSettings}
                  variant="ghost"
                  size="sm"
                  className={cn("text-xs", getThemeTextColor())}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={toggleStats} variant="ghost" size="sm" className={cn("text-xs", getThemeTextColor())}>
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Statistics</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={toggleAchievements}
                  variant="ghost"
                  size="sm"
                  className={cn("text-xs", getThemeTextColor())}
                >
                  <Trophy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Achievements</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-2">
          <div className={cn("text-xs uppercase tracking-wider", getThemeTextColor())}>{difficulty}</div>
          {streakDays > 0 && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                theme === "dark" ? "bg-neutral-800 text-neutral-400" : "bg-neutral-200 text-neutral-600",
              )}
            >
              <Flame className="h-3 w-3" />
              <span>{streakDays}</span>
            </div>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="w-full max-w-3xl overflow-hidden mb-4"
          >
            <div className={cn("p-4 border", theme === "dark" ? "border-neutral-800" : "border-neutral-200")}>
              <h3 className={cn("text-sm uppercase tracking-wider mb-3", getThemeTextColor())}>Difficulty</h3>
              <div className="flex flex-wrap gap-2">
                {(["easy", "medium", "hard"] as Difficulty[]).map((level) => (
                  <Button
                    key={level}
                    onClick={() => changeDifficulty(level)}
                    variant={difficulty === level ? "default" : "outline"}
                    size="sm"
                    className="capitalize"
                  >
                    {level}
                  </Button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar */}
      <div className="w-full max-w-3xl h-1 bg-secondary mb-2 overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-300 ease-out",
            theme === "dark"
              ? "bg-neutral-600"
              : theme === "blue"
                ? "bg-blue-500"
                : theme === "red"
                  ? "bg-red-500"
                  : theme === "yellow"
                    ? "bg-yellow-500"
                    : theme === "green"
                      ? "bg-green-500"
                      : theme === "purple"
                        ? "bg-purple-500"
                        : "bg-neutral-600",
          )}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Interactive quote display - no background, no borders */}
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="w-full max-w-3xl max-h-80 overflow-y-auto focus:outline-none focus:ring-0"
      >
        <div ref={textContainerRef} className="relative text-lg md:text-xl leading-relaxed">
          {/* Cursor */}
          <span
            className={cn("absolute w-0.5 will-change-transform", getCursorColor(), isStarted ? "" : "animate-cursor")}
            style={{
              left: `${cursorStyle.left}px`,
              top: `${cursorStyle.top}px`,
              height: `${cursorStyle.height}px`,
              transition: "all 30ms cubic-bezier(0.25, 0.1, 0.25, 1.0)",
            }}
          />

          {/* Text */}
          {currentQuote.split("").map((char, index) => {
            let style = "opacity-40" // Default untyped style

            if (index < userInput.length) {
              // Typed characters
              if (userInput[index] === char) {
                style = "opacity-100" // Correct
              } else {
                style = cn(getErrorColor(), "opacity-100") // Incorrect
              }
            }

            return (
              <span key={index} data-char={index} className={style}>
                {char}
              </span>
            )
          })}
        </div>
      </div>

      {/* Live WPM counter */}
      <div className={cn("text-sm mt-4 flex items-center gap-1.5 h-5", getThemeTextColor())}>
        {isStarted && !isFinished ? (
          <>
            <span className="font-medium">{liveWpm}</span>
            <span className="uppercase text-xs tracking-wider">wpm</span>
          </>
        ) : (
          <span className="text-xs uppercase tracking-wider">{!isStarted ? "click and start typing" : ""}</span>
        )}
      </div>

      {/* Reset button - minimal style */}
      <Button
        onClick={resetGame}
        variant="ghost"
        size="sm"
        className={cn("mt-2 text-xs uppercase tracking-wider", getThemeTextColor())}
      >
        Reset
      </Button>

      {/* Theme Selector */}
      <ThemeSelector
        theme={theme}
        setTheme={setTheme}
        themes={themes}
        showThemeSelector={showThemeSelector}
        toggleThemeSelector={toggleThemeSelector}
      />
    </div>
  )
}

// Theme Selector Component
function ThemeSelector({
  theme,
  setTheme,
  themes,
  showThemeSelector,
  toggleThemeSelector,
}: {
  theme: string
  setTheme: (theme: string) => void
  themes: { name: string; label: string }[]
  showThemeSelector: boolean
  toggleThemeSelector: () => void
}) {
  return (
    <div className="fixed top-4 right-4 flex flex-col items-end">
      <div className="relative">
        <motion.button
          onClick={toggleThemeSelector}
          className={cn(
            "text-xs uppercase tracking-wider px-2 py-1",
            theme === "dark"
              ? "text-neutral-600"
              : theme === "light"
                ? "text-neutral-400"
                : theme === "blue"
                  ? "text-blue-400"
                  : theme === "red"
                    ? "text-red-400"
                    : theme === "yellow"
                      ? "text-yellow-500"
                      : theme === "green"
                        ? "text-green-400"
                        : theme === "purple"
                          ? "text-purple-400"
                          : "text-neutral-400",
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {showThemeSelector ? "close" : "theme"}
        </motion.button>

        <AnimatePresence>
          {showThemeSelector && (
            <motion.div
              initial={{ opacity: 0, x: 20, filter: "blur(8px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: 20, filter: "blur(8px)" }}
              transition={{ duration: 0.2 }}
              className={cn(
                "absolute right-0 mt-2 flex flex-col items-end gap-1 p-2 border",
                theme === "dark"
                  ? "bg-black border-neutral-800"
                  : theme === "light"
                    ? "bg-white border-neutral-200"
                    : theme === "blue"
                      ? "bg-blue-50 border-blue-200"
                      : theme === "red"
                        ? "bg-red-50 border-red-200"
                        : theme === "yellow"
                          ? "bg-yellow-50 border-yellow-200"
                          : theme === "green"
                            ? "bg-green-50 border-green-200"
                            : theme === "purple"
                              ? "bg-purple-50 border-purple-200"
                              : "bg-white border-neutral-200",
              )}
            >
              {themes.map((t, index) => (
                <motion.button
                  key={t.name}
                  onClick={() => setTheme(t.name)}
                  className={cn(
                    "text-xs uppercase tracking-wider px-2 py-1",
                    theme === t.name
                      ? t.name === "dark"
                        ? "text-white"
                        : t.name === "light"
                          ? "text-black"
                          : t.name === "blue"
                            ? "text-blue-600"
                            : t.name === "red"
                              ? "text-red-600"
                              : t.name === "yellow"
                                ? "text-yellow-600"
                                : t.name === "green"
                                  ? "text-green-600"
                                  : t.name === "purple"
                                    ? "text-purple-600"
                                    : "text-black"
                      : theme === "dark"
                        ? "text-neutral-500"
                        : theme === "light"
                          ? "text-neutral-400"
                          : theme === "blue"
                            ? "text-blue-300"
                            : theme === "red"
                              ? "text-red-300"
                              : theme === "yellow"
                                ? "text-yellow-400"
                                : theme === "green"
                                  ? "text-green-300"
                                  : theme === "purple"
                                    ? "text-purple-300"
                                    : "text-neutral-400",
                  )}
                  initial={{ opacity: 0, x: 20, filter: "blur(4px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: 20, filter: "blur(4px)" }}
                  transition={{
                    duration: 0.2,
                    delay: index * 0.05, // Stagger effect
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {t.label}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

