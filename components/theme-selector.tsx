"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import { X } from "lucide-react"

interface ThemeSelectorProps {
  className?: string
}

export default function ThemeSelector({ className }: ThemeSelectorProps) {
  const [mounted, setMounted] = useState(false)
  const [showThemeSelector, setShowThemeSelector] = useState(false)
  const { theme, setTheme } = useTheme()

  const themes = [
    { name: "dark", label: "DARK" },
    { name: "light", label: "LIGHT" },
    { name: "blue", label: "BLUE" },
    { name: "red", label: "RED" },
    { name: "yellow", label: "YELLOW" },
    { name: "green", label: "GREEN" },
    { name: "purple", label: "PURPLE" },
  ]

  // Handle mounted state to avoid hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  // Toggle theme selector
  const toggleThemeSelector = () => {
    setShowThemeSelector(!showThemeSelector)
  }

  if (!mounted) return null

  return (
    <div className={cn("fixed top-4 right-4 flex flex-col items-end z-50", className)}>
      <div className="relative">
        <motion.button
          onClick={toggleThemeSelector}
          className="text-xs uppercase tracking-wider px-3 py-1.5 text-neutral-400 hover:text-neutral-200 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {showThemeSelector ? "close" : "theme"}
        </motion.button>

        <AnimatePresence>
          {showThemeSelector && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-1 w-36 bg-black border border-neutral-800 shadow-xl"
            >
              <div className="flex justify-between items-center px-4 py-2 border-b border-neutral-800">
                <span className="text-xs uppercase text-neutral-400">CLOSE</span>
                <button onClick={toggleThemeSelector} className="text-neutral-400 hover:text-neutral-200">
                  <X size={14} />
                </button>
              </div>
              <div className="py-1">
                {themes.map((t) => (
                  <motion.button
                    key={t.name}
                    onClick={() => setTheme(t.name)}
                    className={cn(
                      "w-full text-left px-4 py-2 text-xs uppercase tracking-wider transition-colors",
                      theme === t.name ? "text-white font-medium" : "text-neutral-500 hover:text-neutral-300",
                    )}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {t.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

